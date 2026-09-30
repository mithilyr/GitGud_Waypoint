"""One full delivery day through all four roles: order -> plan -> load -> deliver -> receipt."""
from datetime import datetime, timedelta

from app.db import SessionLocal
from app.models import Stop, User
from tests.conftest import login

DAY = "2026-10-05"


def _ago(minutes: int) -> str:
    """A phone timestamp from `minutes` ago, as if recorded during a signal gap."""
    return (datetime.now().astimezone() - timedelta(minutes=minutes)).isoformat()


def _q(c, headers, depot="Kandy"):
    return c.get("/dispatch/queue", headers=headers, params={"depot": depot, "date": DAY}).json()


def _live(c, headers):
    return c.get("/dispatch/live", headers=headers, params={"depot": "Kandy", "date": DAY}).json()


def test_full_walkthrough(fresh):
    c = fresh
    disp, load, drv, store = (
        login(c, "dispatcher@waypoint.demo"),
        login(c, "loader@waypoint.demo"),
        login(c, "driver@waypoint.demo"),
        login(c, "store@waypoint.demo"),
    )

    # Store manager places an order before the cutoff.
    home = c.get("/store/home", headers=store).json()
    assert home["outlet"]["name"] == "Pilimathalawa"
    cat = c.get("/store/catalog", headers=store).json()
    assert any(i["temp"] == "chilled" for i in cat)
    placed = c.post("/store/orders", headers=store, json={"lines": [{"sku": "MLK1", "qty": 12}, {"sku": "DHL5", "qty": 4}]})
    assert placed.status_code == 200, placed.text
    assert len(placed.json()["orders"]) == 2  # one chilled, one ambient

    # Dispatcher sees the queue and builds the plan; demand exceeds capacity so some orders are deferred.
    q = _q(c, disp)
    assert q["total"] >= 58 and q["chilled"] > 0 and q["skipped"] >= 1
    board = c.post("/dispatch/plan", headers=disp, json={"depot": "Kandy", "date": DAY}).json()
    assert board["plan"]["status"] == "draft"
    assert board["summary"]["orders_served"] > 0
    assert board["summary"]["orders_served"] + board["summary"]["orders_deferred"] == q["total"]
    assert board["summary"]["blocking"] == 0, "the engine's own plan must have no blocking warnings"
    assert "VEH043" in {v["vehicle_id"] for v in board["vehicles"] if not v["available"]}
    assert board["deferred"], "with reefers in the workshop, demand exceeds capacity"
    assert all(d["reason"] for d in board["deferred"])
    assert {d["reason"] for d in board["deferred"]} <= {"no_reefer", "capacity_volume", "time_budget"}

    plan_id = board["plan"]["id"]
    released = c.post(f"/dispatch/plan/{plan_id}/release", headers=disp)
    assert released.status_code == 200, released.text
    assert released.json()["plan"]["status"] == "released"

    # Loader: departures, load list in reverse stop order, flag a shortfall, release.
    deps = c.get("/loader/departures", headers=load).json()
    mine = next(t for t in deps["trips"] if t["vehicle_id"] == "VEH041")
    detail = c.get(f"/loader/trips/{mine['trip_id']}", headers=load).json()
    seqs = [s["seq"] for s in detail["stops"]]
    assert seqs == sorted(seqs, reverse=True)
    assert detail["total"] > 0

    lines = [ln for s in detail["stops"] for ln in s["lines"]]
    flag_line = next(ln for ln in lines if ln["planned"] >= 2)
    r = c.post(f"/loader/lines/{flag_line['id']}/flag", headers=load, json={"found": flag_line["planned"] - 1, "reason": "not_in_stock"})
    assert r.status_code == 200, r.text
    for ln in lines:
        if ln["id"] != flag_line["id"]:
            assert c.post(f"/loader/lines/{ln['id']}/load", headers=load, json={"loaded": True}).status_code == 200
    flag = next(n for n in _live(c, disp)["needs_you"] if n["type"] == "flag")
    assert c.post(f"/dispatch/flags/{flag['id']}/answer", headers=disp, json={"answer": "send_as_is"}).status_code == 200
    rel = f"/loader/trips/{mine['trip_id']}/release"
    assert c.post(rel, headers=load, json={"reefer_temp": 9, "seal_no": "KD-44817"}).status_code == 422  # warm reefer
    ok = c.post(rel, headers=load, json={"reefer_temp": 3, "seal_no": "KD-44817"})
    assert ok.status_code == 200, ok.text

    # Driver: run, start, arrive, deliver (uploaded late, as after a signal gap); a retry is idempotent.
    run = c.get("/driver/run", headers=drv).json()
    trip = next(t for t in run["trips"] if t["trip_id"] == mine["trip_id"])
    assert trip["checks"]["load_released"] and trip["checks"]["seal_no"] == "KD-44817"
    s1 = next(s for s in trip["stops"] if not s["removed"])
    tid = trip["trip_id"]
    events = [
        {"client_uuid": "evt-start-0001", "kind": "trip_start", "trip_id": tid, "device_ts": _ago(120)},
        {"client_uuid": "evt-arr-00001", "kind": "arrive", "trip_id": tid, "stop_id": s1["id"], "device_ts": _ago(100)},
        {
            "client_uuid": "evt-del-00001",
            "kind": "deliver",
            "trip_id": tid,
            "stop_id": s1["id"],
            "device_ts": _ago(80),
            "payload": {
                "outcome": "delivered",
                "items": [{"group": i["group"], "handed": i["expected"]} for i in s1["items"]],
                "signed_by": "S. Perera",
            },
        },
    ]
    first = c.post("/sync", headers=drv, json={"events": events}).json()
    assert [r["status"] for r in first["results"]] == ["applied"] * 3
    again = c.post("/sync", headers=drv, json={"events": events}).json()
    assert [r["status"] for r in again["results"]] == ["duplicate"] * 3
    stops_now = next(t for t in again["run"]["trips"] if t["trip_id"] == tid)["stops"]
    assert next(s for s in stops_now if s["id"] == s1["id"])["status"] in ("delivered", "partial")

    # The live board lists records that arrived long after they happened as "what happened offline".
    row = next(r for r in _live(c, disp)["runs"] if r["trip_id"] == tid)
    assert row["status"] == "out" and row["progress"]["done"] == 1
    assert row["offline"]

    # Store manager of that stop confirms with a different count: a conflict reaches the dispatcher.
    with SessionLocal() as db:
        store_user = db.query(User).filter(User.role == "store").one()
        store_user.outlet_id = db.get(Stop, s1["id"]).outlet_id
        db.commit()
    track = c.get("/store/track", headers=store).json()
    d = next(d for d in track["deliveries"] if d["stop"] and d["stop"]["id"] == s1["id"])
    lines_in = [{"group": ln["group"], "received": (ln["handed"] or 0) + (1 if i == 0 else 0)} for i, ln in enumerate(d["stop"]["lines"])]
    conf = c.post(f"/store/stops/{s1['id']}/confirm", headers=store, json={"lines": lines_in})
    assert conf.status_code == 200, conf.text
    assert conf.json()["conflicts"] == 1
    count = next(n for n in _live(c, disp)["needs_you"] if n["type"] == "count")
    assert count["driver_count"] + 1 == count["store_count"]
    assert c.post(f"/dispatch/conflicts/{count['id']}/resolve", headers=disp, json={"action": "accept_store"}).status_code == 200
    assert not [n for n in _live(c, disp)["needs_you"] if n["type"] == "count"]


