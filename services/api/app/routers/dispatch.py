from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.deps import require
from app.models import Conflict, Deferral, LoadLine, Notification, Order, Stop, Trip, User
from app.services import demand, live
from app.services.common import REASON_LABEL, lk_hhmm, notify
from app.services.planning import (
    PlanError,
    build_plan,
    defer_order,
    evaluate,
    get_plan,
    move_order,
    queue_orders,
    release_plan,
)

router = APIRouter(prefix="/dispatch", tags=["dispatcher"])
Dispatcher = Depends(require("dispatcher"))


class BuildBody(BaseModel):
    depot: str
    date: date


class MoveBody(BaseModel):
    order_id: str
    vehicle_id: str
    trip_no: int | None = None


class DeferBody(BaseModel):
    order_id: str
    reason: str
    note: str | None = None


class ResolveBody(BaseModel):
    action: str


class AnswerBody(BaseModel):
    answer: str
    note: str | None = None


def _plan_or_404(db: Session, plan_id: int):
    from app.models import Plan

    p = db.get(Plan, plan_id)
    if p is None:
        raise HTTPException(404, "Plan not found")
    return p


def _wrap(fn, db: Session):
    try:
        return fn()
    except PlanError as e:
        db.rollback()
        raise HTTPException(422, str(e)) from None


@router.get("/context")
def context(user: User = Dispatcher) -> dict:
    return {
        "name": user.name,
        "depots": ["Kandy", "Peliyagoda"],
        "default_depot": "Kandy",
        "service_date": settings.demo_service_date,
        "outlook_start": settings.outlook_start,
    }


@router.get("/queue")
def queue(depot: str, date: date, user: User = Dispatcher, db: Session = Depends(get_db)) -> dict:
    orders = queue_orders(db, depot, date)
    deferred_out = list(db.scalars(select(Order).where(Order.depot == depot, Order.service_date == date, Order.status == "deferred")))
    rows = []
    for o in orders + deferred_out:
        ol = o.outlet
        flags = []
        if o.deferred_yesterday:
            flags.append("SKIPPED")
        if o.temp_requirement == "chilled":
            flags.append("CHILLED")
        if ol.parking_constraint == "van_only":
            flags.append("VAN ONLY")
        if ol.parking_constraint == "mall_dock":
            flags.append("MALL WINDOW")
        rows.append(
            {
                "id": o.id,
                "outlet": ol.name or ol.outlet_id,
                "outlet_id": ol.outlet_id,
                "brand": o.brand,
                "temp": o.temp_requirement,
                "district": o.district,
                "weight_kg": o.weight_kg,
                "volume_m3": o.volume_m3,
                "window": f"Mall window {ol.mall_window}"
                if ol.mall_window
                else (f"Before {ol.window_close_time}" if o.brand == "Fresh" else f"{ol.window_open_time}–{ol.window_close_time}"),
                "flags": flags,
                "status": o.status,
                "days_since_last_served": o.days_since_last_served,
                "lines": [
                    {"name": ln.get("name"), "group": ln.get("group"), "qty": ln.get("qty"), "pack_label": ln.get("pack_label")}
                    for ln in (o.lines or [])
                ],
            }
        )
    rows.sort(key=lambda r: (0 if "SKIPPED" in r["flags"] else 1, r["id"]))
    plan = get_plan(db, depot, date)
    return {
        "depot": depot,
        "date": date.isoformat(),
        "total": len(rows),
        "chilled": sum(1 for r in rows if r["temp"] == "chilled"),
        "van_only": sum(1 for r in rows if "VAN ONLY" in r["flags"]),
        "mall_dock": sum(1 for r in rows if "MALL WINDOW" in r["flags"]),
        "skipped": sum(1 for r in rows if "SKIPPED" in r["flags"]),
        "orders": rows,
        "plan": {"id": plan.id, "status": plan.status} if plan else None,
    }


@router.post("/plan")
def build(body: BuildBody, user: User = Dispatcher, db: Session = Depends(get_db)) -> dict:
    plan = _wrap(lambda: build_plan(db, body.depot, body.date, user.name), db)
    db.commit()
    return evaluate(db, plan)


@router.get("/plan")
def current_plan(depot: str, date: date, user: User = Dispatcher, db: Session = Depends(get_db)) -> dict:
    plan = get_plan(db, depot, date)
    if plan is None:
        return {"plan": None}
    return evaluate(db, plan)


@router.post("/plan/{plan_id}/move")
def move(plan_id: int, body: MoveBody, user: User = Dispatcher, db: Session = Depends(get_db)) -> dict:
    plan = _plan_or_404(db, plan_id)
    _wrap(lambda: move_order(db, plan, body.order_id, body.vehicle_id, body.trip_no), db)
    db.commit()
    return evaluate(db, plan)


