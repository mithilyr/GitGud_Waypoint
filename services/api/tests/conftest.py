import os

# Tests run against in-memory SQLite so they need no Postgres (locally or in CI).
# Must be set before `app` is imported.
os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("JWT_SECRET", "test-secret")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.db import Base, engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def seeded():
    """Schema + reference CSVs + accounts + demo delivery day, once per test session."""
    import app.models  # noqa: F401
    from seed import run

    Base.metadata.create_all(engine)
    run.main()
    return True


@pytest.fixture()
def fresh(seeded):
    """The seeded demo day, reset to its starting state."""
    from sqlalchemy import select

    from app.db import SessionLocal
    from app.models import Outlet, User
    from seed.demo import reset_operations

    with SessionLocal() as db:
        reset_operations(db)
        # Tests may re-point the store manager; put the demo account back on Pilimathalawa.
        pili = db.scalar(select(Outlet).where(Outlet.name == "Pilimathalawa"))
        db.query(User).filter(User.role == "store").update({"outlet_id": pili.outlet_id})
        db.commit()
    return TestClient(app)


def login(client: TestClient, email: str) -> dict:
    r = client.post("/auth/login", json={"email": email, "password": "waypoint2026"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}
