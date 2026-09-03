from governanca.imports.columns import (
    build_header_maps,
    count_importable_records,
    normalize_header,
    resolve_column_index,
    suggest_mapping,
)


def test_normalize_header_removes_accents_and_spaces() -> None:
    assert normalize_header("Descrição Original") == "descricao_original"
    assert normalize_header("CODIGO_PRD") == "codigo_prd"


def test_suggest_mapping_finds_common_headers() -> None:
    headers = ["CODIGO_PRD", "DESCRICAO_ORIGINAL", "UNIDADE"]
    mapping = suggest_mapping(headers)
    assert mapping["source_code"] == "CODIGO_PRD"
    assert mapping["original_description"] == "DESCRICAO_ORIGINAL"
    assert mapping["original_unit"] == "UNIDADE"


def test_resolve_column_index_uses_mapped_header() -> None:
    headers = ["Código", "Descrição", "UM"]
    exact, normalized = build_header_maps(headers)
    mapping = {"original_description": "Descrição"}
    assert resolve_column_index("original_description", mapping, exact, normalized) == 1


def test_count_importable_records_ignores_empty_excel_rows() -> None:
    path = "/home/luiznicolao/governanca-cadastros/Base de Cadastro para Saneamento.xlsx"
    content = open(path, "rb").read()
    headers = ["Codigo", "Item", "Und."]
    mapping = suggest_mapping(headers)
    count = count_importable_records(content, mapping)
    assert 3700 < count < 3900
