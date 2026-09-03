from app.normalization.fase1 import extract_brand_term, sanitize_description


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
