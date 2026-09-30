"""Plan building, editing, validation and release. The allocation package makes the decisions;
this module stores them and keeps the dispatcher, loader, driver and store views consistent."""
from collections import defaultdict
from datetime import date, timedelta

from allocation import Plan as APlan
from allocation import Trip as ATrip
from allocation import allocate, schedule_vehicle, sequence_stops, trip_km, trip_minutes, validate
from allocation.trip_time import BUDGET_MIN, budget_group
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Deferral,
    FuelLedger,
    LoadLine,
    Order,
    Plan,
    Stop,
    Trip,
    Vehicle,
    VehicleStatus,
)
from app.services.common import (
    REASON_LABEL,
    load_groups,
    next_operating_day,
    notify,
    now,
    reason_for_store,
    std_from_db,
    to_aorder,
    to_avehicle,
    vehicle_kind,
)

QUEUE_STATUSES = ("placed", "confirmed", "planned")


class PlanError(Exception):
    """A dispatcher action the plan cannot accept (shown to the user as-is)."""


def week_start(d: date) -> date:
    return d - timedelta(days=d.weekday())


def depot_vehicles(db: Session, depot: str) -> list[Vehicle]:
    return list(db.scalars(select(Vehicle).where(Vehicle.depot == depot).order_by(Vehicle.vehicle_id)))


def workshop_ids(db: Session, d: date) -> dict[str, str | None]:
    rows = db.scalars(select(VehicleStatus).where(VehicleStatus.date == d, VehicleStatus.status == "workshop"))
    return {r.vehicle_id: r.note for r in rows}


def fuel_used_before(db: Session, d: date) -> dict[str, float]:
    rows = db.scalars(select(FuelLedger).where(FuelLedger.week_start == week_start(d)))
    return {r.vehicle_id: r.litres_used for r in rows}


def get_plan(db: Session, depot: str, d: date) -> Plan | None:
    """The released plan if there is one, otherwise the draft."""
    plans = list(db.scalars(select(Plan).where(Plan.depot == depot, Plan.service_date == d).order_by(Plan.id.desc())))
    released = [p for p in plans if p.status == "released"]
    return (released or plans or [None])[0]


def queue_orders(db: Session, depot: str, d: date) -> list[Order]:
    return list(
        db.scalars(
            select(Order)
            .where(Order.depot == depot, Order.service_date == d, Order.status.in_(QUEUE_STATUSES))
            .order_by(Order.id)
        )
    )


# --- building ---------------------------------------------------------------------------------------------------


def _active_stops(trip: Trip) -> list[Stop]:
    return [s for s in trip.stops if not s.removed]


def _restore_deferrals(db: Session, plan: Plan) -> None:
    for d in db.scalars(select(Deferral).where(Deferral.plan_id == plan.id)):
        o = db.get(Order, d.order_id)
        if o is not None and d.active:
            o.status = "confirmed"
            o.service_date = plan.service_date
            o.deferred_yesterday = d.skipped_before
            o.days_since_last_served = max(0, o.days_since_last_served - 1)
            o.deferral_reason = o.deferral_note = o.deferred_to = None
        db.delete(d)


