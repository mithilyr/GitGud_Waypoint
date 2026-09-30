"""operational tables, outlet display name

Revision ID: 0002
Revises: 0001
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

OPS_TABLES = [
    "app_user", "item", "customer_order", "plan", "trip", "stop", "load_line", "deferral",
    "delivery_event", "receipt", "issue_report", "conflict", "notification", "vehicle_status", "fuel_ledger",
]


def upgrade() -> None:
    from app.db import Base
    import app.models  # noqa: F401

    op.add_column("outlet", sa.Column("name", sa.String(length=48), nullable=True))
    bind = op.get_bind()
    Base.metadata.create_all(bind, tables=[Base.metadata.tables[t] for t in OPS_TABLES])


def downgrade() -> None:
    from app.db import Base
    import app.models  # noqa: F401

    bind = op.get_bind()
    Base.metadata.drop_all(bind, tables=[Base.metadata.tables[t] for t in reversed(OPS_TABLES)])
    op.drop_column("outlet", "name")
