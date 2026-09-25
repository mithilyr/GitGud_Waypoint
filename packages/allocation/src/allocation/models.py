from dataclasses import dataclass, field
from enum import StrEnum


class DeferralReason(StrEnum):
    CAPACITY_VOLUME = "capacity_volume"
    CAPACITY_WEIGHT = "capacity_weight"
    NO_REEFER = "no_reefer"
    NO_VAN = "no_van"
    TIME_BUDGET = "time_budget"
    FUEL_QUOTA = "fuel_quota"
    MANUAL = "manual"


@dataclass(frozen=True)
class Order:
    order_ref: str
    outlet_id: str
    brand: str  # Fresh | Style | Tech
    district: str
    depot: str
    dock_type: str  # rear_dock | street | mall_bay
    parking_constraint: str  # normal | van_only | mall_dock
    temp_requirement: str  # chilled | ambient
    weight_kg: float
    volume_m3: float
    deferred_yesterday: bool = False
    days_since_last_served: int = 0


@dataclass(frozen=True)
class Vehicle:
    vehicle_id: str
    type: str  # truck | van
    temp: str  # reefer | ambient
    weight_cap_kg: float
    volume_cap_m3: float
    depot: str


@dataclass
class Trip:
    vehicle_id: str
    trip_id: int  # 1 or 2
    orders: list[Order] = field(default_factory=list)

    @property
    def brand(self) -> str | None:
        return self.orders[0].brand if self.orders else None

    @property
    def district(self) -> str | None:
        return self.orders[0].district if self.orders else None


@dataclass(frozen=True)
class Deferral:
    order: Order
    reason: DeferralReason
    note: str = ""


@dataclass
class Plan:
    trips: list[Trip] = field(default_factory=list)
    deferred: list[Deferral] = field(default_factory=list)
