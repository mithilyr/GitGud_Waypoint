# Import every model module here so Alembic sees all tables.
from app.models.ops import (  # noqa: F401
    Conflict,
    Deferral,
    DeliveryEvent,
    FuelLedger,
    IssueReport,
    Item,
    LoadLine,
    Notification,
    Order,
    Plan,
    Receipt,
    Stop,
    Trip,
    User,
    VehicleStatus,
)
from app.models.reference import (  # noqa: F401
    CalendarDay,
    DistrictTravel,
    Outlet,
    RoadCondition,
    ServiceAllowance,
    TrafficSpeed,
    Vehicle,
)
