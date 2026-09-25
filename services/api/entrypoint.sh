#!/bin/sh
set -e
alembic upgrade head
python -m seed.import_csv
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
