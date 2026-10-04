from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://waypoint:waypoint@localhost:5432/waypoint"
    jwt_secret: str = "dev-only-secret-change-me-0123456789abcdef"
    cors_origins: str = "http://localhost:3000"
    # The 4 PM order cutoff is shown to stores. Enforcing it would make the judge walkthrough
    # depend on the wall clock, so it is off by default (see docs/design-departures.md).
    enforce_cutoff: bool = False
    # The delivery day that the seeded demo orders are queued for (a Monday).
    demo_service_date: str = "2026-10-05"
    # First day shown on the demand outlook (two weeks before Avurudu 2026, inside the dataset horizon).
    outlook_start: str = "2026-03-30"
    seed_demo_day: bool = True

    @field_validator("database_url")
    @classmethod
    def _psycopg_driver(cls, v: str) -> str:
        # Hosts such as Render hand out plain postgres:// or postgresql:// URLs; SQLAlchemy needs the driver named.
        for prefix in ("postgres://", "postgresql://"):
            if v.startswith(prefix):
                return "postgresql+psycopg://" + v[len(prefix) :]
        return v


settings = Settings()
