# waypoint-allocation

The one place the fleet feasibility rules live. Used by:
- `services/api` (Hackathon planning engine)
- the Datathon Task 2B notebook (`pip install -e packages/allocation`)

| Module | Status | Contents |
|---|---|---|
| `models.py` | ✅ | `Order`, `Vehicle`, `Trip`, `Plan`, `Deferral`, reason codes |
| `trip_time.py` | ✅ | Booklet trip-time formula + Fresh 270 / Style+Tech 480 budgets |
| `rules.py` | ✅ | `validate(plan, ...)` → list of violations (booklet 2B rules 1–7) |
| `allocator.py` | 🚧 owner #5 | `allocate(...)` → `Plan` with served trips + deferred orders |

The rules must stay identical to `04-dataset/check_allocation.py`, which is in the team workspace, not in this repo.

```bash
pip install -e "packages/allocation[dev]"
pytest packages/allocation
```
