from __future__ import annotations

from datetime import datetime
from io import BytesIO

from openpyxl import Workbook

_FIXED_TIMESTAMP = datetime(2020, 1, 1, 0, 0, 0)


def build_xlsx_bytes(rows: list[list[object]]) -> bytes:
    workbook = Workbook()
    workbook.properties.created = _FIXED_TIMESTAMP
    workbook.properties.modified = _FIXED_TIMESTAMP
    worksheet = workbook.active
    for row in rows:
        worksheet.append(row)
    buffer = BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()


def xlsx_upload(rows: list[list[object]], name: str = "cadastro.xlsx"):
    return {
        "file": (
            name,
            BytesIO(build_xlsx_bytes(rows)),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    }
