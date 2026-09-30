"""Allocation algorithm: orders -> trips on vehicles, with reasoned deferrals.

1. Priority: skipped yesterday, days since served, chilled Fresh, tight window, festival.
2. Orders are placed highest priority first, largest first within a tier
   (first-fit decreasing). An order joins an open trip of the same brand and
   district if it still fits, otherwise a new trip is opened on the smallest
   legal vehicle, which keeps big trucks and scarce reefers free.
3. Every placement is checked against capacity, temperature, van access, home
   depot, the two-trip limit, the daily time budget and the weekly fuel quota.
4. Anything left over becomes a Deferral with a reason code.
Every returned Plan passes rules.validate() with zero violations.
"""
from collections import defaultdict
from collections.abc import Iterable

from allocation.models import Deferral, DeferralReason, Order, Plan, Trip, Vehicle
from allocation.schedule import sequence_stops, to_min
from allocation.trip_time import (
    BUDGET_MIN,
    MAX_TRIPS_PER_VEHICLE,
    TravelStandards,
    budget_group,
    trip_km,
    trip_minutes,
)


def priority(o: Order) -> float:
    """Higher is planned first."""
    score = 0.0
    if o.deferred_yesterday:
        score += 1000  # never skip an outlet twice in a row
    score += 20 * min(o.days_since_last_served, 14)
    if o.brand == "Fresh" and o.temp_requirement == "chilled":
        score += 120
    elif o.brand == "Fresh":
        score += 40
    close = to_min(o.window_close)
    if close < 12 * 60:  # tight morning window
        score += (12 * 60 - close) / 6
    score += 100 * o.festival_ramp
    return score


def _vehicle_ok(o: Order, v: Vehicle) -> bool:
    if o.depot != v.depot:
        return False
    if o.temp_requirement == "chilled" and v.temp != "reefer":
        return False
    if o.parking_constraint == "van_only" and v.type != "van":
        return False
    return o.weight_kg <= v.weight_cap_kg and o.volume_m3 <= v.volume_cap_m3


def _scarcity(o: Order, v: Vehicle) -> tuple:
    """Lower sorts first: use the least valuable vehicle that works."""
    wasted_reefer = 1 if v.temp == "reefer" and o.temp_requirement != "chilled" else 0
    wasted_van = 1 if v.type == "van" and o.parking_constraint != "van_only" else 0
    return (wasted_reefer, wasted_van, v.volume_cap_m3, v.vehicle_id)


class _State:
    def __init__(self, vehicles: Iterable[Vehicle], std: TravelStandards, fuel_left_l: dict[str, float] | None):
        self.std = std
        self.vehicles = {v.vehicle_id: v for v in vehicles}
        self.trips: dict[str, list[Trip]] = defaultdict(list)
        self.fuel_left = dict(fuel_left_l or {})

    def minutes_used(self, vid: str, group: str, skip: Trip | None = None) -> float:
        return sum(
            trip_minutes(t.orders, self.std)
            for t in self.trips[vid]
            if t is not skip and t.orders and budget_group(t.orders[0].brand) == group
        )

    def fuel_used(self, vid: str, skip: Trip | None = None) -> float:
        v = self.vehicles[vid]
        if not v.km_per_l:
            return 0.0
        return sum(trip_km(t.orders, self.std) / v.km_per_l for t in self.trips[vid] if t is not skip)

    def _fuel_ok(self, v: Vehicle, skip: Trip | None, grown: list[Order]) -> bool:
        left = self.fuel_left.get(v.vehicle_id)
        if left is None or not v.km_per_l:
            return True
        return self.fuel_used(v.vehicle_id, skip=skip) + trip_km(grown, self.std) / v.km_per_l <= left + 1e-9

    def fits(self, trip: Trip, o: Order) -> DeferralReason | None:
        """None if `o` can join `trip`, else the reason it cannot."""
        v = self.vehicles[trip.vehicle_id]
        if sum(x.weight_kg for x in trip.orders) + o.weight_kg > v.weight_cap_kg:
            return DeferralReason.CAPACITY_WEIGHT
        if sum(x.volume_m3 for x in trip.orders) + o.volume_m3 > v.volume_cap_m3:
            return DeferralReason.CAPACITY_VOLUME
        grown = [*trip.orders, o]
        group = budget_group(o.brand)
        if self.minutes_used(v.vehicle_id, group, skip=trip) + trip_minutes(grown, self.std) > BUDGET_MIN[group]:
            return DeferralReason.TIME_BUDGET
        if not self._fuel_ok(v, trip, grown):
            return DeferralReason.FUEL_QUOTA
        return None

    def open_trip(self, o: Order) -> tuple[Trip | None, DeferralReason]:
        """Open a trip for `o` on the best legal vehicle, or explain why none can."""
        legal = [v for v in self.vehicles.values() if _vehicle_ok(o, v)]
        if not legal:
            return None, _no_vehicle_reason(o, self.vehicles.values())
        reason = DeferralReason.TIME_BUDGET
        for v in sorted(legal, key=lambda v: _scarcity(o, v)):
            if len(self.trips[v.vehicle_id]) >= MAX_TRIPS_PER_VEHICLE:
                continue
            group = budget_group(o.brand)
            if self.minutes_used(v.vehicle_id, group) + trip_minutes([o], self.std) > BUDGET_MIN[group]:
                continue
            if not self._fuel_ok(v, None, [o]):
                reason = DeferralReason.FUEL_QUOTA
                continue
            trip = Trip(v.vehicle_id, len(self.trips[v.vehicle_id]) + 1, [o])
            self.trips[v.vehicle_id].append(trip)
            return trip, reason
        return None, reason


