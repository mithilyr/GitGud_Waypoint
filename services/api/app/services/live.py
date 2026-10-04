"""The dispatcher's live run board (D-L): where every released trip is, and what needs a person."""

from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Conflict, DeliveryEvent, LoadLine, Plan, Receipt, Stop, Trip, User, Vehicle
from app.services.common import late_risk_pct, lk_hhmm, now, vehicle_kind

SIGNAL_GAP_S = 300  # no contact for 5 minutes = no signal


def _active(trip: Trip) -> list[Stop]:
    return [s for s in trip.stops if not s.removed]


def trip_state(trip: Trip, stops: list[Stop]) -> dict:
    done = [s for s in stops if s.status in ("delivered", "partial", "failed")]
    nxt = next((s for s in stops if s.status in ("pending", "arrived")), None)
    gap = (now() - trip.last_seen_at).total_seconds() if trip.last_seen_at else None
    no_signal = trip.status == "out" and gap is not None and gap > SIGNAL_GAP_S
    if trip.status == "completed" or (stops and len(done) == len(stops)):
        last = max((s.done_at for s in done if s.done_at), default=trip.completed_at)
        return {"key": "completed", "label": f"COMPLETED {lk_hhmm(last) or ''}".strip(), "tone": "ok"}
    if no_signal:
        return {"key": "no_signal", "label": f"NO SIGNAL · {int(gap // 60)} MIN", "tone": "warn"}
    if trip.status == "out" and nxt:
        risk = late_risk_pct(nxt.eta, nxt.window_close)
        if risk >= 20:
            return {"key": "late", "label": f"LATE RISK {risk}%", "tone": "danger", "risk": risk}
        return {"key": "on_time", "label": "ON TIME", "tone": "ok"}
    label = {"planned": "NOT STARTED", "loading": "LOADING", "released": "RELEASED"}.get(trip.status, trip.status.upper())
    if trip.change and not trip.change.get("acked") and trip.status in ("planned", "loading"):
        label = "PLAN CHANGED"
    return {"key": trip.status, "label": label, "tone": "neutral"}


def offline_log(db: Session, trip: Trip) -> list[dict]:
    """Events that reached the server late: what happened while the phone had no signal."""
    rows = db.scalars(
        select(DeliveryEvent)
        .where(DeliveryEvent.trip_id == trip.id, DeliveryEvent.late_by_s > SIGNAL_GAP_S)
        .order_by(DeliveryEvent.device_ts)
    )
    log = []
    for e in rows:
        stop = db.get(Stop, e.stop_id) if e.stop_id else None
        name = (stop.outlet.name or stop.outlet_id) if stop else ""
        text = {
            "arrive": f"{name} arrived",
            "trip_start": "Trip started",
            "deliver": f"{name} {e.payload.get('outcome', 'delivered')}"
            + (f" · {sum(i['handed'] for i in e.payload.get('items', []))} crates" if e.payload.get("items") else "")
            + (" · photo" if e.payload.get("photo") else ""),
        }.get(e.kind)
        if text:
            log.append({"at": lk_hhmm(e.device_ts), "text": text, "synced": lk_hhmm(e.server_ts)})
    return log


