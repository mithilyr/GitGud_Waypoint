import math
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.deps import require
from app.models import (
    Conflict,
    Deferral,
    IssueReport,
    Item,
    LoadLine,
    Notification,
    Order,
    Outlet,
    Plan,
    Receipt,
    Stop,
    Trip,
    User,
    Vehicle,
)
from app.services.common import LK, lk_hhmm, load_groups, notify, now, ordinal
from app.services.planning import get_plan

router = APIRouter(prefix="/store", tags=["store"])
StoreUser = Depends(require("store"))

CUTOFF_HOUR = 16


class OrderLine(BaseModel):
    sku: str
    qty: int = Field(gt=0, le=500)


class NewOrder(BaseModel):
    lines: list[OrderLine] = Field(min_length=1)


class ConfirmLine(BaseModel):
    group: str
    received: int = Field(ge=0)


class Confirm(BaseModel):
    lines: list[ConfirmLine]


class Report(BaseModel):
    kind: str
    line: str | None = None
    note: str | None = None
    photo: str | None = None


class Message(BaseModel):
    text: str = Field(min_length=1, max_length=500)
    order_id: str | None = None


def _outlet(user: User, db: Session) -> Outlet:
    o = db.get(Outlet, user.outlet_id)
    if o is None:
        raise HTTPException(400, "This account is not tied to an outlet")
    return o


def service_date_for(db: Session, outlet: Outlet) -> date:
    """The delivery day a new order joins: the first day whose plan is not yet released."""
    d = date.fromisoformat(settings.demo_service_date)
    if settings.enforce_cutoff:
        from app.services.common import next_operating_day

        t = now()
        d = next_operating_day(db, t.date() if t.hour < CUTOFF_HOUR else next_operating_day(db, t.date()))
    for _ in range(14):
        plan = get_plan(db, outlet.depot, d)
        if plan is None or plan.status != "released":
            return d
        from app.services.common import next_operating_day

        d = next_operating_day(db, d)
    return d


