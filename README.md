# GitGud_Waypoint — Waypoint Delivery System

> Tech-Triathlon 2026 · Theme: *The Intelligent Enterprise*
> One system connecting **ordering → planning → loading → delivery → receipt** for Waypoint Group's four roles: Dispatcher, Loader, Driver and Store manager.

**Live demo:** _TBD (deployed URL)_ · **API docs:** `<api-url>/docs`

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

On first start the API runs migrations and seeds the reference data (120 outlets, 60 vehicles, calendar, travel standards). Reset everything with `docker compose down -v`.

## Seeded accounts

| Role | Email | Password |
|---|---|---|
| Dispatcher | _TBD_ | _TBD_ |
| Loader | _TBD_ | _TBD_ |
| Driver | _TBD_ | _TBD_ |
| Store manager | _TBD_ | _TBD_ |

## Judge walkthrough

> Numbered steps across all four roles, from planning to completed delivery. Written by the captain once the flows work.

1. _TBD_

## Repository layout

```
apps/web/              Next.js 15 PWA: /dispatcher /loader /driver /store
services/api/          FastAPI + SQLAlchemy + Alembic; seed/ loads reference CSVs
packages/allocation/   Shared Python package: trip time, feasibility rules, allocator
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
cd services/api && alembic upgrade head && python -m seed.import_csv && uvicorn app.main:app --reload

# Web, in a second terminal
cd apps/web && npm install && npm run dev
```

**Tests and lint:** `pytest packages/allocation` · `cd services/api && pytest` · `ruff check packages services/api` · `cd apps/web && npm run lint`

## Configuration

All settings come from environment variables; see [`.env.example`](.env.example).

## Design departures

See [docs/design-departures.md](docs/design-departures.md).

## AI tool disclosure

See [docs/ai-disclosure.md](docs/ai-disclosure.md).
