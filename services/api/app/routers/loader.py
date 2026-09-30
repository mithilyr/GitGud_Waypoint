from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import require
from app.models import LoadLine, Notification, Order, Plan, Stop, Trip, User, Vehicle
from app.services.common import lk_hhmm, notify, now, ordinal, vehicle_kind

router = APIRouter(prefix="/loader", tags=["loader"])
Loader = Depends(require("loader"))

REASONS = ("not_in_stock", "damaged", "wrong_item", "wont_fit")


class LoadBody(BaseModel):
    loaded: bool


class FlagBody(BaseModel):
    found: int = Field(ge=0)
    reason: str
    photo: str | None = None


class ReleaseBody(BaseModel):
    reefer_temp: float | None = None
    zones_ok: bool = True
    seal_no: str = Field(min_length=3, max_length=24)


def _active(t: Trip) -> list[Stop]:
    return [s for s in t.stops if not s.removed]


def _current_plan(db: Session, depot: str) -> Plan | None:
    return db.scalar(
        select(Plan).where(Plan.depot == depot, Plan.status == "released").order_by(Plan.service_date.desc(), Plan.id.desc())
    )


def _trip_for(db: Session, trip_id: int, user: User) -> Trip:
    t = db.get(Trip, trip_id)
    if t is None or t.plan.depot != user.depot:
        raise HTTPException(404, "Trip not found")
    return t


def _guard_change(t: Trip) -> None:
    if t.change and not t.change.get("acked") and t.status in ("planned", "loading"):
        raise HTTPException(409, "The plan changed. Tap Show updated list first.")


def _counts(lines: list[LoadLine]) -> tuple[int, int]:
    total = sum(ln.planned for ln in lines)
    done = sum((ln.found if ln.found is not None else ln.planned) for ln in lines if ln.loaded)
    return done, total


def _status(t: Trip, lines: list[LoadLine]) -> str:
    if t.status in ("out", "completed"):
        return "LEFT"
    if t.status == "released":
        return "RELEASED"
    if t.change and not t.change.get("acked"):
        return "PLAN CHANGED"
    done, _ = _counts(lines)
    if done or any(ln.loaded for ln in lines):
        return "LOADING"
    return "NOT STARTED"


def _departure(db: Session, t: Trip) -> dict:
    lines = [ln for ln in t.lines]
    done, total = _counts(lines)
    v = db.get(Vehicle, t.vehicle_id)
    driver = db.scalar(select(User).where(User.role == "driver", User.vehicle_id == t.vehicle_id))
    stops = _active(t)
    status = _status(t, lines)
    return {
        "trip_id": t.id,
        "vehicle_id": t.vehicle_id,
        "kind": vehicle_kind(v),
        "brand": t.brand,
        "district": t.district,
        "trip_no": t.trip_no,
        "stops": len(stops),
        "depart": t.depart_planned,
        "status": status,
        "loaded": done,
        "total": total,
        "driver": driver.name.split()[0] if driver else None,
        "released_at": lk_hhmm(t.released_at),
        "change_note": t.change["note"] if t.change and not t.change.get("acked") else None,
        "change_at": lk_hhmm(_parse(t.change["at"])) if t.change else None,
        "change_lines": (len(t.change["add"]) + len(t.change["remove"])) if t.change and not t.change.get("acked") else 0,
    }


def _parse(s: str):
    from datetime import datetime

    return datetime.fromisoformat(s)


@router.get("/departures")
def departures(user: User = Loader, db: Session = Depends(get_db)) -> dict:
    plan = _current_plan(db, user.depot)
    if plan is None:
        return {"date": None, "dock": user.dock, "depot": user.depot, "trips": []}
    trips = [t for t in plan.trips if _active(t)]
    rows = [_departure(db, t) for t in trips]
    order = {"LOADING": 0, "PLAN CHANGED": 1, "NOT STARTED": 2, "RELEASED": 3, "LEFT": 4}
    rows.sort(key=lambda r: (r["depart"] or "", order.get(r["status"], 9)))
    return {"date": plan.service_date.isoformat(), "dock": user.dock, "depot": user.depot, "trips": rows}


