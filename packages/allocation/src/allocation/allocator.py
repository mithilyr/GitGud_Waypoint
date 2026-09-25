"""Allocation algorithm. Owner: #5.

Plan (see 02-plan/SYSTEM-ARCHITECTURE.md 3.3):
1. Priority score per order: deferred_yesterday, days_since_last_served,
   chilled Fresh, window tightness, festival ramp.
2. Group by (brand, district); split by vehicle need (van / reefer).
3. First-fit decreasing onto trips; reserve scarce vehicles (reefer vans).
4. Check time budget and trip count per vehicle (trip_time.py).
5. Leftovers -> Deferral with a DeferralReason.
Every returned Plan must pass rules.validate() with zero violations.
"""
from allocation.models import Order, Plan, Vehicle
from allocation.trip_time import TravelStandards


def allocate(orders: list[Order], vehicles: list[Vehicle], std: TravelStandards) -> Plan:
    raise NotImplementedError("allocator v1 not built yet; see module docstring")
