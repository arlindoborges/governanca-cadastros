from dataclasses import replace

from app.normalization.fase1 import SanitizeOptions, extract_brand_term, sanitize_description


def test_sanitize_uppercases_and_removes_accents() -> None:
    assert sanitize_description("  Feijão 1kg  ") == "FEIJAO 1 KG"


def test_sanitize_normalizes_units() -> None:
    assert sanitize_description("ARROZ 5 UND") == "ARROZ 5 UN"


def test_sanitize_repositions_known_brand() -> None:
    result = sanitize_description("MOTOSSERRA STIHL MS 180")
    assert result.endswith("STIHL")
    assert extract_brand_term(result) == "STIHL"


def test_extract_brand_from_description_without_column() -> None:
    description = sanitize_description("CORRENTE PARA MOTOSSERRA STIHL 3/8")
    assert extract_brand_term(description) == "STIHL"


def test_extract_brand_returns_none_for_ambiguous() -> None:
    assert extract_brand_term("PRODUTO GENERICO SEM MARCA") is None


def test_extract_brand_returns_none_for_multiple_brands() -> None:
    text = "FURADEIRA BOSCH E PARAFUSADEIRA MAKITA"
    assert extract_brand_term(text) is None


def test_sanitize_repositions_simple_color_without_hanging() -> None:
    result = sanitize_description("CANETA ESFEROGRAFICA AZUL")
    assert result.endswith("AZUL")
    assert "CANETA" in result
    assert "ESFEROGRAFICA" in result


def test_sanitize_basica_keeps_units_attached() -> None:
    options = SanitizeOptions.from_mode("basica")
    assert sanitize_description("  Feijão 1kg  ", options) == "FEIJAO 1KG"


def test_sanitize_original_preserves_source_text() -> None:
    options = SanitizeOptions.from_mode("original")
    assert sanitize_description("  Feijão 1kg  ", options) == "Feijão 1kg"


def test_sanitize_custom_applies_only_selected_steps() -> None:
    options = SanitizeOptions.from_mode("custom", ["grafia", "units"])
    assert sanitize_description("Caneta Azul 1kg", options) == "CANETA AZUL 1 KG"
    assert not sanitize_description("Caneta Azul 1kg", options).endswith("AZUL")


def test_sanitize_skips_grafia_when_step_disabled() -> None:
    options = SanitizeOptions.from_mode("custom", ["units"])
    assert sanitize_description("  Feijão 1kg  ", options) == "Feijão 1kg"


def test_sanitize_passo01_spaces_padrao_collapses_to_one() -> None:
    options = replace(SanitizeOptions.disabled(), spaces="padrao")
    assert sanitize_description("ARROZ    1KG", options) == "ARROZ 1KG"


def test_sanitize_passo01_spaces_manter_keeps_internal_gaps() -> None:
    options = replace(SanitizeOptions.disabled(), uppercase=True)
    assert sanitize_description("arroz    1kg", options) == "ARROZ    1KG"


def test_sanitize_passo01_accents_without_uppercase() -> None:
    options = replace(SanitizeOptions.disabled(), accents=True)
    assert sanitize_description("Feijão", options) == "Feijao"