def build_plan(db: Session, depot: str, d: date, user_name: str) -> Plan:
    existing = get_plan(db, depot, d)
    if existing is not None and existing.status == "released":
        raise PlanError("This day's plan is already released. Edit it from the plan board.")
    if existing is not None:
        _restore_deferrals(db, existing)
        for o in db.scalars(select(Order).where(Order.depot == depot, Order.service_date == d, Order.status == "planned")):
            o.status = "confirmed"
        db.delete(existing)
        db.flush()

    orders = queue_orders(db, depot, d)
    std = std_from_db(db)
    down = workshop_ids(db, d)
    vehicles = [v for v in depot_vehicles(db, depot) if v.vehicle_id not in down]
    used = fuel_used_before(db, d)
    fuel_left = {v.vehicle_id: v.weekly_fuel_quota_l - used.get(v.vehicle_id, 0.0) for v in vehicles}
    result = allocate([to_aorder(o) for o in orders], [to_avehicle(v) for v in vehicles], std, fuel_left)

    plan = Plan(depot=depot, service_date=d, status="draft", created_by=user_name)
    db.add(plan)
    by_id = {o.id: o for o in orders}
    for at in result.trips:
        trip = Trip(vehicle_id=at.vehicle_id, trip_no=at.trip_id, brand=at.brand, district=at.district)
        plan.trips.append(trip)
        for i, ao in enumerate(at.orders, start=1):
            o = by_id[ao.order_ref]
            trip.stops.append(_new_stop(o, i))
            o.status = "planned"
    db.flush()
    for df in result.deferred:
        apply_deferral(db, plan, by_id[df.order.order_ref], df.reason.value, df.note, "engine", user_name)
    recompute_etas(db, plan)
    db.flush()
    return plan


def _new_stop(o: Order, seq: int) -> Stop:
    return Stop(
        seq=seq,
        order_id=o.id,
        outlet_id=o.outlet_id,
        window_open=o.outlet.window_open_time,
        window_close=o.outlet.window_close_time,
    )


def apply_deferral(
    db: Session, plan: Plan, o: Order, reason: str, note: str | None, source: str, by: str | None
) -> Deferral:
    to = next_operating_day(db, plan.service_date)
    df = Deferral(
        plan_id=plan.id,
        order_id=o.id,
        reason=reason,
        note=note,
        deferred_to=to,
        skipped_before=o.deferred_yesterday,
        source=source,
        created_by=by,
    )
    db.add(df)
    o.status = "deferred"
    o.deferral_reason = reason
    o.deferral_note = note
    o.deferred_to = to
    o.service_date = to
    o.deferred_yesterday = True
    o.days_since_last_served += 1
    if plan.status == "released":
        notify_deferral(db, df, o)
    return df


def notify_deferral(db: Session, df: Deferral, o: Order) -> None:
    kind = "chilled " if o.temp_requirement == "chilled" else ""
    notify(
        db,
        role="store",
        outlet_id=o.outlet_id,
        kind="deferral",
        title=f"Your {kind}order was deferred",
        body=f"Moved to {df.deferred_to:%a %d %b}, before 08:00. Tap to see why.",
        meta={
            "order_id": o.id,
            "reason": df.reason,
            "reason_text": reason_for_store(df.reason, o.district, df.note),
            "deferred_to": df.deferred_to.isoformat(),
            "second_skip": df.skipped_before,
        },
    )


def recompute_etas(db: Session, plan: Plan, only_vehicles: set[str] | None = None) -> None:
    std = std_from_db(db)
    by_vehicle: dict[str, list[Trip]] = defaultdict(list)
    for t in plan.trips:
        if only_vehicles is None or t.vehicle_id in only_vehicles:
            by_vehicle[t.vehicle_id].append(t)
    for trips in by_vehicle.values():
        atrips = []
        for t in trips:
            stops = _active_stops(t)
            if not stops:
                continue
            ordered = sequence_stops([to_aorder(s.order) for s in stops])
            seqmap = {ao.order_ref: i for i, ao in enumerate(ordered, start=1)}
            for s in stops:
                s.seq = seqmap[s.order_id]
            atrips.append(ATrip(t.vehicle_id, t.trip_no, ordered))
        sched = schedule_vehicle(atrips, std)
        for t in trips:
            if t.trip_no not in sched:
                continue
            depart, etas = sched[t.trip_no]
            t.depart_planned = _hhmm(depart)
            eta_by_order = {e.order.order_ref: e.arrive_min for e in etas}
            for s in _active_stops(t):
                s.eta = _hhmm(eta_by_order[s.order_id])


def _hhmm(m: float) -> str:
    m = int(round(m)) % (24 * 60)
    return f"{m // 60:02d}:{m % 60:02d}"


# --- editing ----------------------------------------------------------------------------------------------------


