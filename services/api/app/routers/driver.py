from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import require
from app.models import (
    Conflict,
    DeliveryEvent,
    FuelLedger,
    LoadLine,
    Notification,
    Plan,
    Receipt,
    Stop,
    Trip,
    User,
    Vehicle,
)
from app.services.common import LK, late_risk_pct, lk_hhmm, notify, now, std_from_db, vehicle_kind
from app.services.planning import week_start

router = APIRouter(tags=["driver"])
Driver = Depends(require("driver"))

DOCK_LABEL = {"rear_dock": "Rear dock", "street": "Street drop", "mall_bay": "Mall bay"}


class EventIn(BaseModel):
    client_uuid: str = Field(min_length=8, max_length=40)
    kind: str
    trip_id: int
    stop_id: int | None = None
    device_ts: datetime
    payload: dict = Field(default_factory=dict)


class SyncBody(BaseModel):
    events: list[EventIn] = Field(default_factory=list)


def _active(t: Trip) -> list[Stop]:
    return [s for s in t.stops if not s.removed]


def _expected(db: Session, stop: Stop) -> dict[str, LoadLine]:
    return {ln.group: ln for ln in db.scalars(select(LoadLine).where(LoadLine.stop_id == stop.id))}


def _stop_json(db: Session, s: Stop) -> dict:
    lines = _expected(db, s)
    return {
        "id": s.id,
        "seq": s.seq,
        "name": s.outlet.name or s.outlet_id,
        "outlet_id": s.outlet_id,
        "district": s.outlet.district,
        "eta": s.eta,
        "window_open": s.window_open,
        "window_close": s.window_close,
        "access": DOCK_LABEL.get(s.outlet.dock_type, s.outlet.dock_type),
        "mall_window": s.outlet.mall_window,
        "status": s.status,
        "removed": s.removed,
        "late_risk": late_risk_pct(s.eta, s.window_close) if s.status in ("pending", "arrived") else 0,
        "items": [
            {
                "group": ln.group,
                "unit": ln.unit,
                "temp": ln.temp,
                "planned": ln.planned,
                "expected": ln.found if ln.found is not None else ln.planned,
                "flag": ln.flag_reason,
            }
            for ln in sorted(lines.values(), key=lambda x: (x.temp != "chilled", x.group))
        ],
        "delivery": s.delivery,
        "arrived_at": lk_hhmm(s.arrived_at),
        "done_at": lk_hhmm(s.done_at),
    }


def _fuel(db: Session, v: Vehicle, plan: Plan) -> dict:
    from allocation import trip_km

    from app.services.planning import _alloc_plan

    std = std_from_db(db)
    litres = sum(trip_km(t.orders, std) / v.km_per_l for t in _alloc_plan(plan).trips if t.vehicle_id == v.vehicle_id)
    led = db.get(FuelLedger, (v.vehicle_id, week_start(plan.service_date)))
    used = (led.litres_used if led else 0.0) + litres
    return {"quota_l": v.weekly_fuel_quota_l, "left_l": max(0, round(v.weekly_fuel_quota_l - used)), "used_pct": round(100 * used / v.weekly_fuel_quota_l)}


