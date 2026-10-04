import pytest

from allocation import Order, Plan, TravelStandards, Trip, Vehicle, trip_minutes, validate

STD = TravelStandards(
    depot_to_district_min={"Gampaha": 37, "Colombo": 24},
    inter_stop_min={"Gampaha": 9, "Colombo": 8},
    service_allowance_min={("Fresh", "rear_dock"): 15, ("Fresh", "street"): 16, ("Fresh", "mall_bay"): 18},
)

REEFER_TRUCK = Vehicle("VEH014", "truck", "reefer", 4000, 20, "Peliyagoda")
DRY_TRUCK = Vehicle("VEH020", "truck", "ambient", 4000, 20, "Peliyagoda")


def order(ref, district="Gampaha", dock="rear_dock", temp="ambient", parking="normal", kg=100, m3=1.0):
    return Order(ref, f"OUT-{ref}", "Fresh", district, "Peliyagoda", dock, parking, temp, kg, m3)


def test_booklet_example_gampaha_trip_is_101_minutes():
    orders = [order("a"), order("b"), order("c", dock="street")]
    assert trip_minutes(orders, STD) == 101


def test_booklet_example_colombo_street_trip_is_112_minutes():
    orders = [order(f"c{i}", district="Colombo", dock="street") for i in range(4)]
    assert trip_minutes(orders, STD) == 112


def test_booklet_two_trip_example_is_valid():
    plan = Plan(
        trips=[
            Trip("VEH014", 1, [order("a"), order("b"), order("c", dock="street")]),
            Trip("VEH014", 2, [order(f"c{i}", district="Colombo", dock="street") for i in range(4)]),
        ]
    )
    assert validate(plan, {"VEH014": REEFER_TRUCK}, STD) == []


@pytest.mark.parametrize(
    ("trip_orders", "vehicle", "rule"),
    [
        ([order("a", temp="chilled")], DRY_TRUCK, "refrigeration"),
        ([order("a", parking="van_only")], REEFER_TRUCK, "vehicle_access"),
        ([order("a", kg=5000)], REEFER_TRUCK, "capacity_weight"),
        ([order("a", m3=25)], REEFER_TRUCK, "capacity_volume"),
        ([order("a"), order("b", district="Colombo")], REEFER_TRUCK, "brand_district"),
    ],
)
def test_each_rule_is_detected(trip_orders, vehicle, rule):
    plan = Plan(trips=[Trip(vehicle.vehicle_id, 1, trip_orders)])
    assert rule in {v.rule for v in validate(plan, {vehicle.vehicle_id: vehicle}, STD)}


def test_third_trip_is_rejected():
    plan = Plan(trips=[Trip("VEH014", i, [order(str(i))]) for i in (1, 2, 3)])
    assert "max_trips" in {v.rule for v in validate(plan, {"VEH014": REEFER_TRUCK}, STD)}


def test_fresh_budget_of_270_minutes_is_enforced():
    big = [order(str(i)) for i in range(12)]  # 37 + 9*11 + 15*12 = 316 min
    plan = Plan(trips=[Trip("VEH014", 1, big)])
    assert "time_budget" in {v.rule for v in validate(plan, {"VEH014": REEFER_TRUCK}, STD)}