def _find_active_stop(plan: Plan, order_id: str) -> Stop | None:
    for t in plan.trips:
        for s in _active_stops(t):
            if s.order_id == order_id:
                return s
    return None


def _detach(db: Session, plan: Plan, o: Order) -> Trip | None:
    """Take an order off its trip. Draft plans forget it; released plans keep a removed stop as history."""
    s = _find_active_stop(plan, o.id)
    if s is None:
        return None
    trip = s.trip
    if plan.status == "draft":
        trip.stops.remove(s)
        db.flush()
    else:
        s.removed = True
    return trip


def move_order(db: Session, plan: Plan, order_id: str, vehicle_id: str, trip_no: int | None) -> None:
    o = db.get(Order, order_id)
    v = db.get(Vehicle, vehicle_id)
    if o is None or v is None:
        raise PlanError("Unknown order or vehicle")
    if v.depot != plan.depot:
        raise PlanError(f"{vehicle_id} belongs to {v.depot}, not {plan.depot}")
    if plan.status == "released" and _trip_frozen(plan, vehicle_id):
        raise PlanError(f"{vehicle_id} has already left; it cannot take more stops")
    before = _snapshot(plan)
    old_trip = _detach(db, plan, o)
    if o.status == "deferred":
        prev = db.scalars(select(Deferral).where(Deferral.order_id == o.id, Deferral.active.is_(True))).all()
        for df in prev:
            df.active = False
            o.service_date = plan.service_date
            o.deferred_yesterday = df.skipped_before
            o.days_since_last_served = max(0, o.days_since_last_served - 1)
        o.deferral_reason = o.deferral_note = o.deferred_to = None
    trips = [t for t in plan.trips if t.vehicle_id == vehicle_id]
    target = None
    if trip_no is not None:
        target = next((t for t in trips if t.trip_no == trip_no), None)
    else:
        target = next((t for t in trips if (t.brand, t.district) == (o.brand, o.district) and _active_stops(t)), None)
        if target is None:
            target = next((t for t in trips if not _active_stops(t)), None)
    if target is None:
        free = [n for n in (1, 2, 3) if n not in {t.trip_no for t in trips}]
        target = Trip(vehicle_id=vehicle_id, trip_no=trip_no or free[0], brand=o.brand, district=o.district)
        plan.trips.append(target)
    if not _active_stops(target):
        target.brand, target.district = o.brand, o.district
    target.stops.append(_new_stop(o, len(target.stops) + 1))
    o.status = "planned"
    db.flush()
    touched = {vehicle_id} | ({old_trip.vehicle_id} if old_trip else set())
    _after_edit(db, plan, touched, before, f"{o.outlet.name or o.outlet_id} moved to {vehicle_id}")


def defer_order(db: Session, plan: Plan, order_id: str, reason: str, note: str | None, by: str) -> Deferral:
    o = db.get(Order, order_id)
    if o is None:
        raise PlanError("Unknown order")
    if reason not in REASON_LABEL:
        raise PlanError("Pick a reason from the list")
    before = _snapshot(plan)
    old_trip = _detach(db, plan, o)
    for df in db.scalars(select(Deferral).where(Deferral.order_id == o.id, Deferral.active.is_(True))):
        df.active = False
    db.flush()
    df = apply_deferral(db, plan, o, reason, note, "dispatcher", by)
    db.flush()
    if old_trip is not None:
        _after_edit(db, plan, {old_trip.vehicle_id}, before, f"{o.outlet.name or o.outlet_id} deferred to {df.deferred_to:%a}")
    return df


def _trip_frozen(plan: Plan, vehicle_id: str) -> bool:
    return any(t.vehicle_id == vehicle_id and t.status in ("out", "completed") for t in plan.trips)


def _snapshot(plan: Plan) -> dict[int, dict]:
    return {
        t.id: {(s.id, g["group"]): g["packs"] for s in _active_stops(t) for g in load_groups(s.order)}
        for t in plan.trips
        if t.id is not None
    }


