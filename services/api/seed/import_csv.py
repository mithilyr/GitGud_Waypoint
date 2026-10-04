"""Load the shared reference CSVs into Postgres.

Idempotent: a table that already has rows is skipped, so this is safe to run
on every container start. Run with: python -m seed.import_csv
"""

import csv
from datetime import date
from pathlib import Path

from sqlalchemy import func, select

from app.db import SessionLocal
from app.models import (
    CalendarDay,
    DistrictTravel,
    Outlet,
    RoadCondition,
    ServiceAllowance,
    TrafficSpeed,
    Vehicle,
)

DATA_DIR = Path(__file__).parent / "data"

# (CSV file, model). Order matters only for readability; there are no FKs yet.
TABLES = [
    ("outlets.csv", Outlet),
    ("vehicles.csv", Vehicle),
    ("calendar.csv", CalendarDay),
    ("district_travel.csv", DistrictTravel),
    ("service_allowance.csv", ServiceAllowance),
    ("traffic_speed.csv", TrafficSpeed),
    ("road_conditions.csv", RoadCondition),
]


def _coerce(model, row: dict[str, str]) -> dict:
    out = {}
    for col in model.__table__.columns:
        raw = row.get(col.name, "")
        if raw == "":
            out[col.name] = None
            continue
        py_type = col.type.python_type
        if py_type is date:
            out[col.name] = date.fromisoformat(raw)
        elif py_type is int:
            out[col.name] = int(float(raw))
        elif py_type is float:
            out[col.name] = float(raw)
        else:
            out[col.name] = raw
    return out


def main() -> None:
    with SessionLocal() as db:
        for filename, model in TABLES:
            if db.scalar(select(func.count()).select_from(model)):
                print(f"skip {model.__tablename__}: already seeded")
                continue
            with open(DATA_DIR / filename, newline="", encoding="utf-8") as f:
                rows = [_coerce(model, r) for r in csv.DictReader(f)]
            db.bulk_insert_mappings(model, rows)
            db.commit()
            print(f"seeded {model.__tablename__}: {len(rows)} rows")


if __name__ == "__main__":
    main()