def board(db: Session, plan: Plan) -> dict:
    rows = []
    open_conflicts = list(db.scalars(select(Conflict).where(Conflict.status == "open").order_by(Conflict.id)))
    conflict_by_trip: dict[int, list[Conflict]] = {}
    for c in open_conflicts:
        s = db.get(Stop, c.stop_id)
        if s and s.trip.plan_id == plan.id:
            conflict_by_trip.setdefault(s.trip_id, []).append(c)

    out_count = 0
    for trip in sorted(plan.trips, key=lambda t: (t.depart_planned or "", t.vehicle_id, t.trip_no)):
        stops = _active(trip)
        if not stops:
            continue
        v = db.get(Vehicle, trip.vehicle_id)
        driver = db.scalar(select(User).where(User.role == "driver", User.vehicle_id == trip.vehicle_id))
        state = trip_state(trip, stops)
        done = [s for s in stops if s.status in ("delivered", "partial", "failed")]
        nxt = next((s for s in stops if s.status in ("pending", "arrived")), None)
        log = offline_log(db, trip)
        if trip.status == "out":
            out_count += 1
        rows.append(
            {
                "trip_id": trip.id,
                "vehicle_id": trip.vehicle_id,
                "driver": driver.name.split()[0] if driver else None,
                "kind": vehicle_kind(v),
                "brand": trip.brand,
                "district": trip.district,
                "trip_no": trip.trip_no,
                "status": trip.status,
                "state": state,
                "depart": trip.depart_planned,
                "progress": {"done": len(done), "total": len(stops)},
                "next_stop": {"name": nxt.outlet.name or nxt.outlet_id, "eta": nxt.eta, "seq": nxt.seq} if nxt else None,
                "offline": log,
                "back_online": lk_hhmm(trip.last_seen_at) if log and state["key"] != "no_signal" else None,
                "conflicts": len(conflict_by_trip.get(trip.id, [])),
                "stops": [
                    {
                        "id": s.id,
                        "seq": s.seq,
                        "name": s.outlet.name or s.outlet_id,
                        "eta": s.eta,
                        "status": s.status,
                        "at": lk_hhmm(s.done_at),
                    }
                    for s in stops
                ],
            }
        )

    needs = []
    for c in open_conflicts:
        s = db.get(Stop, c.stop_id)
        if s is None or s.trip.plan_id != plan.id:
            continue
        name = s.outlet.name or s.outlet_id
        if c.kind == "count":
            needs.append(
                {
                    "type": "count",
                    "id": c.id,
                    "title": f"{name} · {c.line} count differs",
                    "vehicle_id": s.trip.vehicle_id,
                    "driver_count": c.driver_count,
                    "store_count": c.store_count,
                    "driver_stance": c.driver_stance,
                    "photo": (s.delivery or {}).get("photo"),
                    "actions": ["accept_store", "accept_driver"],
                }
            )
        else:
            needs.append(
                {
                    "type": "reassigned",
                    "id": c.id,
                    "title": f"{name} was reassigned while {s.trip.vehicle_id} was offline",
                    "vehicle_id": s.trip.vehicle_id,
                    "detail": "The driver recorded this stop after the plan moved it. Check the record and confirm.",
                    "actions": ["acknowledge"],
                }
            )
    for ln in db.scalars(select(LoadLine).join(Trip).where(Trip.plan_id == plan.id, LoadLine.flag_status == "open")):
        s = db.get(Stop, ln.stop_id)
        needs.append(
            {
                "type": "flag",
                "id": ln.id,
                "title": f"{s.outlet.name or s.outlet_id} · {ln.group} {ln.found} of {ln.planned}",
                "vehicle_id": s.trip.vehicle_id,
                "detail": f"{ln.flagged_by or 'Loader'}: {ln.flag_reason.replace('_', ' ')}",
                "actions": ["top_up", "send_as_is"],
            }
        )
    issues = []
    for rc in db.scalars(
        select(Receipt)
        .join(Stop, Receipt.stop_id == Stop.id)
        .join(Trip, Stop.trip_id == Trip.id)
        .where(Trip.plan_id == plan.id, Receipt.status == "issue")
    ):
        s = db.get(Stop, rc.stop_id)
        issues.append({"stop_id": s.id, "outlet": s.outlet.name or s.outlet_id, "vehicle_id": s.trip.vehicle_id})
    return {
        "plan": {"id": plan.id, "depot": plan.depot, "service_date": plan.service_date.isoformat(), "version": plan.version},
        "headline": {"out": out_count, "needs_you": len(needs)},
        "runs": rows,
        "needs_you": needs,
        "issues": issues,
        "generated_at": (now() + timedelta(0)).strftime("%H:%M:%S"),
    }
