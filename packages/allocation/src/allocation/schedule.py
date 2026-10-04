"""Stop ETAs for a trip.

Indicative only: the hard rules live in rules.py. Arrival at stop k =
depart + depot_to_district + inter_stop * (k - 1) + service time of the
stops already served, stretched by an optional traffic factor. A mall stop
never arrives before its window opens (the vehicle waits).
"""

from dataclasses import dataclass

from allocation.models import Order, Trip
from allocation.trip_time import TravelStandards

FRESH_FIRST_DEPARTURE_MIN = 3 * 60 + 30  # 03:30
DAYTIME_FIRST_DEPARTURE_MIN = 8 * 60  # 08:00


def to_min(hhmm: str) -> int:
    h, m = hhmm.split(":")[:2]
    return int(h) * 60 + int(m)


def to_hhmm(minutes: float) -> str:
    m = int(round(minutes)) % (24 * 60)
    return f"{m // 60:02d}:{m % 60:02d}"


@dataclass(frozen=True)
class StopEta:
    order: Order
    arrive_min: float
    window_close_min: int

    @property
    def slack_min(self) -> float:
        return self.window_close_min - self.arrive_min


def sequence_stops(orders: list[Order]) -> list[Order]:
    """Visit order: earliest window close first, then earliest open."""
    return sorted(orders, key=lambda o: (to_min(o.window_close), to_min(o.window_open), o.order_ref))


def first_departure(brand: str) -> int:
    return FRESH_FIRST_DEPARTURE_MIN if brand == "Fresh" else DAYTIME_FIRST_DEPARTURE_MIN


def schedule_trip(
    orders: list[Order], std: TravelStandards, depart_min: float, traffic_factor: float = 1.0
) -> tuple[float, list[StopEta], float]:
    """Return (depart_min, stop ETAs, back-at-depot minute). Orders must already be sequenced."""
    if not orders:
        return depart_min, [], depart_min
    d = orders[0].district
    brand = orders[0].brand
    # A mall stop cannot be served before its window opens: leave later instead.
    for _ in range(3):
        t = depart_min + std.depot_to_district_min[d] * traffic_factor
        shift = 0.0
        etas: list[StopEta] = []
        for i, o in enumerate(orders):
            if i:
                t += std.inter_stop_min[d] * traffic_factor
            if o.dock_type == "mall_bay" and t < to_min(o.window_open):
                shift = max(shift, to_min(o.window_open) - t)
            etas.append(StopEta(o, t, to_min(o.window_close)))
            t += std.service_allowance_min[(brand, o.dock_type)]
        if shift == 0:
            break
        depart_min += shift
    back = t + std.depot_to_district_min[d] * traffic_factor
    return depart_min, etas, back


def schedule_vehicle(
    trips: list[Trip], std: TravelStandards, traffic_factor: float = 1.0
) -> dict[int, tuple[float, list[StopEta]]]:
    """Schedule a vehicle's trips back to back (trip 1 then trip 2).

    Trip 2 leaves when trip 1's last stop is served: the booklet's daily budgets (Fresh 270 min from 03:30,
    Style + Tech 480 min) already allow for the return leg, so the schedule must not add it again.
    """
    out: dict[int, tuple[float, list[StopEta]]] = {}
    nxt: float | None = None
    for trip in sorted(trips, key=lambda t: t.trip_id):
        if not trip.orders:
            continue
        start = first_departure(trip.orders[0].brand) if nxt is None else nxt
        dep, etas, back = schedule_trip(sequence_stops(trip.orders), std, start, traffic_factor)
        out[trip.trip_id] = (dep, etas)
        nxt = back - std.depot_to_district_min[trip.orders[0].district] * traffic_factor  # last stop served
    return out
