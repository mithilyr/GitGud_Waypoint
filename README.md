# GitGud_Waypoint — Waypoint Delivery System

> Tech-Triathlon 2026 · Hackathon · Theme: *The Intelligent Enterprise*
> One system connecting **order → plan → load → deliver → receipt** for Waypoint Group's four roles: Dispatcher, Loader, Driver and Store manager.

**Live demo:** _TBD (deployed URL)_ · **API docs:** `<api-url>/docs`
**Design:** the submitted Designathon file (Penpot). Every departure is listed in [docs/design-departures.md](docs/design-departures.md).

## Quick start

```bash
cp .env.example .env
docker compose up --build
```

| Service | URL |
|---|---|
| Web app | http://localhost:3000 |
| API + Swagger docs | http://localhost:8000/docs |
| Health check | http://localhost:8000/health |
| Postgres | localhost:5432 (user/pass/db: `waypoint`) |

On first start the API runs the migrations, seeds the reference data (120 outlets, 60 vehicles, calendar, travel standards), the four accounts, the product catalogue and **one realistic delivery day**: 151 real orders (58 for Kandy) queued for **Mon 5 Oct 2026**, with four Kandy reefer trucks in the workshop so demand exceeds capacity. Reset everything with `docker compose down -v`, or without restarting from the dispatcher menu → **Reset the demo day**.

If a port is taken, set `API_PORT`, `WEB_PORT` or `DB_PORT` in `.env`.

## Seeded accounts

Password for all: **`waypoint2026`**

| Role | Email | Also |
|---|---|---|
| Dispatcher (Ruwan) | `dispatcher@waypoint.demo` | Desktop |
| Loader (Kamal) | `loader@waypoint.demo` | Dock tablet: open `/loader`, tap **Kamal**, PIN **1234** (Tharindu 2345, Fathima 3456, Suresh 4567) |
| Driver (Nuwan) | `driver@waypoint.demo` | Phone: first sign-in by email, then you choose a 4-digit PIN on the device. A second driver, `driver2@waypoint.demo` (Mahesh), carries the store's dry order |
| Store manager (Shanika, Pilimathalawa) | `store@waypoint.demo` | Phone or desktop |

## Judge walkthrough (about 10 minutes, all four roles)

Use two browser windows: one desktop-wide for the dispatcher, one phone-sized (DevTools → 390×844) for the others. Use a separate profile or a private window per role, because the browser keeps one sign-in per profile.