@router.get("/trips/{trip_id}")
def trip_detail(trip_id: int, user: User = Loader, db: Session = Depends(get_db)) -> dict:
    t = _trip_for(db, trip_id, user)
    v = db.get(Vehicle, t.vehicle_id)
    stops = sorted(_active(t), key=lambda s: -s.seq)  # last stop goes in first
    lines_by_stop: dict[int, list[LoadLine]] = {}
    for ln in t.lines:
        lines_by_stop.setdefault(ln.stop_id, []).append(ln)
    out_stops, current_marked = [], False
    weight = volume = 0.0
    for i, s in enumerate(stops, start=1):
        lns = lines_by_stop.get(s.id, [])
        complete = bool(lns) and all(ln.loaded for ln in lns)
        state = "done" if complete else ("current" if not current_marked else "todo")
        current_marked = current_marked or not complete
        order_total = sum(ln.planned for ln in lns) or 1
        for ln in lns:
            if ln.loaded:
                frac = (ln.found if ln.found is not None else ln.planned) / order_total
                weight += s.order.weight_kg * frac
                volume += s.order.volume_m3 * frac
        out_stops.append(
            {
                "stop_id": s.id,
                "load_position": i,
                "ordinal": ordinal(i),
                "seq": s.seq,
                "name": s.outlet.name or s.outlet_id,
                "state": state,
                "lines": [
                    {
                        "id": ln.id,
                        "group": ln.group,
                        "unit": ln.unit,
                        "temp": ln.temp,
                        "planned": ln.planned,
                        "loaded": ln.loaded,
                        "found": ln.found,
                        "flag": ln.flag_reason,
                        "flag_status": ln.flag_status,
                        "flag_answer": ln.flag_answer,
                    }
                    for ln in sorted(lns, key=lambda x: (x.temp != "chilled", x.group))
                ],
            }
        )
    done, total = _counts(list(t.lines))
    flags = [ln for ln in t.lines if ln.flag_status]
    return {
        "trip": _departure(db, t),
        "vehicle": {"id": v.vehicle_id, "weight_cap_kg": v.weight_cap_kg, "volume_cap_m3": v.volume_cap_m3, "temp": v.temp},
        "loaded": done,
        "total": total,
        "weight_kg": round(weight),
        "volume_m3": round(volume, 1),
        "stops": out_stops,
        "has_chilled": any(ln.temp == "chilled" for ln in t.lines),
        "has_ambient": any(ln.temp == "ambient" for ln in t.lines),
        "flags": [
            {
                "id": ln.id,
                "stop": db.get(Stop, ln.stop_id).outlet.name,
                "group": ln.group,
                "found": ln.found,
                "planned": ln.planned,
                "reason": ln.flag_reason,
                "status": ln.flag_status,
                "answer": ln.flag_answer,
            }
            for ln in flags
        ],
        "change": t.change if t.change and not t.change.get("acked") else None,
        "released": t.status in ("released", "out", "completed"),
        "seal_no": t.seal_no,
        "reefer_temp": t.reefer_temp,
        "released_by": t.released_by,
    }


def _mark_started(t: Trip, user: User) -> None:
    if t.status == "planned":
        t.status = "loading"
        t.started_by = user.name


@router.post("/lines/{line_id}/load")
def load_line(line_id: int, body: LoadBody, user: User = Loader, db: Session = Depends(get_db)) -> dict:
    ln = db.get(LoadLine, line_id)
    if ln is None:
        raise HTTPException(404, "Line not found")
    t = _trip_for(db, ln.trip_id, user)
    _guard_change(t)
    if t.status in ("released", "out", "completed"):
        raise HTTPException(409, "This vehicle is already released")
    ln.loaded = body.loaded
    ln.loaded_by = user.name if body.loaded else None
    if not body.loaded:
        ln.found = None
        ln.flag_reason = ln.flag_status = ln.flag_answer = None
    _mark_started(t, user)
    db.commit()
    return {"ok": True}


@router.post("/trips/{trip_id}/stops/{stop_id}/load-all")
def load_stop(trip_id: int, stop_id: int, user: User = Loader, db: Session = Depends(get_db)) -> dict:
    t = _trip_for(db, trip_id, user)
    _guard_change(t)
    if t.status in ("released", "out", "completed"):
        raise HTTPException(409, "This vehicle is already released")
    for ln in t.lines:
        if ln.stop_id == stop_id and not ln.loaded:
            ln.loaded, ln.loaded_by = True, user.name
    _mark_started(t, user)
    db.commit()
    return {"ok": True}