def snapshot(db: Session, user: User) -> dict:
    plan = db.scalar(
        select(Plan).where(Plan.depot == user.depot, Plan.status == "released").order_by(Plan.service_date.desc(), Plan.id.desc())
    )
    v = db.get(Vehicle, user.vehicle_id)
    dispatcher = db.scalar(select(User).where(User.role == "dispatcher"))
    notices = db.scalars(
        select(Notification).where(Notification.role == "driver", Notification.user_id == user.id).order_by(Notification.id.desc()).limit(15)
    )
    out = {
        "server_time": now().isoformat(),
        "driver": {"id": user.id, "name": user.name, "code": user.driver_code},
        "vehicle": {"id": v.vehicle_id, "kind": vehicle_kind(v), "temp": v.temp} if v else None,
        "dispatcher": {"name": dispatcher.name.split()[0], "phone": dispatcher.phone} if dispatcher else None,
        "date": plan.service_date.isoformat() if plan else None,
        "depot": user.depot,
        "trips": [],
        "fuel": None,
        "notices": [
            {"id": n.id, "kind": n.kind, "title": n.title, "body": n.body, "at": lk_hhmm(n.created_at), "read": n.read_at is not None, "meta": n.meta}
            for n in notices
        ],
        "conflicts": [],
    }
    if plan is None:
        return out
    out["fuel"] = _fuel(db, v, plan)
    trips = sorted((t for t in plan.trips if t.vehicle_id == user.vehicle_id and _active(t)), key=lambda t: t.trip_no)
    for t in trips:
        lines = list(t.lines)
        out["trips"].append(
            {
                "trip_id": t.id,
                "trip_no": t.trip_no,
                "brand": t.brand,
                "district": t.district,
                "status": t.status,
                "depart": t.depart_planned,
                "plan_version": plan.version,
                "checks": {
                    "load_released": t.status in ("released", "out", "completed"),
                    "released_by": t.released_by,
                    "released_at": lk_hhmm(t.released_at),
                    "dock": next((u.dock for u in db.scalars(select(User).where(User.role == "loader", User.name == t.released_by))), None),
                    "reefer_temp": t.reefer_temp,
                    "seal_no": t.seal_no,
                    "chilled": any(ln.temp == "chilled" for ln in lines),
                },
                "stops": [_stop_json(db, s) for s in sorted(t.stops, key=lambda s: (s.removed, s.seq))],
            }
        )
    for c in db.scalars(select(Conflict).where(Conflict.status == "open", Conflict.kind == "count")):
        s = db.get(Stop, c.stop_id)
        if s.trip.vehicle_id == user.vehicle_id and s.trip.plan_id == plan.id:
            out["conflicts"].append(
                {"id": c.id, "stop_id": s.id, "stop": s.outlet.name, "line": c.line, "driver_count": c.driver_count, "store_count": c.store_count, "stance": c.driver_stance}
            )
    return out


def _heartbeat(db: Session, user: User) -> None:
    for t in db.scalars(select(Trip).join(Plan).where(Trip.vehicle_id == user.vehicle_id, Plan.depot == user.depot, Trip.status.in_(("released", "out")))):
        t.last_seen_at = now()


@router.get("/driver/run")
def run(user: User = Driver, db: Session = Depends(get_db)) -> dict:
    _heartbeat(db, user)
    db.commit()
    return snapshot(db, user)


@router.post("/sync")
def sync(body: SyncBody, user: User = Driver, db: Session = Depends(get_db)) -> dict:
    """Idempotent upload of the phone's outbox, oldest device timestamp first."""
    results = []
    for ev in sorted(body.events, key=lambda e: e.device_ts):
        results.append(_apply(db, user, ev))
    _heartbeat(db, user)
    db.commit()
    return {"results": results, "run": snapshot(db, user)}


def _apply(db: Session, user: User, ev: EventIn) -> dict:
    res = {"client_uuid": ev.client_uuid, "status": "applied", "message": ""}
    if db.scalar(select(DeliveryEvent).where(DeliveryEvent.client_uuid == ev.client_uuid)):
        return {**res, "status": "duplicate"}
    trip = db.get(Trip, ev.trip_id)
    if trip is None or trip.vehicle_id != user.vehicle_id:
        return {**res, "status": "rejected", "message": "This trip is not yours"}
    dts = ev.device_ts if ev.device_ts.tzinfo else ev.device_ts.replace(tzinfo=LK)
    srv = now()
    late = max(0, int((srv - dts).total_seconds()))
    stop = db.get(Stop, ev.stop_id) if ev.stop_id else None
    if stop is not None and stop.trip_id != trip.id:
        return {**res, "status": "rejected", "message": "Stop is not on this trip"}
    db.add(DeliveryEvent(client_uuid=ev.client_uuid, trip_id=trip.id, stop_id=stop.id if stop else None, driver_id=user.id,
                         kind=ev.kind, payload=ev.payload, device_ts=dts, server_ts=srv, late_by_s=late))

    if ev.kind == "trip_start":
        if trip.status == "released":
            trip.status, trip.driver_started_at = "out", dts
            for s in _active(trip):
                if s.order.status in ("loaded", "shortfall"):
                    s.order.status = "out_for_delivery"
        return res

    if ev.kind in ("arrive", "deliver"):
        if stop is None:
            return {**res, "status": "rejected", "message": "Missing stop"}
        if stop.removed:
            c = Conflict(stop_id=stop.id, kind="reassigned")
            db.add(c)
            db.flush()
            notify(db, role="dispatcher", depot=user.depot, kind="reassigned_conflict",
                   title=f"{stop.outlet.name}: recorded after the plan moved it", body=f"{user.name.split()[0]} was offline. Check the record.",
                   meta={"conflict_id": c.id})
            return {**res, "status": "conflict", "message": "Dispatch moved this stop while you were offline. Ruwan will check it."}
        if ev.kind == "arrive":
            if stop.status == "pending":
                stop.status, stop.arrived_at = "arrived", dts
            return res
        return _deliver(db, user, trip, stop, ev, dts, res)

    if ev.kind == "conflict_answer":
        c = db.get(Conflict, int(ev.payload.get("conflict_id", 0)))
        if c is not None and ev.payload.get("stance") in ("accept", "dispute"):
            c.driver_stance = ev.payload["stance"]
            if ev.payload["stance"] == "accept":
                c.status, c.resolution = "resolved", "accept_store"
            else:
                notify(db, role="dispatcher", depot=user.depot, kind="dispute", title=f"{user.name.split()[0]} disputes the {c.line} count",
                       body=f"Driver {c.driver_count}, store {c.store_count}", meta={"conflict_id": c.id})
        return res

    if ev.kind == "notice_read":
        n = db.get(Notification, int(ev.payload.get("notification_id", 0)))
        if n is not None and n.user_id == user.id and n.read_at is None:
            n.read_at = dts
            notify(db, role="dispatcher", depot=user.depot, kind="notice_read", title=f"{user.name.split()[0]} read the plan change", meta={"trip_id": trip.id})
        return res

    return {**res, "status": "rejected", "message": f"Unknown event {ev.kind}"}


