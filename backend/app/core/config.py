from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://splitly:splitly@localhost:5432/splitly"
    sync_database_url: str = "postgresql+psycopg2://splitly:splitly@localhost:5432/splitly"
    jwt_secret: str = "change-me-to-a-long-random-string"
    jwt_lifetime_seconds: int = 86400
    receipt_storage_dir: str = "./receipts"
    avatar_storage_dir: str = "./avatars"
    public_base_url: str = "http://localhost:8000"
    frontend_base_url: str = "http://localhost:5173"
    cors_origins: str = "http://localhost:5173"

    # Optional -- receipt "AI Scan" (auto-fill amount/date/title from a photo) is
    # fully inert unless this is set. No default; never ship a real key here.
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"

    # Optional -- password-reset/verify emails are logged to the console when unset.
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from: str = "no-reply@splitly.local"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
