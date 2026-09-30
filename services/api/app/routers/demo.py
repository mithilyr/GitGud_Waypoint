from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.deps import current_user
from app.models import User

router = APIRouter(prefix="/demo", tags=["demo"])


@router.get("/info")
def info() -> dict:
    return {
        "service_date": settings.demo_service_date,
        "accounts": [
            {"role": "Dispatcher", "email": "dispatcher@waypoint.demo", "password": "waypoint2026"},
            {"role": "Loader", "email": "loader@waypoint.demo", "password": "waypoint2026", "pin": "1234"},
            {"role": "Driver", "email": "driver@waypoint.demo", "password": "waypoint2026", "pin": "set on the phone"},
            {"role": "Store manager", "email": "store@waypoint.demo", "password": "waypoint2026"},
        ],
    }


@router.post("/reset")
def reset(_: User = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    """Wipe the walkthrough's data and queue the demo delivery day again. Any signed-in user may do this."""
    from seed.demo import reset_operations

    return {"orders": reset_operations(db)}
