from pathlib import Path


def safe_file_name(raw_name: str | None) -> str:
    base = Path(raw_name or "arquivo.xlsx").name.replace("\x00", "").strip()
    if not base or base in {".", ".."}:
        return "arquivo.xlsx"
    return base[:255]


def assert_xlsx_file_name(file_name: str) -> None:
    if not file_name.lower().endswith(".xlsx"):
        raise ValueError("XLSX_EXTENSION_REQUIRED")