@router.post("/lines/{line_id}/flag")
def flag(line_id: int, body: FlagBody, user: User = Loader, db: Session = Depends(get_db)) -> dict:
    ln = db.get(LoadLine, line_id)
    if ln is None:
        raise HTTPException(404, "Line not found")
    t = _trip_for(db, ln.trip_id, user)
    _guard_change(t)
    if body.reason not in REASONS:
        raise HTTPException(400, "Pick what happened")
    if body.found >= ln.planned and body.reason != "damaged":
        raise HTTPException(400, "Count found must be lower than planned")
    stop = db.get(Stop, ln.stop_id)
    ln.found = min(body.found, ln.planned)
    ln.flag_reason, ln.flag_status, ln.flag_answer = body.reason, "open", None
    ln.flag_photo, ln.flagged_by, ln.flagged_at, ln.loaded = body.photo, user.name, now(), True
    ln.loaded_by = user.name
    stop.order.status = "shortfall"
    _mark_started(t, user)
    name = stop.outlet.name or stop.outlet_id
    notify(db, role="dispatcher", depot=t.plan.depot, kind="loader_flag",
           title=f"{t.vehicle_id} · {name} · {ln.group} {ln.found} of {ln.planned}",
           body=f"{user.name.split()[0]}: {body.reason.replace('_', ' ')}. Top up from another vehicle or send as is.",
           meta={"line_id": ln.id, "trip_id": t.id})
    notify(db, role="store", outlet_id=stop.outlet_id, kind="shortfall", title=f"{ln.group}: {ln.found} of {ln.planned}",
           body="Flagged at the dock before the truck leaves.", meta={"stop_id": stop.id})
    db.commit()
    return {"ok": True}


@router.post("/trips/{trip_id}/ack-change")
def ack_change(trip_id: int, user: User = Loader, db: Session = Depends(get_db)) -> dict:
    t = _trip_for(db, trip_id, user)
    if t.change:
        t.change = {**t.change, "acked": True}
        # Lines that moved or were added must be loaded again from the new list.
        db.commit()
    return {"ok": True}


@router.post("/trips/{trip_id}/release")
def release(trip_id: int, body: ReleaseBody, user: User = Loader, db: Session = Depends(get_db)) -> dict:
    t = _trip_for(db, trip_id, user)
    _guard_change(t)
    if t.status in ("released", "out", "completed"):
        raise HTTPException(409, "Already released")
    lines = list(t.lines)
    if not lines or not all(ln.loaded for ln in lines):
        raise HTTPException(422, "Every line must be loaded or flagged first")
    has_chilled = any(ln.temp == "chilled" for ln in lines)
    if has_chilled:
        if body.reefer_temp is None:
            raise HTTPException(422, "Enter the reefer temperature")
        if body.reefer_temp > 5:
            raise HTTPException(422, f"Reefer is at {body.reefer_temp:g} °C. Do not release; flag it and ask Ruwan to reassign.")
        if any(ln.temp == "ambient" for ln in lines) and not body.zones_ok:
            raise HTTPException(422, "Keep chilled and ambient apart before you release")
    for ln in lines:
        if ln.flag_status == "open":
            ln.flag_status, ln.flag_answer = "answered", "send_as_is"
    t.status, t.released_by, t.released_at = "released", user.name, now()
    t.reefer_temp, t.seal_no = body.reefer_temp, body.seal_no
    for s in _active(t):
        o: Order = s.order
        o.status = "shortfall" if any(ln.flag_reason and ln.stop_id == s.id for ln in lines) else "loaded"
    for d in db.scalars(select(User).where(User.role == "driver", User.vehicle_id == t.vehicle_id)):
        notify(db, role="driver", user_id=d.id, kind="load_released", title=f"Load released · {user.name.split()[0]}, {user.dock}",
               body=f"{t.vehicle_id} is loaded and sealed ({t.seal_no}).", meta={"trip_id": t.id})
    notify(db, role="dispatcher", depot=t.plan.depot, kind="departure", title=f"{t.vehicle_id} released by {user.name.split()[0]}",
           body=f"Trip {t.trip_no} · {len(_active(t))} stops", meta={"trip_id": t.id})
    db.commit()
    return {"ok": True, "at": lk_hhmm(t.released_at)}


@router.get("/notifications")
def notifications(user: User = Loader, db: Session = Depends(get_db)) -> list[dict]:
    rows = db.scalars(
        select(Notification).where(Notification.role == "loader", Notification.depot == user.depot).order_by(Notification.id.desc()).limit(20)
    )
    return [{"id": n.id, "kind": n.kind, "title": n.title, "body": n.body, "at": lk_hhmm(n.created_at), "meta": n.meta} for n in rows]

