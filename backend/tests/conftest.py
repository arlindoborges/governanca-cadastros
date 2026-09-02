from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")
os.environ["APP_ENV"] = "test"

from app.core.config import get_settings  # noqa: E402

get_settings.cache_clear()