def test_roles_are_enforced(fresh):
    c = fresh
    store = login(c, "store@waypoint.demo")
    assert c.get("/dispatch/queue", headers=store, params={"depot": "Kandy", "date": DAY}).status_code == 403
    assert c.get("/loader/departures").status_code == 401
    assert c.post("/auth/login", json={"email": "loader@waypoint.demo", "password": "nope"}).status_code == 401


def test_pin_login_for_dock_tablet(fresh):
    c = fresh
    people = c.get("/auth/people", params={"role": "loader", "depot": "Kandy"}).json()
    kamal = next(p for p in people if p["name"].startswith("Kamal"))
    assert c.post("/auth/pin-login", json={"user_id": kamal["id"], "pin": "1234"}).status_code == 200
    assert c.post("/auth/pin-login", json={"user_id": kamal["id"], "pin": "9999"}).status_code == 401


def test_manual_move_and_defer_keep_warnings_honest(fresh):
    c = fresh
    disp = login(c, "dispatcher@waypoint.demo")
    board = c.post("/dispatch/plan", headers=disp, json={"depot": "Kandy", "date": DAY}).json()
    pid = board["plan"]["id"]
    chilled = next(o for o in _q(c, disp)["orders"] if o["temp"] == "chilled" and o["status"] == "planned")
    truck = next(v for v in board["vehicles"] if v["available"] and v["temp"] == "ambient" and v["type"] == "truck")
    moved = c.post(f"/dispatch/plan/{pid}/move", headers=disp, json={"order_id": chilled["id"], "vehicle_id": truck["vehicle_id"]}).json()
    row = next(v for v in moved["vehicles"] if v["vehicle_id"] == truck["vehicle_id"])
    assert any(w["rule"] == "refrigeration" and w["severity"] == "red" for w in row["warnings"])
    assert moved["summary"]["blocking"] >= 1
    assert c.post(f"/dispatch/plan/{pid}/release", headers=disp).status_code == 422
    fixed = c.post(f"/dispatch/plan/{pid}/defer", headers=disp, json={"order_id": chilled["id"], "reason": "no_reefer"}).json()
    assert fixed["summary"]["blocking"] == 0
    assert any(d["order_id"] == chilled["id"] and d["reason"] == "no_reefer" for d in fixed["deferred"])


def test_demand_outlook_flags_peak_days(fresh):
    c = fresh
    disp = login(c, "dispatcher@waypoint.demo")
    o = c.get("/dispatch/demand", headers=disp).json()
    assert len(o["days"]) == 14
    assert o["at_risk"], "the week before Avurudu must exceed reefer capacity somewhere"