def cutoff_info(db: Session, outlet: Outlet) -> dict:
    t = now()
    cutoff = t.replace(hour=CUTOFF_HOUR, minute=0, second=0, microsecond=0)
    minutes_left = int((cutoff - t).total_seconds() // 60)
    d = service_date_for(db, outlet)
    return {
        "label": "4:00 PM",
        "minutes_left": max(0, minutes_left),
        "passed": minutes_left <= 0,
        "enforced": settings.enforce_cutoff,
        "service_date": d.isoformat(),
        "window": f"before {outlet.window_close_time}" if outlet.brand == "Fresh" else f"{outlet.window_open_time}–{outlet.window_close_time}",
    }


@router.get("/home")
def home(user: User = StoreUser, db: Session = Depends(get_db)) -> dict:
    o = _outlet(user, db)
    return {
        "outlet": {"id": o.outlet_id, "name": o.name, "brand": o.brand, "district": o.district, "depot": o.depot},
        "manager": user.name,
        "cutoff": cutoff_info(db, o),
    }


@router.get("/catalog")
def catalog(user: User = StoreUser, db: Session = Depends(get_db)) -> list[dict]:
    o = _outlet(user, db)
    rows = db.scalars(select(Item).where(Item.brand == o.brand).order_by(Item.category, Item.name))
    return [
        {
            "sku": i.sku,
            "name": i.name,
            "category": i.category,
            "temp": i.temp,
            "price": i.price,
            "pack": f"pack of {i.pack_size}" if i.pack_size > 1 else "each",
            "often": i.often,
        }
        for i in rows
    ]


def _next_order_no(db: Session) -> int:
    top = db.scalar(select(func.max(Order.id))) or "ORD0092309"
    return int(top[3:]) + 1


def build_order_lines(db: Session, lines: list[OrderLine]) -> list[dict]:
    out = []
    for ln in lines:
        item = db.get(Item, ln.sku)
        if item is None:
            raise HTTPException(400, f"Unknown item {ln.sku}")
        out.append(
            {
                "sku": item.sku,
                "name": item.name,
                "group": item.load_group,
                "qty": ln.qty,
                "packs": max(1, math.ceil(ln.qty / item.pack_size)),
                "pack_label": item.pack_label,
                "temp": item.temp,
                "kg": round(item.kg_per_unit * ln.qty, 2),
                "m3": round(item.m3_per_unit * ln.qty, 4),
            }
        )
    return out


@router.post("/orders")
def place_order(body: NewOrder, user: User = StoreUser, db: Session = Depends(get_db)) -> dict:
    outlet = _outlet(user, db)
    lines = build_order_lines(db, body.lines)
    merged: dict[str, dict] = {}
    for ln in lines:  # same item twice = one line
        if ln["sku"] in merged:
            merged[ln["sku"]]["qty"] += ln["qty"]
            merged[ln["sku"]]["packs"] += ln["packs"]
            merged[ln["sku"]]["kg"] += ln["kg"]
            merged[ln["sku"]]["m3"] += ln["m3"]
        else:
            merged[ln["sku"]] = ln
    d = service_date_for(db, outlet)
    n = _next_order_no(db)
    group_ref = f"G{n}"
    created = []
    for temp in ("chilled", "ambient"):
        part = [ln for ln in merged.values() if ln["temp"] == temp]
        if not part:
            continue
        last = db.scalar(
            select(func.max(Order.service_date)).where(Order.outlet_id == outlet.outlet_id, Order.status.in_(("received", "issue_reported", "delivered")))
        )
        order = Order(
            id=f"ORD{n:07d}",
            outlet_id=outlet.outlet_id,
            brand=outlet.brand,
            depot=outlet.depot,
            district=outlet.district,
            service_date=d,
            temp_requirement=temp,
            status="confirmed",
            weight_kg=round(sum(ln["kg"] for ln in part), 1),
            volume_m3=round(sum(ln["m3"] for ln in part), 3),
            lines=part,
            group_ref=group_ref,
            days_since_last_served=max(1, (d - last).days) if last else 2,
            placed_by=user.name,
        )
        db.add(order)
        created.append(order)
        n += 1
    notify(
        db,
        role="dispatcher",
        depot=outlet.depot,
        kind="order_placed",
        title=f"{outlet.name} placed an order",
        body=f"{len(merged)} lines for {d:%a %d %b}",
        meta={"order_ids": [o.id for o in created]},
    )
    db.commit()
    return {
        "orders": [{"id": o.id, "temp": o.temp_requirement} for o in created],
        "lines": len(merged),
        "service_date": d.isoformat(),
        "received_at": lk_hhmm(now()),
        "message": "Kandy depot will load all lines for the run."
        if outlet.depot == "Kandy"
        else "Peliyagoda depot will load all lines for the run.",
    }


def _order_row(o: Order, db: Session) -> dict:
    stop = db.scalar(select(Stop).where(Stop.order_id == o.id, Stop.removed.is_(False)))
    return {
        "id": o.id,
        "temp": o.temp_requirement,
        "status": o.status,
        "service_date": o.service_date.isoformat(),
        "lines": o.lines,
        "weight_kg": o.weight_kg,
        "volume_m3": o.volume_m3,
        "stop_id": stop.id if stop else None,
        "deferral": {"reason_text": o.deferral_note or o.deferral_reason, "deferred_to": o.deferred_to.isoformat()}
        if o.status == "deferred" and o.deferred_to
        else None,
    }


@router.get("/orders")
def history(user: User = StoreUser, db: Session = Depends(get_db)) -> list[dict]:
    outlet = _outlet(user, db)
    orders = list(
        db.scalars(select(Order).where(Order.outlet_id == outlet.outlet_id).order_by(Order.service_date.desc(), Order.id.desc()))
    )
    rows = []
    for o in orders:
        r = _order_row(o, db)
        stop = db.get(Stop, r["stop_id"]) if r["stop_id"] else None
        receipt = db.scalar(select(Receipt).where(Receipt.stop_id == stop.id)) if stop else None
        r["summary"] = _summary(o, stop, receipt)
        rows.append(r)
    return rows


def _summary(o: Order, stop: Stop | None, receipt: Receipt | None) -> str:
    if receipt and receipt.status == "confirmed":
        short = [
            ln for ln in receipt.lines if ln["received"] < ln["expected"]
        ]
        return "Received in full." if not short else "1 short: " + ", ".join(f"{s['group']} {s['received']} of {s['expected']}" for s in short)
    if receipt:
        return "Issue reported."
    if o.status == "deferred":
        return f"Deferred to {o.deferred_to:%a %d %b}."
    return {
        "confirmed": "Received by dispatch.",
        "placed": "Received by dispatch.",
        "planned": "On the plan.",
        "loaded": "Loaded.",
        "shortfall": "Loaded with a shortfall.",
        "out_for_delivery": "On the way.",
        "delivered": "Delivered. Confirm what arrived.",
        "partial": "Delivered in part. Confirm what arrived.",
        "failed": "Could not be delivered.",
    }.get(o.status, o.status)


@router.get("/last-order")
def last_order(user: User = StoreUser, db: Session = Depends(get_db)) -> dict:
    """The most recent basket (chilled + ambient halves together) for 'Reorder last week'."""
    outlet = _outlet(user, db)
    latest = db.scalar(
        select(Order).where(Order.outlet_id == outlet.outlet_id, Order.status != "confirmed").order_by(Order.service_date.desc(), Order.id.desc())
    )
    if latest is None:
        raise HTTPException(404, "No earlier order to copy")
    basket = list(db.scalars(select(Order).where(Order.outlet_id == outlet.outlet_id, Order.group_ref == latest.group_ref))) if latest.group_ref else [latest]
    return {
        "date": latest.service_date.isoformat(),
        "lines": [{"sku": ln["sku"], "name": ln["name"], "qty": ln["qty"]} for o in basket for ln in o.lines],
    }


# --- tracking ---------------------------------------------------------------------------------------------------


def _steps(order: Order, stop: Stop | None, trip: Trip | None, flags: list[LoadLine]) -> list[dict]:
    st = order.status
    loaded = trip is not None and trip.status in ("released", "out", "completed")
    out_ = trip is not None and trip.status in ("out", "completed")
    done = stop is not None and stop.status in ("delivered", "partial", "failed")
    arrived = stop is not None and stop.status == "arrived"
    short = ", ".join(f"{f.group.lower()} {f.found if f.found is not None else 0} of {f.planned}" for f in flags)
    steps = [
        ("Order placed", "", True),
        ("Loaded", f"{short}, rest on the next run" if short else "", loaded),
        ("On the way", "", out_),
        ("Arriving", "", arrived or done),
        ("Delivered", "", done),
    ]
    result, current_marked = [], False
    for label, detail, ok in steps:
        if ok:
            state = "done"
        elif not current_marked and st != "deferred":
            state, current_marked = "current", True
        else:
            state = "todo"
        result.append({"label": label, "detail": detail, "state": state})
    return result


def _delivery_view(order: Order, db: Session) -> dict:
    stop = db.scalar(select(Stop).where(Stop.order_id == order.id, Stop.removed.is_(False)))
    trip = db.get(Trip, stop.trip_id) if stop else None
    view: dict = {"order": _order_row(order, db), "stop": None}
    if stop is None or trip is None:
        view["steps"] = _steps(order, None, None, [])
        return view
    vehicle = db.get(Vehicle, trip.vehicle_id)
    driver = db.scalar(select(User).where(User.role == "driver", User.vehicle_id == trip.vehicle_id))
    flags = list(db.scalars(select(LoadLine).where(LoadLine.stop_id == stop.id, LoadLine.flag_status.is_not(None))))
    lines = list(db.scalars(select(LoadLine).where(LoadLine.stop_id == stop.id)))
    siblings = [s for s in trip.stops if not s.removed]
    before = [s for s in siblings if s.seq < stop.seq and s.status not in ("delivered", "partial", "failed")]
    last_done = max((s for s in siblings if s.seq < stop.seq and s.status in ("delivered", "partial", "failed")), key=lambda s: s.seq, default=None)
    minutes = None
    if stop.eta and last_done and last_done.eta:
        minutes = max(1, _m(stop.eta) - _m(last_done.eta))
    receipt = db.scalar(select(Receipt).where(Receipt.stop_id == stop.id))
    report = db.scalar(select(IssueReport).where(IssueReport.stop_id == stop.id).order_by(IssueReport.id.desc()))
    delivery = stop.delivery or {}
    handed = {i["group"]: i["handed"] for i in delivery.get("items", [])}
    view["stop"] = {
        "id": stop.id,
        "status": stop.status,
        "seq": stop.seq,
        "stops_before": len(before),
        "eta": stop.eta,
        "window_close": stop.window_close,
        "window_open": stop.window_open,
        "minutes_away": minutes,
        "vehicle_id": trip.vehicle_id,
        "vehicle_kind": f"{'Reefer' if vehicle.temp == 'reefer' else 'Dry'} {vehicle.type}",
        "driver": driver.name.split()[0] if driver else None,
        "trip_status": trip.status,
        "depart": trip.depart_planned,
        "no_signal": bool(trip.status == "out" and trip.last_seen_at and (now() - trip.last_seen_at).total_seconds() > 300),
        "delivered_at": lk_hhmm(stop.done_at),
        "note": delivery.get("note"),
        "signed_by": delivery.get("signed_by"),
        "has_photo": bool(delivery.get("photo")),
        "photo": delivery.get("photo"),
        "lines": [
            {
                "group": ln.group,
                "unit": ln.unit,
                "temp": ln.temp,
                "planned": ln.planned,
                "expected": ln.found if ln.found is not None else ln.planned,
                "handed": handed.get(ln.group),
                "flag": ln.flag_reason,
            }
            for ln in lines
        ],
    }
    view["steps"] = _steps(order, stop, trip, flags)
    view["receipt"] = (
        {"status": receipt.status, "at": lk_hhmm(receipt.confirmed_at), "by": receipt.confirmed_by, "lines": receipt.lines}
        if receipt
        else None
    )
    view["report"] = {"code": report.code, "kind": report.kind, "line": report.line, "at": lk_hhmm(report.created_at)} if report else None
    return view


def _m(hhmm: str) -> int:
    h, m = hhmm.split(":")[:2]
    return int(h) * 60 + int(m)


@router.get("/track")
def track(user: User = StoreUser, db: Session = Depends(get_db)) -> dict:
    outlet = _outlet(user, db)
    orders = list(
        db.scalars(select(Order).where(Order.outlet_id == outlet.outlet_id).order_by(Order.service_date.desc(), Order.id))
    )
    if not orders:
        return {"deliveries": [], "date": None}
    # Show the freshest day that has a planned, deferred or delivered order.
    day = orders[0].service_date
    todays = [o for o in orders if o.service_date == day]
    deferred = [o for o in orders if o.status == "deferred"]
    return {
        "date": day.isoformat(),
        "deliveries": [_delivery_view(o, db) for o in todays if o.status != "deferred"],
        "deferred": [_order_row(o, db) for o in deferred],
    }


@router.get("/deliveries/{order_id}")
def delivery(order_id: str, user: User = StoreUser, db: Session = Depends(get_db)) -> dict:
    o = db.get(Order, order_id)
    if o is None or o.outlet_id != user.outlet_id:
        raise HTTPException(404, "Order not found")
    return _delivery_view(o, db)


# --- receipt ----------------------------------------------------------------------------------------------------


def _own_stop(stop_id: int, user: User, db: Session) -> Stop:
    s = db.get(Stop, stop_id)
    if s is None or s.outlet_id != user.outlet_id:
        raise HTTPException(404, "Delivery not found")
    if s.status not in ("delivered", "partial", "failed"):
        raise HTTPException(409, "This delivery has not arrived yet")
    return s


@router.post("/stops/{stop_id}/confirm")
def confirm(stop_id: int, body: Confirm, user: User = StoreUser, db: Session = Depends(get_db)) -> dict:
    s = _own_stop(stop_id, user, db)
    if db.scalar(select(Receipt).where(Receipt.stop_id == s.id)):
        raise HTTPException(409, "Already confirmed")
    expected = {ln.group: (ln.found if ln.found is not None else ln.planned) for ln in db.scalars(select(LoadLine).where(LoadLine.stop_id == s.id))}
    handed = {i["group"]: i["handed"] for i in (s.delivery or {}).get("items", [])}
    lines, conflicts = [], []
    for ln in body.lines:
        exp = expected.get(ln.group)
        if exp is None:
            raise HTTPException(400, f"{ln.group} is not on this delivery")
        lines.append({"group": ln.group, "expected": exp, "received": ln.received, "driver": handed.get(ln.group)})
        if handed.get(ln.group) is not None and handed[ln.group] != ln.received:
            c = Conflict(stop_id=s.id, kind="count", line=ln.group, driver_count=handed[ln.group], store_count=ln.received)
            db.add(c)
            conflicts.append(c)
    db.add(Receipt(stop_id=s.id, order_id=s.order_id, status="confirmed", lines=lines, confirmed_by=user.name))
    s.order.status = "received"
    outlet = db.get(Outlet, s.outlet_id)
    if conflicts:
        db.flush()
        for c in conflicts:
            notify(db, role="dispatcher", depot=outlet.depot, kind="count_conflict", title=f"{outlet.name} · {c.line} count differs",
                   body=f"Driver {c.driver_count}, store {c.store_count}", meta={"conflict_id": c.id, "stop_id": s.id})
            drv = db.scalar(select(User).where(User.role == "driver", User.vehicle_id == s.trip.vehicle_id))
            if drv:
                notify(db, role="driver", user_id=drv.id, kind="count_conflict", title=f"{outlet.name} · {c.line}",
                       body=f"You recorded {c.driver_count}, the store confirmed {c.store_count}. Neither count is overwritten.",
                       meta={"conflict_id": c.id, "stop_id": s.id})
    notify(db, role="dispatcher", depot=outlet.depot, kind="receipt", title=f"{outlet.name} confirmed receipt", body="", meta={"stop_id": s.id})
    db.commit()
    return {"ok": True, "conflicts": len(conflicts), "at": lk_hhmm(now())}


@router.post("/stops/{stop_id}/report")
def report(stop_id: int, body: Report, user: User = StoreUser, db: Session = Depends(get_db)) -> dict:
    s = _own_stop(stop_id, user, db)
    if body.kind not in ("short", "damaged", "wrong_item", "other"):
        raise HTTPException(400, "Pick what happened")
    rpt = IssueReport(stop_id=s.id, order_id=s.order_id, kind=body.kind, line=body.line, note=body.note, photo=body.photo, reported_by=user.name)
    db.add(rpt)
    if not db.scalar(select(Receipt).where(Receipt.stop_id == s.id)):
        db.add(Receipt(stop_id=s.id, order_id=s.order_id, status="issue", lines=[], confirmed_by=user.name))
    s.order.status = "issue_reported"
    outlet = db.get(Outlet, s.outlet_id)
    db.flush()
    notify(db, role="dispatcher", depot=outlet.depot, kind="issue_report", title=f"{outlet.name} reported a problem",
           body=f"{body.kind.replace('_', ' ')} · {body.line or 'whole delivery'}", meta={"stop_id": s.id, "report": rpt.code})
    db.commit()
    return {"code": rpt.code, "sent_at": lk_hhmm(now()), "reply_by": "10:00"}


@router.post("/message")
def message(body: Message, user: User = StoreUser, db: Session = Depends(get_db)) -> dict:
    outlet = _outlet(user, db)
    notify(db, role="dispatcher", depot=outlet.depot, kind="store_message", title=f"{outlet.name}: message",
           body=body.text, meta={"order_id": body.order_id, "outlet_id": outlet.outlet_id})
    db.commit()
    return {"ok": True}


# --- notifications ----------------------------------------------------------------------------------------------


@router.get("/notifications")
def notifications(user: User = StoreUser, db: Session = Depends(get_db)) -> list[dict]:
    rows = db.scalars(
        select(Notification).where(Notification.role == "store", Notification.outlet_id == user.outlet_id).order_by(Notification.id.desc()).limit(20)
    )
    return [
        {"id": n.id, "kind": n.kind, "title": n.title, "body": n.body, "meta": n.meta, "at": lk_hhmm(n.created_at), "read": n.read_at is not None}
        for n in rows
    ]


@router.post("/notifications/{nid}/read")
def read_notification(nid: int, user: User = StoreUser, db: Session = Depends(get_db)) -> dict:
    n = db.get(Notification, nid)
    if n is not None and n.outlet_id == user.outlet_id and n.read_at is None:
        n.read_at = now()
        db.commit()
    return {"ok": True}


_ = (Deferral, Plan, datetime, LK, load_groups, ordinal)
