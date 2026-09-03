from app.normalization.engine import (
    apply_rule,
    collapse_whitespace,
    extract_raw_column,
    uppercase_text,
)


def test_collapse_whitespace_trims_and_collapses() -> None:
    assert collapse_whitespace("  Arroz   1kg  ") == "Arroz 1kg"


def test_uppercase_unit() -> None:
    assert uppercase_text("un") == "UN"


def test_apply_description_rule() -> None:
    assert apply_rule("DESCRIPTION_COLLAPSE_WHITESPACE", "  Feijão  ") == "Feijão"


def test_extract_raw_column_is_case_insensitive() -> None:
    raw = {"MARCA": "Cereal Sul", "CODIGO": "A1"}
    assert extract_raw_column(raw, "marca") == "Cereal Sul"