@router.post("/plan/{plan_id}/defer")
def defer(plan_id: int, body: DeferBody, user: User = Dispatcher, db: Session = Depends(get_db)) -> dict:
    plan = _plan_or_404(db, plan_id)
    _wrap(lambda: defer_order(db, plan, body.order_id, body.reason, body.note, user.name), db)
    db.commit()
    return evaluate(db, plan)


@router.get("/reasons")
def reasons(user: User = Dispatcher) -> list[dict]:
    return [{"code": k, "label": v} for k, v in REASON_LABEL.items()]


@router.post("/plan/{plan_id}/release")
def release(plan_id: int, user: User = Dispatcher, db: Session = Depends(get_db)) -> dict:
    plan = _plan_or_404(db, plan_id)
    if plan.status == "released":
        raise HTTPException(409, "Already released")
    _wrap(lambda: release_plan(db, plan, user.name), db)
    db.commit()
    return evaluate(db, plan)


@router.get("/live")
def live_board(depot: str, date: date, user: User = Dispatcher, db: Session = Depends(get_db)) -> dict:
    plan = get_plan(db, depot, date)
    if plan is None or plan.status != "released":
        return {"plan": None, "runs": [], "needs_you": [], "issues": [], "headline": {"out": 0, "needs_you": 0}}
    out = live.board(db, plan)
    deferred = db.scalars(select(Deferral).where(Deferral.plan_id == plan.id, Deferral.active.is_(True)))
    out["deferrals"] = [
        {
            "outlet": db.get(Order, d.order_id).outlet.name,
            "temp": db.get(Order, d.order_id).temp_requirement,
            "reason": REASON_LABEL[d.reason],
            "deferred_to": d.deferred_to.isoformat() if d.deferred_to else None,
            "second_skip": d.skipped_before,
        }
        for d in deferred
    ]
    return out


@router.post("/conflicts/{cid}/resolve")
def resolve(cid: int, body: ResolveBody, user: User = Dispatcher, db: Session = Depends(get_db)) -> dict:
    c = db.get(Conflict, cid)
    if c is None or c.status != "open":
        raise HTTPException(404, "Nothing to resolve")
    if body.action not in ("accept_store", "accept_driver", "acknowledge"):
        raise HTTPException(400, "Unknown action")
    c.status, c.resolution = "resolved", body.action
    s = db.get(Stop, c.stop_id)
    drv = db.scalar(select(User).where(User.role == "driver", User.vehicle_id == s.trip.vehicle_id))
    if drv:
        label = {"accept_store": "the store's count", "accept_driver": "your count", "acknowledged": "the change"}.get(
            body.action, "the change"
        )
        notify(
            db,
            role="driver",
            user_id=drv.id,
            kind="conflict_resolved",
            title=f"{s.outlet.name}: settled",
            body=f"Ruwan accepted {label}.",
            meta={"conflict_id": c.id},
        )
    db.commit()
    return {"ok": True}


@router.post("/flags/{line_id}/answer")
def answer_flag(line_id: int, body: AnswerBody, user: User = Dispatcher, db: Session = Depends(get_db)) -> dict:
    ln = db.get(LoadLine, line_id)
    if ln is None or ln.flag_status != "open":
        raise HTTPException(404, "No open flag")
    if body.answer not in ("top_up", "send_as_is"):
        raise HTTPException(400, "Unknown answer")
    ln.flag_status, ln.flag_answer = "answered", body.answer
    if body.note:
        ln.flag_note = (ln.flag_note or "") + f" · {user.name}: {body.note}"
    trip = db.get(Trip, ln.trip_id)
    notify(
        db,
        role="loader",
        depot=trip.plan.depot,
        kind="flag_answered",
        title=f"{user.name.split()[0]} answered your flag",
        body=f"{ln.group}: " + ("top up from another vehicle" if body.answer == "top_up" else "send as is"),
        meta={"trip_id": trip.id, "line_id": ln.id},
    )
    db.commit()
    return {"ok": True}


@router.get("/demand")
def demand_outlook(start: date | None = None, user: User = Dispatcher, db: Session = Depends(get_db)) -> dict:
    return demand.outlook(db, start or date.fromisoformat(settings.outlook_start))


@router.get("/notifications")
def notifications(user: User = Dispatcher, db: Session = Depends(get_db)) -> list[dict]:
    rows = db.scalars(select(Notification).where(Notification.role == "dispatcher").order_by(Notification.id.desc()).limit(30))
    return [{"id": n.id, "kind": n.kind, "title": n.title, "body": n.body, "at": lk_hhmm(n.created_at), "meta": n.meta} for n in rows]
