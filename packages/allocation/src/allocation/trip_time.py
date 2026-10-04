"""Trip duration per the Challenge Booklet (Task 2B, 'Calculate trip time').

trip_minutes = depot_to_district_freeflow_min
             + inter_stop_freeflow_min * (orders - 1)
             + sum(service_allowance_min[brand, dock_type])
The return leg is not added; the daily budgets already allow for it.
"""

from dataclasses import dataclass, field

from allocation.models import Order

MAX_TRIPS_PER_VEHICLE = 2

# Daily minutes per vehicle. Fresh trips share one budget (03:30-08:00);
# Style and Tech trips share the other (trading day).
BUDGET_MIN = {"Fresh": 270, "Style+Tech": 480}


def budget_group(brand: str) -> str:
    return "Fresh" if brand == "Fresh" else "Style+Tech"


@dataclass(frozen=True)
class TravelStandards:
    """Lookups built from district_travel.csv and service_allowance.csv."""

    depot_to_district_min: dict[str, float]
    inter_stop_min: dict[str, float]
    service_allowance_min: dict[tuple[str, str], float]  # (brand, dock_type) -> minutes
    # Optional, only needed for the weekly fuel-quota check and stop ETAs.
    depot_to_district_km: dict[str, float] = field(default_factory=dict)
    inter_stop_km: dict[str, float] = field(default_factory=dict)


def trip_minutes(orders: list[Order], std: TravelStandards) -> float:
    if not orders:
        return 0.0
    district = orders[0].district
    brand = orders[0].brand
    return (
        std.depot_to_district_min[district]
        + std.inter_stop_min[district] * (len(orders) - 1)
        + sum(std.service_allowance_min[(brand, o.dock_type)] for o in orders)
    )


def trip_km(orders: list[Order], std: TravelStandards) -> float:
    """Round-trip distance: out to the district, between stops, and back."""
    if not orders or orders[0].district not in std.depot_to_district_km:
        return 0.0
    d = orders[0].district
    return 2 * std.depot_to_district_km[d] + std.inter_stop_km.get(d, 0.0) * (len(orders) - 1)
