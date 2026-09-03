from __future__ import annotations

import re
from decimal import Decimal

WHITESPACE_RE = re.compile(r"\s+")


def collapse_whitespace(value: str | None) -> str | None:
    if value is None:
        return None
    text = WHITESPACE_RE.sub(" ", value.strip())
    return text or None


def uppercase_text(value: str | None) -> str | None:
    if value is None:
        return None
    text = value.strip().upper()
    return text or None


def apply_rule(rule_type: str, value: str | None) -> str | None:
    if rule_type == "DESCRIPTION_COLLAPSE_WHITESPACE":
        return collapse_whitespace(value)
    if rule_type == "UNIT_UPPERCASE":
        return uppercase_text(value)
    return value


def extract_raw_column(raw_data: dict, *candidates: str) -> str | None:
    lowered = {str(key).lower(): value for key, value in raw_data.items()}
    for candidate in candidates:
        value = lowered.get(candidate.lower())
        if value is None:
            continue
        text = str(value).strip()
        if text:
            return text
    return None


def extraction_confidence(method: str) -> Decimal:
    if method == "COLUMN_MAPPING":
        return Decimal("1.0000")
    if method == "RULE_DERIVED":
        return Decimal("0.9500")
    return Decimal("0.8000")