1. **Store manager places an order.** Sign in as `store@waypoint.demo`. The Order tab is filled with Pilimathalawa's usual lines. Tap **Place order**. You get *"Ruwan has your order"* and two order IDs: chilled and dry are separate orders, as in the dataset.
2. **Dispatcher reviews the queue.** Sign in as `dispatcher@waypoint.demo` → **Orders**. About 60 orders are queued; Ukuwela is flagged *Skipped last run* and is planned first. Chilled, van-only and mall-window orders are marked.
3. **Dispatcher builds the plan.** **Build Monday's plan.** The engine assigns every order to a vehicle and trip and **defers what does not fit, each with a reason** (here "No reefer", because reefer trucks are in the workshop). The board shows volume and weight bars, weekly fuel left, and warnings in plain words.
4. **Dispatcher edits and defers.** Open any vehicle row. **Move to…** another vehicle: moving a chilled order onto a dry truck turns the row red (*Chilled load needs a reefer*) and blocks release. **Defer** an order: pick a reason; if the outlet was skipped last run a red banner says so. Fix the warning (defer it back), then **Release plan**.
5. **Store gets the deferral.** In the store window, **Track** shows any deferred order with its reason and new date; a push banner appears on the phone.
6. **Loader loads.** Open `/loader`, tap **Kamal**, PIN **1234**. **Departures** lists vehicles in departure order. Open the vehicle Nuwan drives (the store's truck). The load list runs in **reverse stop order**. **Load all** on a stop, and on another line tap **Flag** → count found, a reason, send. The dispatcher's **Live** tab shows *Needs your decision*; answer **Send as is**. Back on the loader, **Release** needs every line loaded or flagged, the reefer temperature (try 9 °C to see it refuse), and a seal number.
7. **Driver goes offline and delivers.** Open `/driver` on the phone window. Sign in (**Fill the demo driver account**), choose a PIN twice. Run tab: *Load released · Kamal, Dock 3*. Tick *Tyres, lights and doors*, **Start trip**. Then **Help → Simulate no signal**. Stops tab → open the store's stop → **I've arrived** → **Mark delivered** → choose **Partial**, lower one count, enter "S. Perera", **Save stop**. The banner says *Offline. Keep going*, and the **Sync** tab shows the records as *Not sent*.
8. **Signal returns.** Help → turn the switch off. Within seconds the outbox drains, records keep their phone times, and the dispatcher's **Live** board lists them under *What happened offline*.
9. **Store confirms with a different count.** In the store window, **Track** → the delivery shows the driver's proof. Raise one count with **+** and **Confirm receipt**. Neither count is overwritten: the dispatcher's Live tab shows *Needs your decision* with both counts, and the driver's Sync tab shows *Needs your answer* (**Dispute** or **Accept**). The dispatcher settles it with **Accept …**.
10. **(Optional) Plan changes mid-load.** With a vehicle half loaded, in the dispatcher's **Plan** open its row and move a stop to another vehicle. The loader sees **Plan changed** with exactly what to add and take off, and must tap **Show updated list**; the driver gets a *Plan changed* notice.
11. **(Optional) Demand outlook.** Dispatcher → **Demand**: two weeks of chilled demand against reefer capacity before Avurudu, with the days at risk and an action for each.

A single automated test walks steps 1–9 through the API: `services/api/tests/test_walkthrough.py`.

## Repository layout

```
apps/web/              Next.js 15 PWA: /dispatcher /loader /driver /store
services/api/          FastAPI + SQLAlchemy + Alembic; seed/ loads reference CSVs and the demo day
packages/allocation/   Pure-Python rules, allocator, trip time and stop scheduling (shared with Datathon 2B)
docs/                  architecture · data model · AI disclosure · design departures
docker-compose.yml     db + api + web
```

## Local development (without Docker)

```bash
# Python (API + allocation), from the repo root
python -m venv .venv
.venv/Scripts/activate            # Windows  (macOS/Linux: source .venv/bin/activate)
pip install -e "packages/allocation[dev]" -r services/api/requirements-dev.txt
docker compose up -d db           # just the database
cd services/api && alembic upgrade head && python -m seed.run && uvicorn app.main:app --reload

# Web, in a second terminal (put API_INTERNAL_URL=http://localhost:8000 in apps/web/.env.local)
cd apps/web && npm install && npm run dev
```

**Tests and lint:** `pytest packages/allocation` · `cd services/api && pytest` (in-memory SQLite, no Postgres needed) · `ruff check packages services/api` · `cd apps/web && npm run lint && npx tsc --noEmit && npm run build`

## What the system does

- **Planning and allocation** (`packages/allocation`): priority scoring (skipped last run first), first-fit decreasing onto the smallest legal vehicle, and every constraint: weight **and** volume, chilled → reefer only, van-only outlets, mall windows for stop timing, home depot, two trips per vehicle per day, Fresh ≤ 270 min and Style + Tech ≤ 480 min, weekly fuel quota. Anything that does not fit is **deferred with a reason code**, and the plan is re-validated on every edit. On the organisers' peak-day scenario the allocator's output passes `check_allocation.py`.
- **Explainable deferrals**: the dispatcher sees the reason; the store sees it in plain words with the new date, and deferred outlets go first next run.
- **Offline driver**: IndexedDB outbox, PIN unlock with no network, idempotent `POST /sync`, conflicts kept side by side, installable PWA.
- **Operable end to end**: one unbroken flow through all four roles, with the seeded day.
- **Two design systems**: Daylight and Dark, following the style guide; phone-first for driver, loader and store.

Architecture, data model and diagrams: [docs/architecture.md](docs/architecture.md), [docs/data-model.md](docs/data-model.md).

## Configuration

All settings come from environment variables; see [`.env.example`](.env.example).

| Variable | Default | Meaning |
|---|---|---|
| `DEMO_SERVICE_DATE` | `2026-10-05` | The delivery day queued by the seed |
| `ENFORCE_CUTOFF` | `false` | Enforce the 4 PM order cutoff against the clock |
| `JWT_SECRET` | dev value | **Change in production** |
| `API_INTERNAL_URL` (web) | `http://api:8000` | Where Next forwards `/api/*` |

## Design departures

See [docs/design-departures.md](docs/design-departures.md).

## AI tool disclosure

See [docs/ai-disclosure.md](docs/ai-disclosure.md).