def _after_edit(db: Session, plan: Plan, vehicles: set[str], before: dict, what: str) -> None:
    db.flush()
    db.expire(plan, ["trips"])
    for t in list(plan.trips):
        if plan.status == "draft" and not t.stops:
            plan.trips.remove(t)
            db.delete(t)
    db.flush()
    recompute_etas(db, plan, vehicles)
    if plan.status == "released":
        plan.version += 1
        for t in plan.trips:
            if t.vehicle_id in vehicles:
                sync_load_lines(db, t, announce=what)


# --- release and load lines -------------------------------------------------------------------------------------


def sync_load_lines(db: Session, trip: Trip, announce: str | None = None) -> None:
    """Make the trip's load lines match its stops. With `announce`, record and announce what changed."""
    if trip.id is None:
        db.flush()
    existing = {(ln.stop_id, ln.group): ln for ln in trip.lines}
    desired: dict[tuple[int, str], dict] = {}
    for s in _active_stops(trip):
        for g in load_groups(s.order):
            desired[(s.id, g["group"])] = g
    add, remove = [], []
    names = {s.id: (s.outlet.name or s.outlet_id) for s in trip.stops}
    for key, g in desired.items():
        ln = existing.get(key)
        if ln is None:
            db.add(
                LoadLine(trip_id=trip.id, stop_id=key[0], group=g["group"], unit=g["unit"], temp=g["temp"], planned=g["packs"])
            )
            add.append({"stop": names[key[0]], "group": g["group"], "qty": g["packs"], "unit": g["unit"], "temp": g["temp"]})
        elif ln.planned != g["packs"]:
            ln.planned = g["packs"]
    for key, ln in existing.items():
        if key not in desired:
            remove.append(
                {
                    "stop": names.get(key[0], "?"),
                    "group": ln.group,
                    "qty": ln.planned,
                    "unit": ln.unit,
                    "temp": ln.temp,
                    "was_loaded": ln.loaded,
                }
            )
            trip.lines.remove(ln)
            db.delete(ln)
    if announce and (add or remove):
        trip.change = {"at": now().isoformat(), "note": announce, "add": add, "remove": remove, "acked": False}
        notify(
            db,
            role="loader",
            depot=trip.plan.depot,
            kind="plan_changed",
            title=f"{trip.vehicle_id}'s list changed",
            body=announce,
            meta={"trip_id": trip.id},
        )
        for u in _drivers_for(db, trip.vehicle_id):
            notify(
                db,
                role="driver",
                user_id=u.id,
                kind="plan_changed",
                title="Plan changed",
                body=f"From Ruwan, dispatcher: {announce}. Check your stops.",
                meta={"trip_id": trip.id},
            )
    db.flush()


def _drivers_for(db: Session, vehicle_id: str):
    from app.models import User

    return list(db.scalars(select(User).where(User.role == "driver", User.vehicle_id == vehicle_id)))


def release_plan(db: Session, plan: Plan, by: str) -> None:
    board = evaluate(db, plan)
    if board["summary"]["blocking"]:
        raise PlanError(f"{board['summary']['blocking']} warning(s) still block release. Fix or defer first.")
    plan.status = "released"
    plan.released_at = now()
    plan.version += 1
    for t in plan.trips:
        if not _active_stops(t):
            continue
        sync_load_lines(db, t)
    for df in db.scalars(select(Deferral).where(Deferral.plan_id == plan.id, Deferral.active.is_(True))):
        notify_deferral(db, df, db.get(Order, df.order_id))
    notify(
        db,
        role="loader",
        depot=plan.depot,
        kind="plan_released",
        title=f"Plan released for {plan.service_date:%a %d %b}",
        body="Load lists are on the dock tablet.",
    )
    for t in plan.trips:
        if _active_stops(t):
            for u in _drivers_for(db, t.vehicle_id):
                notify(db, role="driver", user_id=u.id, kind="plan_released", title="Your run is ready", meta={"trip_id": t.id})
    db.flush()


