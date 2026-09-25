from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Outlet, Vehicle

router = APIRouter(prefix="/reference", tags=["reference"])


@router.get("/outlets")
def list_outlets(db: Session = Depends(get_db)) -> list[dict]:
    rows = db.scalars(select(Outlet).order_by(Outlet.outlet_id)).all()
    return [{c.name: getattr(r, c.name) for c in Outlet.__table__.columns} for r in rows]


@router.get("/vehicles")
def list_vehicles(db: Session = Depends(get_db)) -> list[dict]:
    rows = db.scalars(select(Vehicle).order_by(Vehicle.vehicle_id)).all()
    return [{c.name: getattr(r, c.name) for c in Vehicle.__table__.columns} for r in rows]
