from app.imports.filenames import assert_xlsx_file_name, safe_file_name
from app.imports.parsing import (
    mapping_from_headers,
    parse_headers,
    parse_headers_and_rows,
    row_issues,
)
from app.imports.storage import sha256_hex
from helpers.spreadsheet import build_xlsx_bytes


def test_safe_file_name_uses_basename() -> None:
    assert safe_file_name(r"..\..\..\etc\passwd.xlsx") == "passwd.xlsx"
    assert safe_file_name("C:/tmp/cadastro.xlsx") == "cadastro.xlsx"
    assert safe_file_name(None) == "arquivo.xlsx"


def test_xlsx_extension_is_required() -> None:
    try:
        assert_xlsx_file_name("planilha.csv")
        raise AssertionError("extensão csv deveria ser rejeitada")
    except ValueError as exc:
        assert str(exc) == "XLSX_EXTENSION_REQUIRED"


def test_parse_xlsx_ignores_trailing_empty_header_columns() -> None:
    content = build_xlsx_bytes(
        [
            ["DESCRICAO_ORIGINAL", None, None],
            ["Parafuso sextavado", None, None],
        ]
    )
    headers, rows = parse_headers_and_rows(content)
    assert headers == ["DESCRICAO_ORIGINAL"]
    assert rows[0]["DESCRICAO_ORIGINAL"] == "Parafuso sextavado"


def test_parse_xlsx_and_row_issues() -> None:
    content = build_xlsx_bytes(
        [
            ["CODIGO", "DESCRICAO", "UNIDADE"],
            ["A1", "Arroz", "UN"],
            ["", "Feijão", "KG"],
        ]
    )
    headers, rows = parse_headers_and_rows(content)
    assert headers == ["CODIGO", "DESCRICAO", "UNIDADE"]
    assert parse_headers(content) == headers
    assert rows[0]["CODIGO"] == "A1"
    assert row_issues("A1", "Arroz", "UN") == []
    assert row_issues(None, "Feijão", "KG") == ["MISSING_SOURCE_CODE"]


def test_mapping_rejects_unknown_column() -> None:
    try:
        mapping_from_headers(
            ["CODIGO", "DESCRICAO", "UNIDADE"],
            {
                "source_code": "CODIGO",
                "original_description": "DESCRICAO",
                "original_unit": "UNID",
            },
        )
        raise AssertionError("coluna inexistente deveria falhar")
    except LookupError as exc:
        assert exc.args[0] == "original_unit"


def test_sha256_is_stable() -> None:
    assert sha256_hex(b"abc") == "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
