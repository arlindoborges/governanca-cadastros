from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: Literal["local", "test", "production"] = "local"
    database_url: str
    cors_origins: str = "http://localhost:3000"
    import_temp_dir: str = ""
    import_max_bytes: int = 10_485_760
    import_max_rows: int = 300_000
    import_max_columns: int = 80

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_local_identity_allowed(self) -> bool:
        return self.app_env in {"local", "test"}

    @property
    def docs_enabled(self) -> bool:
        return self.app_env != "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
