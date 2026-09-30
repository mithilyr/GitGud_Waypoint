from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import current_user
from app.models import Outlet, User
from app.security import create_token, verify_password, verify_pin

router = APIRouter(prefix="/auth", tags=["auth"])


class Login(BaseModel):
    email: str
    password: str


class PinLogin(BaseModel):
    user_id: int
    pin: str


def user_json(u: User, db: Session) -> dict:
    outlet = db.get(Outlet, u.outlet_id) if u.outlet_id else None
    return {
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "role": u.role,
        "depot": u.depot,
        "dock": u.dock,
        "driver_code": u.driver_code,
        "vehicle_id": u.vehicle_id,
        "outlet": {"id": outlet.outlet_id, "name": outlet.name, "brand": outlet.brand, "district": outlet.district}
        if outlet
        else None,
    }


@router.post("/login")
def login(body: Login, db: Session = Depends(get_db)) -> dict:
    u = db.scalar(select(User).where(User.email == body.email.strip().lower()))
    if u is None or not verify_password(body.password, u.password_hash):
        raise HTTPException(401, "Email or password is wrong")
    return {"token": create_token(u.id, u.role), "user": user_json(u, db)}


@router.post("/pin-login")
def pin_login(body: PinLogin, db: Session = Depends(get_db)) -> dict:
    """Shared dock tablet (tap your name + 4-digit PIN) and driver phone unlock."""
    u = db.get(User, body.user_id)
    if u is None or u.role not in ("loader", "driver") or not verify_pin(body.pin, u.pin_hash):
        raise HTTPException(401, "That PIN is not right")
    return {"token": create_token(u.id, u.role), "user": user_json(u, db)}


@router.get("/people")
def people(role: str, depot: str, db: Session = Depends(get_db)) -> list[dict]:
    """Names on the sign-in tiles of the shared dock tablet. Only loaders are listed."""
    if role != "loader":
        raise HTTPException(403, "Only the dock tablet lists people")
    rows = db.scalars(select(User).where(User.role == "loader", User.depot == depot).order_by(User.id))
    return [{"id": u.id, "name": u.name, "dock": u.dock} for u in rows]


@router.get("/me")
def me(user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    return user_json(user, db)
