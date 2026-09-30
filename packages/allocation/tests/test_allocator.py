from allocation import (
    DeferralReason,
    Order,
    TravelStandards,
    Vehicle,
    allocate,
    priority,
    schedule_vehicle,
    validate,
)

STD = TravelStandards(
    depot_to_district_min={"Kandy": 16, "Matale": 35},
    inter_stop_min={"Kandy": 6, "Matale": 11},
    service_allowance_min={
        ("Fresh", "rear_dock"): 15,
        ("Fresh", "street"): 16,
        ("Style", "mall_bay"): 59,
        ("Style", "rear_dock"): 38,
    },
    depot_to_district_km={"Kandy": 10, "Matale": 30},
    inter_stop_km={"Kandy": 3, "Matale": 8},
)

REEFER = Vehicle("R1", "truck", "reefer", 3000, 15, "Kandy", km_per_l=6)
DRY = Vehicle("D1", "truck", "ambient", 3000, 15, "Kandy", km_per_l=6)
VAN = Vehicle("V1", "van", "ambient", 1000, 6, "Kandy", km_per_l=10)
FLEET = {v.vehicle_id: v for v in (REEFER, DRY, VAN)}


def order(ref, kg=100, m3=1.0, temp="ambient", parking="normal", brand="Fresh", district="Kandy", **kw):
    dock = kw.pop("dock", "rear_dock")
    return Order(ref, f"OUT-{ref}", brand, district, "Kandy", dock, parking, temp, kg, m3, **kw)


def run(orders, vehicles=(REEFER, DRY, VAN), **kw):
    plan = allocate(list(orders), list(vehicles), STD, **kw)
    assert validate(plan, {v.vehicle_id: v for v in vehicles}, STD) == []
    return plan


def reasons(plan):
    return {d.order.order_ref: d.reason for d in plan.deferred}


def test_everything_fits_and_plan_is_valid():
    plan = run([order("a"), order("b"), order("c", district="Matale")])
    assert plan.deferred == []
    assert sum(len(t.orders) for t in plan.trips) == 3


def test_one_brand_and_district_per_trip():
    plan = run([order("a"), order("b", district="Matale"), order("c", brand="Style")])
    for t in plan.trips:
        assert len({(o.brand, o.district) for o in t.orders}) == 1


def test_chilled_only_on_reefer_and_van_only_only_on_van():
    plan = run([order("c", temp="chilled"), order("v", parking="van_only")])
    by_ref = {o.order_ref: t.vehicle_id for t in plan.trips for o in t.orders}
    assert by_ref == {"c": "R1", "v": "V1"}


def test_ambient_avoids_the_scarce_reefer():
    plan = run([order("a")])
    assert plan.trips[0].vehicle_id == "V1" or plan.trips[0].vehicle_id == "D1"
    assert plan.trips[0].vehicle_id != "R1"


def test_over_volume_is_deferred_with_reason():
    plan = run([order("big", m3=40), order("ok")])
    assert reasons(plan) == {"big": DeferralReason.CAPACITY_VOLUME}


def test_over_weight_is_deferred_with_reason():
    plan = run([order("heavy", kg=9000, m3=1)])
    assert reasons(plan) == {"heavy": DeferralReason.CAPACITY_WEIGHT}


def test_no_reefer_at_all():
    plan = run([order("c", temp="chilled")], vehicles=(DRY, VAN))
    assert reasons(plan) == {"c": DeferralReason.NO_REEFER}


def test_no_van_at_all():
    plan = run([order("v", parking="van_only")], vehicles=(REEFER, DRY))
    assert reasons(plan) == {"v": DeferralReason.NO_VAN}


def test_reefer_saturation_defers_the_lowest_priority_chilled_order():
    orders = [
        order("old", m3=12, temp="chilled", deferred_yesterday=True, days_since_last_served=4),
        order("new", m3=12, temp="chilled", district="Matale"),
        order("also", m3=12, temp="chilled", district="Matale"),
    ]
    plan = run(orders, vehicles=(REEFER,))
    served = {o.order_ref for t in plan.trips for o in t.orders}
    assert "old" in served  # skipped yesterday goes first
    assert len(plan.deferred) == 1
    assert plan.deferred[0].reason == DeferralReason.NO_REEFER


def test_two_trip_limit_and_time_budget_never_exceeded():
    orders = [order(f"o{i}", m3=9, district=("Kandy", "Matale")[i % 2]) for i in range(8)]
    plan = run(orders, vehicles=(DRY,))
    assert len(plan.trips) <= 2
    assert plan.deferred  # 8 x 9 m3 cannot fit two 15 m3 trips


def test_time_budget_reason():
    # 20 street stops in Matale on Fresh blow the 270 min budget of a single truck.
    orders = [order(f"o{i}", kg=10, m3=0.1, district="Matale", dock="street") for i in range(20)]
    plan = run(orders, vehicles=(DRY,))
    assert plan.deferred
    assert all(d.reason == DeferralReason.TIME_BUDGET for d in plan.deferred)


def test_fuel_quota_defers_when_vehicle_is_nearly_out():
    plan = run([order("a", district="Matale")], vehicles=(DRY,), fuel_left_l={"D1": 1.0})
    assert reasons(plan) == {"a": DeferralReason.FUEL_QUOTA}


def test_priority_orders_skipped_yesterday_first():
    assert priority(order("a", deferred_yesterday=True)) > priority(order("b", days_since_last_served=10))
    assert priority(order("c", temp="chilled")) > priority(order("d"))


def test_depot_is_respected():
    other = Order("x", "OUT-x", "Fresh", "Kandy", "Peliyagoda", "rear_dock", "normal", "ambient", 10, 1)
    plan = allocate([other], [DRY], STD)
    assert plan.trips == []
    assert len(plan.deferred) == 1


def test_schedule_waits_for_mall_window():
    mall = order("m", brand="Style", dock="mall_bay", window_open="10:30", window_close="12:30")
    plan = run([mall], vehicles=(DRY,))
    (dep, etas), = schedule_vehicle(plan.trips, STD).values()
    assert etas[0].arrive_min >= 10 * 60 + 30
    assert etas[0].slack_min > 0
    assert dep >= 8 * 60


def test_fresh_first_trip_leaves_at_0330():
    plan = run([order("a", window_close="07:30")], vehicles=(DRY,))
    (dep, _), = schedule_vehicle(plan.trips, STD).values()
    assert dep == 3 * 60 + 30
