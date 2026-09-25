import os

# Tests run against in-memory SQLite so they need no Postgres (locally or in CI).
# Must be set before `app` is imported.
os.environ.setdefault("DATABASE_URL", "sqlite://")
