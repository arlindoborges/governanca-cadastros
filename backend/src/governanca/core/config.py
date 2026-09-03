from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_ROOT_ENV = Path(__file__).resolve().parents[4] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(_ROOT_ENV, ".env"), extra="ignore")

    app_env: str = "local"
    database_url: str = "postgresql+psycopg://governanca:governanca_local_dev@localhost:5432/governanca_cadastros"
    cors_origins: str = "http://localhost:3000"
    import_max_bytes: int = 10 * 1024 * 1024
    import_max_rows: int = 300_000

    @property
    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
