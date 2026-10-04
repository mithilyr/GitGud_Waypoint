"""Feasibility rules for a plan (Challenge Booklet Task 2B rules 1-7).

The Hackathon engine and the Datathon notebook must both validate through
this module so the two phases can never disagree.
"""

from collections import defaultdict
from dataclasses import dataclass

from allocation.models import Plan, Vehicle
from allocation.trip_time import BUDGET_MIN, MAX_TRIPS_PER_VEHICLE, TravelStandards, budget_group, trip_minutes


@dataclass(frozen=True)
class Violation:
    rule: str
    vehicle_id: str
    trip_id: int | None
    message: str


def validate(plan: Plan, vehicles: dict[str, Vehicle], std: TravelStandards) -> list[Violation]:
    out: list[Violation] = []
    minutes_used: dict[tuple[str, str], float] = defaultdict(float)
    trips_per_vehicle: dict[str, int] = defaultdict(int)
    seen_orders: set[str] = set()

    for trip in plan.trips:
        vid, tid = trip.vehicle_id, trip.trip_id
        v = vehicles.get(vid)
        if v is None:
            out.append(Violation("unknown_vehicle", vid, tid, "vehicle not available"))
            continue
        if not trip.orders:
            continue
        trips_per_vehicle[vid] += 1

        # Rule 5: whole orders, each assigned once.
        for o in trip.orders:
            if o.order_ref in seen_orders:
                out.append(Violation("whole_orders", vid, tid, f"{o.order_ref} assigned more than once"))
            seen_orders.add(o.order_ref)

        # Rule 1: one brand and one district per trip.
        if len({o.brand for o in trip.orders}) > 1 or len({o.district for o in trip.orders}) > 1:
            out.append(Violation("brand_district", vid, tid, "trip mixes brands or districts"))

        for o in trip.orders:
            # Rule 2: chilled needs a reefer.
            if o.temp_requirement == "chilled" and v.temp != "reefer":
                out.append(Violation("refrigeration", vid, tid, f"{o.order_ref} is chilled, vehicle is {v.temp}"))
            # Rule 3: van_only needs a van.
            if o.parking_constraint == "van_only" and v.type != "van":
                out.append(Violation("vehicle_access", vid, tid, f"{o.outlet_id} is van_only"))
            # Rule 4: home depot only.
            if o.depot != v.depot:
                out.append(Violation("home_depot", vid, tid, f"{o.outlet_id} is not a {v.depot} outlet"))

        # Rule 6: weight and volume.
        kg = sum(o.weight_kg for o in trip.orders)
        m3 = sum(o.volume_m3 for o in trip.orders)
        if kg > v.weight_cap_kg:
            out.append(Violation("capacity_weight", vid, tid, f"{kg:.1f} kg > {v.weight_cap_kg} kg"))
        if m3 > v.volume_cap_m3:
            out.append(Violation("capacity_volume", vid, tid, f"{m3:.3f} m3 > {v.volume_cap_m3} m3"))

        minutes_used[(vid, budget_group(trip.orders[0].brand))] += trip_minutes(trip.orders, std)

    # Rule 7: max trips and daily time budgets.
    for vid, n in trips_per_vehicle.items():
        if n > MAX_TRIPS_PER_VEHICLE:
            out.append(Violation("max_trips", vid, None, f"{n} trips > {MAX_TRIPS_PER_VEHICLE}"))
    for (vid, group), used in minutes_used.items():
        if used > BUDGET_MIN[group]:
            out.append(Violation("time_budget", vid, None, f"{group} trips use {used:.0f} > {BUDGET_MIN[group]} min"))
    return out