# --- evaluation for the plan board ------------------------------------------------------------------------------


def _alloc_plan(plan: Plan) -> APlan:
    trips = []
    for t in plan.trips:
        stops = _active_stops(t)
        if stops:
            trips.append(ATrip(t.vehicle_id, t.trip_no, [to_aorder(s.order) for s in stops]))
    return APlan(trips=trips)


def evaluate(db: Session, plan: Plan) -> dict:
    std = std_from_db(db)
    vehicles = depot_vehicles(db, plan.depot)
    down = workshop_ids(db, plan.service_date)
    avs = {v.vehicle_id: to_avehicle(v) for v in vehicles}
    aplan = _alloc_plan(plan)
    violations = validate(aplan, avs, std)
    used = fuel_used_before(db, plan.service_date)

    trips_by_vehicle: dict[str, list[Trip]] = defaultdict(list)
    for t in sorted(plan.trips, key=lambda t: t.trip_no):
        if _active_stops(t):
            trips_by_vehicle[t.vehicle_id].append(t)
    atrip_by_key = {(t.vehicle_id, t.trip_id): t for t in aplan.trips}

    rows = []
    blocking = caution = 0
    for v in vehicles:
        trips = trips_by_vehicle.get(v.vehicle_id, [])
        warnings: list[dict] = []
        tj = []
        litres = 0.0
        vol_pct = kg_pct = 0.0
        vol_max = kg_max = 0.0
        for t in trips:
            at = atrip_by_key[(t.vehicle_id, t.trip_no)]
            m3 = sum(o.volume_m3 for o in at.orders)
            kg = sum(o.weight_kg for o in at.orders)
            litres += trip_km(at.orders, std) / v.km_per_l if v.km_per_l else 0
            if m3 / v.volume_cap_m3 >= vol_pct:
                vol_pct, vol_max = m3 / v.volume_cap_m3, m3
            if kg / v.weight_cap_kg >= kg_pct:
                kg_pct, kg_max = kg / v.weight_cap_kg, kg
            if m3 > v.volume_cap_m3:
                warnings.append(_w("capacity_volume", "red", f"Over volume by {m3 - v.volume_cap_m3:.1f} m³", t))
            if kg > v.weight_cap_kg:
                warnings.append(_w("capacity_weight", "red", f"Over weight by {kg - v.weight_cap_kg:,.0f} kg", t))
            tj.append(
                {
                    "trip_id": t.id,
                    "trip_no": t.trip_no,
                    "brand": t.brand,
                    "district": t.district,
                    "stops": len(at.orders),
                    "chilled": any(o.temp_requirement == "chilled" for o in at.orders),
                    "volume_m3": round(m3, 2),
                    "weight_kg": round(kg, 1),
                    "minutes": round(trip_minutes(at.orders, std)),
                    "depart": t.depart_planned,
                    "status": t.status,
                    "stop_names": [s.outlet.name or s.outlet_id for s in _active_stops(t)],
                }
            )
        for vio in violations:
            if vio.vehicle_id != v.vehicle_id or vio.rule in ("capacity_volume", "capacity_weight"):
                continue
            warnings.append(_w(vio.rule, "red", _RULE_TEXT.get(vio.rule, vio.message), None))
        if trips and v.vehicle_id in down:
            warnings.append(_w("workshop", "red", f"In the workshop ({down[v.vehicle_id] or 'unavailable'})", None))
        quota = v.weekly_fuel_quota_l
        used_pct = (used.get(v.vehicle_id, 0.0) + litres) / quota if quota else 0
        if used_pct > 1:
            warnings.append(_w("fuel_quota", "red", "Over the weekly fuel quota", None))
        elif used_pct >= 0.85:
            warnings.append(_w("fuel_quota", "amber", f"{used_pct:.0%} of weekly fuel quota used", None))
        if len(trips) >= 2 and not any(w["rule"] == "max_trips" for w in warnings):
            warnings.append(_w("trip_limit", "amber", "At 2-trip daily limit", None))
        for grp in ("Fresh", "Style+Tech"):
            mins = sum(
                trip_minutes(atrip_by_key[(t.vehicle_id, t.trip_no)].orders, std)
                for t in trips
                if budget_group(t.brand) == grp
            )
            if mins and mins > 0.9 * BUDGET_MIN[grp] and not any(w["rule"] == "time_budget" for w in warnings):
                warnings.append(_w("time_near", "amber", f"{mins:.0f} of {BUDGET_MIN[grp]} min driving budget used", None))
        blocking += sum(1 for w in warnings if w["severity"] == "red")
        caution += sum(1 for w in warnings if w["severity"] == "amber")
        rows.append(
            {
                "vehicle_id": v.vehicle_id,
                "kind": vehicle_kind(v),
                "type": v.type,
                "temp": v.temp,
                "weight_cap_kg": v.weight_cap_kg,
                "volume_cap_m3": v.volume_cap_m3,
                "available": v.vehicle_id not in down,
                "workshop_note": down.get(v.vehicle_id),
                "trips": tj,
                "volume_pct": round(vol_pct * 100),
                "weight_pct": round(kg_pct * 100),
                "volume_m3": round(vol_max, 2),
                "weight_kg": round(kg_max),
                "fuel_left_pct": max(0, round((1 - used_pct) * 100)),
                "fuel_quota_l": quota,
                "warnings": warnings,
            }
        )
    rows.sort(key=lambda r: (not r["trips"], not r["available"], r["vehicle_id"]))
    deferred = _deferred_rows(db, plan)
    assigned = sum(1 for r in rows if r["trips"])
    served = sum(len(_active_stops(t)) for t in plan.trips)
    return {
        "plan": {
            "id": plan.id,
            "depot": plan.depot,
            "service_date": plan.service_date.isoformat(),
            "status": plan.status,
            "version": plan.version,
        },
        "summary": {
            "vehicles_total": len(vehicles),
            "vehicles_available": sum(1 for r in rows if r["available"]),
            "vehicles_assigned": assigned,
            "unassigned": sum(1 for r in rows if r["available"] and not r["trips"]),
            "blocking": blocking,
            "caution": caution,
            "orders_served": served,
            "orders_deferred": len(deferred),
        },
        "vehicles": rows,
        "deferred": deferred,
    }