def _no_vehicle_reason(o: Order, vehicles: Iterable[Vehicle]) -> DeferralReason:
    """Why no vehicle at the home depot could ever take this order."""
    home = [v for v in vehicles if v.depot == o.depot]
    chilled = o.temp_requirement == "chilled"
    van_only = o.parking_constraint == "van_only"
    if chilled and van_only and not any(v.type == "van" and v.temp == "reefer" for v in home):
        return DeferralReason.NO_REEFER if not any(v.temp == "reefer" for v in home) else DeferralReason.NO_VAN
    if chilled and not any(v.temp == "reefer" for v in home):
        return DeferralReason.NO_REEFER
    if van_only and not any(v.type == "van" for v in home):
        return DeferralReason.NO_VAN
    pool = [v for v in home if (not chilled or v.temp == "reefer") and (not van_only or v.type == "van")]
    if pool and all(o.volume_m3 <= v.volume_cap_m3 for v in pool):
        return DeferralReason.CAPACITY_WEIGHT
    return DeferralReason.CAPACITY_VOLUME


def allocate(
    orders: list[Order],
    vehicles: list[Vehicle],
    std: TravelStandards,
    fuel_left_l: dict[str, float] | None = None,
) -> Plan:
    st = _State(vehicles, std, fuel_left_l)
    deferred: list[Deferral] = []
    ranked = sorted(orders, key=lambda o: (-priority(o), -o.volume_m3, o.order_ref))

    for o in ranked:
        best: Trip | None = None
        best_key: tuple = (True, float("inf"))
        full_reason: DeferralReason | None = None
        for trips in st.trips.values():
            for t in trips:
                v = st.vehicles[t.vehicle_id]
                if (t.brand, t.district) != (o.brand, o.district) or not _vehicle_kind_ok(o, v):
                    continue
                why = st.fits(t, o)
                if why:
                    full_reason = full_reason or why
                    continue
                left = v.volume_cap_m3 - sum(x.volume_m3 for x in t.orders) - o.volume_m3
                # Prefer the trip already visiting this outlet (one visit, one delivery), then the tightest fit.
                key = (all(x.outlet_id != o.outlet_id for x in t.orders), left)
                if key < best_key:
                    best, best_key = t, key
        if best is not None:
            best.orders.append(o)
            continue
        trip, reason = st.open_trip(o)
        if trip is None:
            if reason == DeferralReason.TIME_BUDGET:
                # Suitable vehicles exist but are all used up: name the scarce resource.
                if o.temp_requirement == "chilled":
                    reason = DeferralReason.NO_REEFER
                elif o.parking_constraint == "van_only":
                    reason = DeferralReason.NO_VAN
                elif full_reason in (DeferralReason.CAPACITY_VOLUME, DeferralReason.CAPACITY_WEIGHT):
                    reason = full_reason
            deferred.append(Deferral(o, reason, NOTES[reason]))

    plan = Plan(deferred=deferred)
    for vid in sorted(st.trips):
        for t in st.trips[vid]:
            t.orders = sequence_stops(t.orders)
            plan.trips.append(t)
    return plan


def _vehicle_kind_ok(o: Order, v: Vehicle) -> bool:
    return (
        o.depot == v.depot
        and (o.temp_requirement != "chilled" or v.temp == "reefer")
        and (o.parking_constraint != "van_only" or v.type == "van")
    )


NOTES = {
    DeferralReason.CAPACITY_VOLUME: "No vehicle had enough volume left for this order.",
    DeferralReason.CAPACITY_WEIGHT: "No vehicle had enough weight capacity left for this order.",
    DeferralReason.NO_REEFER: "Chilled goods need a reefer and none was free.",
    DeferralReason.NO_VAN: "This outlet only accepts vans and none was free.",
    DeferralReason.TIME_BUDGET: "Every suitable vehicle has used its daily driving budget or both trips.",
    DeferralReason.FUEL_QUOTA: "Suitable vehicles would exceed their weekly fuel quota.",
    DeferralReason.MANUAL: "Deferred by the dispatcher.",
}
