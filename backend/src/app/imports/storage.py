from __future__ import annotations

import hashlib
import tempfile
from pathlib import Path
from uuid import UUID

from app.core.config import get_settings
from app.imports.parsing import looks_like_zip


def import_temp_dir() -> Path:
    settings = get_settings()
    configured = settings.import_temp_dir.strip()
    root = Path(configured) if configured else Path(tempfile.gettempdir()) / "governanca-imports"
    root.mkdir(parents=True, exist_ok=True)
    return root


def batch_temp_path(batch_id: UUID) -> Path:
    return import_temp_dir() / f"{batch_id}.xlsx"


def remove_batch_temp(batch_id: UUID) -> None:
    try:
        batch_temp_path(batch_id).unlink(missing_ok=True)
    except OSError:
        pass


def sha256_hex(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def read_upload_bytes(file_obj, max_bytes: int) -> bytes:
    content = file_obj.read(max_bytes + 1)
    if not content:
        raise ValueError("XLSX_EMPTY")
    if len(content) > max_bytes:
        raise ValueError("XLSX_TOO_LARGE")
    if not looks_like_zip(content[:4]):
        raise ValueError("XLSX_INVALID")
    return content


def write_batch_temp(batch_id: UUID, content: bytes) -> None:
    path = batch_temp_path(batch_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)


def read_temp_bytes(batch_id: UUID) -> bytes:
    path = batch_temp_path(batch_id)
    if not path.is_file():
        raise FileNotFoundError
    return path.read_bytes()
