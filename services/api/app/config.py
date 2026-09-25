from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://waypoint:waypoint@localhost:5432/waypoint"
    jwt_secret: str = "change-me"
    cors_origins: str = "http://localhost:3000"


settings = Settings()
