"""Seed the operational side: catalogue, the four role accounts and one realistic delivery day.

The day is real data: seed/data/demo_orders.csv holds the orders of a heavy historical day (31 Oct 2024)
for both depots, re-dated to DEMO_SERVICE_DATE. Two Kandy reefers are in the workshop and the week's
fuel is partly used, so demand exceeds capacity and the allocator has to defer orders with reasons.

Idempotent for reference-like data; `reset_operations` wipes the operational rows and reseeds the day.
"""
import csv
import math
import random
from datetime import date, timedelta
from pathlib import Path

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import (
    Conflict,
    Deferral,
    DeliveryEvent,
    FuelLedger,
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
    VehicleStatus,
)
from app.security import hash_password, hash_pin
from seed.catalog import ITEMS
from seed.outlet_names import assign

DATA_DIR = Path(__file__).parent / "data"
DEMO_PASSWORD = "waypoint2026"

USERS = [
    # email, name, role, pin, depot, dock, phone, extras
    ("dispatcher@waypoint.demo", "Ruwan Fernando", "dispatcher", None, "Peliyagoda", None, "+94 11 234 5678", {}),
    ("loader@waypoint.demo", "Kamal Jayasuriya", "loader", "1234", "Kandy", "Dock 3", None, {}),
    ("tharindu@waypoint.demo", "Tharindu Wijesinghe", "loader", "2345", "Kandy", "Dock 3", None, {}),
    ("fathima@waypoint.demo", "Fathima Rizna", "loader", "3456", "Kandy", "Dock 3", None, {}),
    ("suresh@waypoint.demo", "Suresh Kumar", "loader", "4567", "Kandy", "Dock 3", None, {}),
    ("driver@waypoint.demo", "Nuwan Perera", "driver", "4821", "Kandy", None, "+94 77 123 4567", {"vehicle_id": "VEH057", "driver_code": "DRV-0142"}),
    ("driver2@waypoint.demo", "Mahesh Silva", "driver", "5678", "Kandy", None, "+94 77 555 0177", {"vehicle_id": "VEH045", "driver_code": "DRV-0177"}),
    ("store@waypoint.demo", "Shanika Wijeratne", "store", None, "Kandy", None, "+94 71 555 0142", {"pilimathalawa": True}),
]

WORKSHOP = {"VEH043": "gearbox repair", "VEH042": "brake service", "VEH040": "reefer unit fault", "VEH039": "tyres"}  # Kandy reefer trucks


def seed_reference_extras(db: Session) -> None:
    """Item catalogue and outlet display names."""
    if not db.scalar(select(func.count()).select_from(Item)):
        for sku, name, cat, group, brand, temp, pack, label, kg, m3, price, often in ITEMS:
            db.add(Item(sku=sku, name=name, category=cat, load_group=group, brand=brand, temp=temp, pack_size=pack,
                        pack_label=label, kg_per_unit=kg, m3_per_unit=m3, price=price, often=often))
    outlets = db.scalars(select(Outlet)).all()
    if outlets and not any(o.name for o in outlets):
        names = assign(
            [
                {"outlet_id": o.outlet_id, "brand": o.brand, "district": o.district, "parking_constraint": o.parking_constraint}
                for o in outlets
            ]
        )
        for o in outlets:
            o.name = names.get(o.outlet_id, o.outlet_id)
    db.commit()


def seed_users(db: Session) -> None:
    if db.scalar(select(func.count()).select_from(User)):
        return
    pili = db.scalar(select(Outlet).where(Outlet.name == "Pilimathalawa"))
    for email, name, role, pin, depot, dock, phone, extra in USERS:
        db.add(
            User(
                email=email, name=name, role=role, password_hash=hash_password(DEMO_PASSWORD),
                pin_hash=hash_pin(pin) if pin else None, depot=depot, dock=dock, phone=phone,
                vehicle_id=extra.get("vehicle_id"), driver_code=extra.get("driver_code"),
                outlet_id=pili.outlet_id if extra.get("pilimathalawa") and pili else None,
            )
        )
    db.commit()


