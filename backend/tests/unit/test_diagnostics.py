from types import SimpleNamespace

from governanca.services.pipeline import _exact_duplicate_group_codes


def _record(sanitized: str) -> SimpleNamespace:
    return SimpleNamespace(sanitized_description=sanitized)


def test_exact_duplicate_group_codes_assigns_only_multi_member_groups() -> None:
    records = [
        _record("ARROZ 5 KG"),
        _record("ARROZ 5 KG"),
        _record("FEIJAO 1 KG"),
        _record("ARROZ 5 KG"),
    ]

    codes = _exact_duplicate_group_codes(records)

    assert codes == {"ARROZ 5 KG": "DUP-EX-0001"}
    assert "FEIJAO 1 KG" not in codes