_RULE_TEXT = {
    "refrigeration": "Chilled load needs a reefer",
    "vehicle_access": "Van-only outlet needs a van",
    "brand_district": "Trip mixes brands or districts",
    "home_depot": "Outlet belongs to the other depot",
    "max_trips": "Over the 2-trip daily limit",
    "time_budget": "Over the daily driving-time budget",
    "whole_orders": "Order assigned twice",
    "unknown_vehicle": "Vehicle not available",
}


def _w(rule: str, severity: str, text: str, trip: Trip | None) -> dict:
    return {"rule": rule, "severity": severity, "text": text, "trip_no": trip.trip_no if trip else None}


def _deferred_rows(db: Session, plan: Plan) -> list[dict]:
    out = []
    for df in db.scalars(
        select(Deferral).where(Deferral.plan_id == plan.id, Deferral.active.is_(True)).order_by(Deferral.id)
    ):
        o = db.get(Order, df.order_id)
        out.append(
            {
                "order_id": o.id,
                "outlet": o.outlet.name or o.outlet_id,
                "outlet_id": o.outlet_id,
                "brand": o.brand,
                "temp": o.temp_requirement,
                "weight_kg": o.weight_kg,
                "volume_m3": o.volume_m3,
                "district": o.district,
                "reason": df.reason,
                "reason_label": REASON_LABEL[df.reason],
                "note": df.note,
                "source": df.source,
                "deferred_to": df.deferred_to.isoformat() if df.deferred_to else None,
                "second_skip": df.skipped_before,
            }
        )
    return out
