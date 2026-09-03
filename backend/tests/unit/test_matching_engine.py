from decimal import Decimal

from app.matching.engine import build_record_matching, compare_records, lexical_score


def test_lexical_score_identical_descriptions() -> None:
    score = lexical_score("Arroz 1kg", "Arroz 1kg")
    assert score == Decimal("1")


def test_compare_records_equivalent_pair() -> None:
    compared = compare_records(
        source_description="Arroz 1kg",
        candidate_description="Arroz 1kg",
        source_attributes={"CADASTRE_UNIT": "UN", "BRAND": "Marca A"},
        candidate_attributes={"CADASTRE_UNIT": "UN", "BRAND": "Marca A"},
    )
    assert compared is not None
    assert compared.relationship_class == "EQUIVALENT"
    assert compared.overall_score >= Decimal("0.92")


def test_compare_records_unit_blocker_marks_similar() -> None:
    compared = compare_records(
        source_description="Arroz 1kg",
        candidate_description="Arroz 1kg",
        source_attributes={"CADASTRE_UNIT": "UN", "BRAND": "Marca A"},
        candidate_attributes={"CADASTRE_UNIT": "KG", "BRAND": "Marca A"},
    )
    assert compared is not None
    assert compared.relationship_class == "SIMILAR"
    assert compared.has_blocker is True


def test_build_record_matching_pending_information_skips_candidates() -> None:
    draft = build_record_matching(
        source_record_id="a",
        source_description="Feijão",
        source_status="PENDING_INFORMATION",
        source_attributes={},
        candidate_records=[("b", "Feijão", {"CADASTRE_UNIT": "KG"})],
    )
    assert draft.result == "PENDING_INFORMATION"
    assert draft.candidate_count == 0


def test_build_record_matching_keeps_only_max_candidates() -> None:
    candidates = [
        (str(index), f"Arroz tipo {index} 1kg", {"CADASTRE_UNIT": "UN", "BRAND": "Marca A"})
        for index in range(30)
    ]
    draft = build_record_matching(
        source_record_id="source",
        source_description="Arroz tipo 1 1kg",
        source_status="NORMALIZED",
        source_attributes={"CADASTRE_UNIT": "UN", "BRAND": "Marca A"},
        candidate_records=candidates,
        configuration={"max_candidates": 5},
    )
    assert draft.candidate_count == 5
    assert len(draft.candidates) == 5
    scores = [item.overall_score for item in draft.candidates]
    assert scores == sorted(scores, reverse=True)
