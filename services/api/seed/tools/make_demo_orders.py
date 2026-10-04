"""Dev-time tool: derive the seeded demo delivery day from the organisers' training data.

Not run at deploy time (the training data is confidential and not in this repo). It wrote
seed/data/demo_orders.csv, which IS committed. Usage:
    python seed/tools/make_demo_orders.py ../../../04-dataset/data 2024-10-31
"""

import sys
from pathlib import Path

import pandas as pd

data_dir, day = Path(sys.argv[1]), sys.argv[2]
d = pd.read_csv(data_dir / "Training Data" / "deliveries_train.csv", parse_dates=["dispatch_date", "order_date"])
d = d[d.dispatch_status != "not_run"]
today = d[d.dispatch_date == day].copy()
hist = d[d.dispatch_date < day]
last_served = hist[hist.dispatch_status == "attempted"].groupby("outlet_id").dispatch_date.max()
prev_day = hist.dispatch_date.max()
prev_deferred = set(hist[(hist.dispatch_date == prev_day) & (hist.dispatch_status == "deferred")].outlet_id)
today["days_since_last_served"] = today.outlet_id.map(
    lambda o: max(1, (pd.Timestamp(day) - last_served.get(o, pd.Timestamp(day) - pd.Timedelta(days=2))).days)
)
today["deferred_yesterday"] = today.outlet_id.isin(prev_deferred).astype(int)
out = today[
    [
        "outlet_id",
        "depot",
        "temp_requirement",
        "order_units",
        "order_weight_kg",
        "order_volume_m3",
        "deferred_yesterday",
        "days_since_last_served",
    ]
]
out = out.rename(columns={"order_units": "units", "order_weight_kg": "weight_kg", "order_volume_m3": "volume_m3"})
dest = Path(__file__).resolve().parent.parent / "data" / "demo_orders.csv"
out.sort_values(["depot", "outlet_id", "temp_requirement"]).to_csv(dest, index=False)
print(f"{len(out)} orders -> {dest}")
print(out.groupby("depot").agg(n=("units", "size"), m3=("volume_m3", "sum"), kg=("weight_kg", "sum")))
