# Import every model module here so Alembic sees all tables.
from app.models.reference import (  # noqa: F401
    CalendarDay,
    DistrictTravel,
    Outlet,
    RoadCondition,
    ServiceAllowance,
    TrafficSpeed,
    Vehicle,
)
