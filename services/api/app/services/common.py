"""Shared helpers: clock, notifications, conversions between DB rows and the allocation package."""

import math
from collections import OrderedDict
from datetime import date, datetime, timedelta, timezone

from allocation import Order as AOrder
from allocation import TravelStandards
from allocation import Vehicle as AVehicle
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import CalendarDay, DistrictTravel, Notification, Order, ServiceAllowance, Vehicle

LK = timezone(timedelta(hours=5, minutes=30))  # Sri Lanka time; no tz database needed in slim images

REASON_LABEL = {
    "capacity_volume": "Capacity (volume)",
    "capacity_weight": "Capacity (weight)",
    "no_reefer": "No reefer",
    "no_van": "No van",
    "time_budget": "Time budget",
    "fuel_quota": "Fuel quota",
    "manual": "Manual",
}


def reason_for_store(code: str, district: str, note: str | None = None) -> str:
    text = {
        "capacity_volume": "There was not enough space on the trucks for this order",
        "capacity_weight": "The trucks were at their weight limit",
        "no_reefer": f"No reefer capacity on the {district} route",
        "no_van": "No van was free for this outlet",
        "time_budget": f"Not enough driving time left for the {district} route",
        "fuel_quota": "The vehicle had reached its weekly fuel quota",
        "manual": "Dispatch moved it to make the run work",
    }.get(code, "Dispatch moved this order")
    return f"{text}. {note}" if note and code == "manual" else text


def now() -> datetime:
    return datetime.now(LK)


def lk_hhmm(dt: datetime | None) -> str | None:
    return dt.astimezone(LK).strftime("%H:%M") if dt else None


def notify(
    db: Session,
    *,
    role: str,
    kind: str,
    title: str,
    body: str = "",
    user_id: int | None = None,
    outlet_id: str | None = None,
    depot: str | None = None,
    meta: dict | None = None,
) -> Notification:
    n = Notification(role=role, kind=kind, title=title, body=body, user_id=user_id, outlet_id=outlet_id, depot=depot, meta=meta or {})
    db.add(n)
    return n


def is_operating(db: Session, d: date) -> bool:
    row = db.get(CalendarDay, d)
    if row is not None:
        return bool(row.is_operating)
    return d.weekday() != 6  # Mon-Sat; the calendar file ends before the demo dates


def next_operating_day(db: Session, d: date) -> date:
    n = d + timedelta(days=1)
    while not is_operating(db, n):
        n += timedelta(days=1)
    return n


def std_from_db(db: Session) -> TravelStandards:
    dt = db.scalars(select(DistrictTravel)).all()
    al = db.scalars(select(ServiceAllowance)).all()
    return TravelStandards(
        depot_to_district_min={r.district: r.depot_to_district_freeflow_min for r in dt},
        inter_stop_min={r.district: r.inter_stop_freeflow_min for r in dt},
        service_allowance_min={(r.brand, r.dock_type): r.service_allowance_min for r in al},
        depot_to_district_km={r.district: r.depot_to_district_km for r in dt},
        inter_stop_km={r.district: r.inter_stop_km for r in dt},
    )


def to_avehicle(v: Vehicle) -> AVehicle:
    return AVehicle(v.vehicle_id, v.type, v.temp, v.weight_cap_kg, v.volume_cap_m3, v.depot, v.km_per_l)


def to_aorder(o: Order) -> AOrder:
    ol = o.outlet
    return AOrder(
        order_ref=o.id,
        outlet_id=o.outlet_id,
        brand=o.brand,
        district=o.district,
        depot=o.depot,
        dock_type=ol.dock_type,
        parking_constraint=ol.parking_constraint,
        temp_requirement=o.temp_requirement,
        weight_kg=o.weight_kg,
        volume_m3=o.volume_m3,
        deferred_yesterday=o.deferred_yesterday,
        days_since_last_served=o.days_since_last_served,
        window_open=ol.window_open_time,
        window_close=ol.window_close_time,
    )


def load_groups(order: Order) -> list[dict]:
    """Collapse an order's lines into what the loader and driver handle: one row per load group."""
    groups: OrderedDict[str, dict] = OrderedDict()
    for ln in order.lines or []:
        g = groups.setdefault(ln["group"], {"group": ln["group"], "packs": 0, "unit": ln.get("pack_label", "crate"), "temp": ln["temp"]})
        g["packs"] += int(ln.get("packs", 1))
    return list(groups.values())


def ordinal(n: int) -> str:
    return f"{n}{'th' if 10 <= n % 100 <= 20 else {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')}"


def late_risk_pct(eta: str | None, window_close: str) -> int:
    """Heuristic lateness risk from planned slack: 50% at zero slack, falling to ~5% at an hour."""
    if not eta:
        return 0
    slack = _m(window_close) - _m(eta)
    return int(round(100 / (1 + math.exp(slack / 15))))


def _m(hhmm: str) -> int:
    h, m = hhmm.split(":")[:2]
    return int(h) * 60 + int(m)


def vehicle_kind(v: Vehicle) -> str:
    base = "Reefer" if v.temp == "reefer" else "Dry"
    return f"{base} {v.type}"
