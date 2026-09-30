"""Demand outlook (D4): forecast chilled demand against reefer capacity for the next two weeks.

Model, fitted on deliveries_train.csv: chilled volume = weekday average x (1 + 0.32 x festival_ramp) x (1 + 0.10 x payday).
Usable reefer capacity = reefer fleet volume x 0.35 (74% of the fleet available x 60% average fill x 80% inside the
Fresh time budget). These are planning assumptions, shown on the screen.
"""
import math
from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import CalendarDay, Vehicle
from app.services.common import is_operating

# Mean chilled m3 per operating day by weekday (Mon=0), from the training data.
BASELINE = {
    "Kandy": {0: 26.2, 1: 27.0, 2: 31.6, 3: 30.1, 4: 31.9, 5: 36.5},
    "Peliyagoda": {0: 53.1, 1: 50.2, 2: 65.5, 3: 62.9, 4: 50.6, 5: 67.4},
}
RAMP_EFFECT = 0.32
PAYDAY_EFFECT = 0.10
USABLE_SHARE = 0.35


def outlook(db: Session, start: date, days: int = 14) -> dict:
    reefer = {
        r.depot: (r.total, r.n)
        for r in db.execute(
            select(Vehicle.depot, func.sum(Vehicle.volume_cap_m3).label("total"), func.count().label("n"))
            .where(Vehicle.temp == "reefer", Vehicle.type == "truck")
            .group_by(Vehicle.depot)
        )
    }
    out_days = []
    at_risk = []
    for i in range(days):
        d = start + timedelta(days=i)
        cal = db.get(CalendarDay, d)
        ramp = cal.festival_ramp if cal else 0.0
        payday = bool(cal.is_payday) if cal else False
        row = {
            "date": d.isoformat(),
            "dow": d.strftime("%a").upper(),
            "operating": is_operating(db, d),
            "festival": cal.festival if cal else None,
            "festival_ramp": ramp,
            "payday": payday,
            "depots": {},
        }
        for depot, base in BASELINE.items():
            total, n = reefer.get(depot, (1, 1))
            cap = total * USABLE_SHARE
            demand = base.get(d.weekday(), 0) * (1 + RAMP_EFFECT * ramp) * (1 + PAYDAY_EFFECT * payday) if row["operating"] else 0
            pct = round(100 * demand / cap) if cap else 0
            row["depots"][depot] = {"demand_m3": round(demand, 1), "capacity_m3": round(cap, 1), "pct": pct}
            if pct > 100:
                truck_m3 = cap / max(n, 1)
                need = math.ceil((demand - cap) / truck_m3)
                if pct <= 115:
                    action = f"Give {min(need, n)} {depot} reefer trucks a second trip"
                elif pct <= 130:
                    action = f"Hire {need} reefer trucks for {depot}"
                else:
                    action = f"Hire {need} reefer trucks for {depot}; move Style drops to an earlier day"
                at_risk.append({"date": d.isoformat(), "depot": depot, "pct": pct, "action": action})
        out_days.append(row)
    at_risk.sort(key=lambda r: (r["date"], r["depot"]))
    peak = max((r for r in at_risk), key=lambda r: r["pct"], default=None)
    return {
        "start": start.isoformat(),
        "days": out_days,
        "at_risk": at_risk,
        "headline": (
            f"Peak day needs {peak['pct'] - 100}% more reefer capacity."
            if peak
            else "Reefer capacity covers the next two weeks."
        ),
        "assumptions": "Chilled demand = weekday average x festival ramp x payday, fitted on the training data. "
        "Usable reefer capacity = reefer fleet volume x 35% (availability x fill x Fresh time budget).",
    }