def _deliver(db: Session, user: User, trip: Trip, stop: Stop, ev: EventIn, dts: datetime, res: dict) -> dict:
    if stop.done_at is not None and dts < stop.done_at:
        return {**res, "message": "A later record for this stop already exists"}
    exp = _expected(db, stop)
    items = []
    for it in ev.payload.get("items", []):
        ln = exp.get(it.get("group"))
        if ln is None:
            continue
        expected = ln.found if ln.found is not None else ln.planned
        items.append({"group": ln.group, "unit": ln.unit, "planned": expected, "handed": max(0, int(it.get("handed", 0)))})
    outcome = ev.payload.get("outcome", "delivered")
    if outcome != "failed":
        outcome = "partial" if any(i["handed"] < i["planned"] for i in items) else "delivered"
    else:
        items = [{**i, "handed": 0} for i in items]
    stop.status, stop.done_at, stop.synced_at = outcome, dts, now()
    stop.delivery = {
        "outcome": outcome,
        "items": items,
        "note": ev.payload.get("note"),
        "reason": ev.payload.get("reason"),
        "signed_by": ev.payload.get("signed_by"),
        "photo": ev.payload.get("photo"),
        "signature": ev.payload.get("signature"),
    }
    stop.order.status = outcome
    # The store may already have confirmed a different count while the phone was offline.
    receipt = db.scalar(select(Receipt).where(Receipt.stop_id == stop.id))
    if receipt and receipt.status == "confirmed":
        got = {ln["group"]: ln["received"] for ln in receipt.lines}
        for it in items:
            if it["group"] in got and got[it["group"]] != it["handed"]:
                c = Conflict(stop_id=stop.id, kind="count", line=it["group"], driver_count=it["handed"], store_count=got[it["group"]])
                db.add(c)
                db.flush()
                notify(db, role="dispatcher", depot=user.depot, kind="count_conflict",
                       title=f"{stop.outlet.name} · {c.line} count differs", body=f"Driver {c.driver_count}, store {c.store_count}",
                       meta={"conflict_id": c.id})
                notify(db, role="driver", user_id=user.id, kind="count_conflict", title=f"{stop.outlet.name} · {c.line}",
                       body=f"You recorded {c.driver_count}, the store confirmed {c.store_count}. Neither count is overwritten.",
                       meta={"conflict_id": c.id})
    notify(db, role="store", outlet_id=stop.outlet_id, kind="delivered", title=f"Delivered {lk_hhmm(dts)}",
           body="Confirm what you received, or report a problem.", meta={"stop_id": stop.id})
    if all(s.status in ("delivered", "partial", "failed") for s in _active(trip)):
        trip.status, trip.completed_at = "completed", dts
    return res