def _lines_for(rng: random.Random, items: list[Item], units: int, fixed: list[tuple[str, int]] | None = None) -> list[dict]:
    """Spread `units` across a few catalogue items so the loader has real groups to count."""
    if fixed:
        picks = [(next(i for i in items if i.sku == sku), qty) for sku, qty in fixed]
    else:
        chosen = rng.sample(items, k=min(len(items), rng.randint(3, 5)))
        weights = [rng.random() + 0.3 for _ in chosen]
        total = sum(weights)
        picks = [(it, max(1, round(units * w / total))) for it, w in zip(chosen, weights, strict=True)]
    return [
        {
            "sku": it.sku, "name": it.name, "group": it.load_group, "qty": q, "packs": max(1, math.ceil(q / it.pack_size)),
            "pack_label": it.pack_label, "temp": it.temp, "kg": round(it.kg_per_unit * q, 2), "m3": round(it.m3_per_unit * q, 4),
        }
        for it, q in picks
    ]


PILIMATHALAWA_LINES = {
    "chilled": [("MLK1", 24), ("YOG1", 36), ("CRD1", 16)],
    "ambient": [("DHL5", 10), ("RCE5", 12), ("EGG3", 8)],
}


def seed_demo_day(db: Session) -> int:
    """Create the queued orders for DEMO_SERVICE_DATE. Returns how many were created."""
    d = date.fromisoformat(settings.demo_service_date)
    if db.scalar(select(func.count()).select_from(Order)):
        return 0
    items = db.scalars(select(Item)).all()
    outlets = {o.outlet_id: o for o in db.scalars(select(Outlet))}
    pili = next((o for o in outlets.values() if o.name == "Pilimathalawa"), None)
    ukuwela = next((o for o in outlets.values() if o.name == "Ukuwela"), None)
    rng = random.Random(20261005)
    n = 92310
    created = 0
    with open(DATA_DIR / "demo_orders.csv", newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    baskets: dict[str, str] = {}
    for r in rows:
        o = outlets[r["outlet_id"]]
        pool = [i for i in items if i.brand == o.brand and i.temp == r["temp_requirement"]]
        fixed = PILIMATHALAWA_LINES[r["temp_requirement"]] if pili and o.outlet_id == pili.outlet_id else None
        lines = _lines_for(rng, pool, int(r["units"]), fixed)
        baskets.setdefault(o.outlet_id, f"G{n}")
        deferred_y = bool(int(r["deferred_yesterday"])) or bool(ukuwela and o.outlet_id == ukuwela.outlet_id)
        db.add(
            Order(
                id=f"ORD{n:07d}", outlet_id=o.outlet_id, brand=o.brand, depot=o.depot, district=o.district, service_date=d,
                temp_requirement=r["temp_requirement"], status="confirmed", weight_kg=float(r["weight_kg"]),
                volume_m3=float(r["volume_m3"]), lines=lines, group_ref=baskets[o.outlet_id],
                deferred_yesterday=deferred_y, days_since_last_served=int(r["days_since_last_served"]),
                placed_by="seed",
            )
        )
        n += 1
        created += 1
    for vid, note in WORKSHOP.items():
        db.add(VehicleStatus(vehicle_id=vid, date=d, status="workshop", note=note))
    ws = d - timedelta(days=d.weekday())
    for v in db.scalars(select(Vehicle)):
        vr = random.Random(v.vehicle_id)
        used = v.weekly_fuel_quota_l * (0.87 if v.vehicle_id == "VEH050" else vr.uniform(0.15, 0.7))
        db.add(FuelLedger(vehicle_id=v.vehicle_id, week_start=ws, litres_used=round(used, 1)))
    db.commit()
    return created


def reset_operations(db: Session) -> int:
    """Wipe everything a walkthrough creates and reseed the delivery day. Accounts and reference data stay."""
    for model in (
        Conflict, IssueReport, Receipt, DeliveryEvent, LoadLine, Deferral, Stop, Trip, Plan, Notification,
        Order, VehicleStatus, FuelLedger,
    ):
        db.execute(delete(model))
    db.commit()
    return seed_demo_day(db)


def main() -> None:
    from app.db import SessionLocal

    with SessionLocal() as db:
        seed_reference_extras(db)
        seed_users(db)
        if settings.seed_demo_day:
            made = seed_demo_day(db)
            print(f"demo day: {made} orders" if made else "demo day: already seeded")


if __name__ == "__main__":
    main()
