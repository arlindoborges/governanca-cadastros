from __future__ import annotations

import heapq
import re
from dataclasses import dataclass
from decimal import Decimal

MATCHING_ALGORITHM_VERSION = "lexical-v1"
DEFAULT_CONFIGURATION: dict[str, float | int] = {
    "lexical_weight": 0.6,
    "attribute_weight": 0.4,
    "equivalent_threshold": 0.92,
    "similar_threshold": 0.7,
    "min_candidate_score": 0.5,
    "max_candidates": 5,
}
BLOCKER_ATTRIBUTE_CODES = ("CADASTRE_UNIT",)
COMPARABLE_ATTRIBUTE_CODES = ("CADASTRE_UNIT", "BRAND")


@dataclass(frozen=True)
class EvidenceDraft:
    attribute_code: str | None
    evidence_type: str
    evidence_source: str
    source_value: str | None
    candidate_value: str | None
    result: str
    is_blocker: bool
    score: Decimal | None
    description: str


@dataclass(frozen=True)
class CandidateDraft:
    candidate_source_record_id: str
    lexical_score: Decimal
    attribute_score: Decimal
    overall_score: Decimal
    relationship_class: str
    confidence_level: str
    has_blocker: bool
    evidences: tuple[EvidenceDraft, ...]


@dataclass(frozen=True)
class RecordMatchingDraft:
    result: str
    confidence_level: str | None
    candidate_count: int
    has_blocker: bool
    requires_review: bool
    candidates: tuple[CandidateDraft, ...]


def tokenize(text: str | None) -> set[str]:
    if not text:
        return set()
    normalized = re.sub(r"[^\w\s]", " ", text.lower())
    return {token for token in normalized.split() if token}


def lexical_score(left: str | None, right: str | None) -> Decimal:
    left_tokens = tokenize(left)
    right_tokens = tokenize(right)
    if not left_tokens or not right_tokens:
        return Decimal("0")
    intersection = len(left_tokens & right_tokens)
    union = len(left_tokens | right_tokens)
    if union == 0:
        return Decimal("0")
    return Decimal(intersection) / Decimal(union)


def confidence_from_score(score: Decimal) -> str:
    if score >= Decimal("0.92"):
        return "HIGH"
    if score >= Decimal("0.75"):
        return "MEDIUM"
    return "LOW"


def _normalize_value(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def compare_records(
    *,
    source_description: str | None,
    candidate_description: str | None,
    source_attributes: dict[str, str],
    candidate_attributes: dict[str, str],
    configuration: dict[str, float | int] | None = None,
) -> CandidateDraft | None:
    config = {**DEFAULT_CONFIGURATION, **(configuration or {})}
    lexical = lexical_score(source_description, candidate_description)
    lexical_weight = Decimal(str(config["lexical_weight"]))
    attribute_weight = Decimal(str(config["attribute_weight"]))
    min_candidate_score = Decimal(str(config["min_candidate_score"]))
    similar_threshold = Decimal(str(config["similar_threshold"]))
    equivalent_threshold = Decimal(str(config["equivalent_threshold"]))

    evidences: list[EvidenceDraft] = []
    attribute_scores: list[Decimal] = []
    blockers: list[str] = []
    missing_blocker = False

    for code in COMPARABLE_ATTRIBUTE_CODES:
        source_value = _normalize_value(source_attributes.get(code))
        candidate_value = _normalize_value(candidate_attributes.get(code))
        is_blocker_attr = code in BLOCKER_ATTRIBUTE_CODES

        if source_value is None or candidate_value is None:
            if is_blocker_attr:
                missing_blocker = True
            evidences.append(
                EvidenceDraft(
                    attribute_code=code,
                    evidence_type="ATTRIBUTE_COMPARISON",
                    evidence_source="GOVERNANCE_PROFILE",
                    source_value=source_value,
                    candidate_value=candidate_value,
                    result="MISSING",
                    is_blocker=is_blocker_attr,
                    score=None,
                    description=f"Atributo {code} ausente em um dos registros.",
                )
            )
            continue

        matches = source_value.upper() == candidate_value.upper()
        score = Decimal("1") if matches else Decimal("0")
        attribute_scores.append(score)
        if not matches and is_blocker_attr:
            blockers.append(code)
        evidences.append(
            EvidenceDraft(
                attribute_code=code,
                evidence_type="ATTRIBUTE_COMPARISON",
                evidence_source="GOVERNANCE_PROFILE",
                source_value=source_value,
                candidate_value=candidate_value,
                result="MATCH" if matches else "MISMATCH",
                is_blocker=is_blocker_attr and not matches,
                score=score,
                description=(
                    f"Atributo {code} coincide."
                    if matches
                    else f"Atributo {code} diverge entre origem e candidato."
                ),
            )
        )

    lexical_evidence = EvidenceDraft(
        attribute_code=None,
        evidence_type="LEXICAL_SIMILARITY",
        evidence_source="SOURCE_DATA",
        source_value=source_description,
        candidate_value=candidate_description,
        result="SCORED",
        is_blocker=False,
        score=lexical,
        description="Similaridade lexical entre descrições normalizadas.",
    )
    evidences.insert(0, lexical_evidence)

    attribute_score = (
        sum(attribute_scores, start=Decimal("0")) / Decimal(len(attribute_scores))
        if attribute_scores
        else Decimal("0")
    )
    overall = lexical * lexical_weight + attribute_score * attribute_weight

    if missing_blocker:
        relationship = "INDETERMINATE"
    elif blockers:
        relationship = "SIMILAR"
    elif (
        overall >= equivalent_threshold
        and lexical >= Decimal("0.85")
        and attribute_score >= Decimal("0.9")
    ):
        relationship = "EQUIVALENT"
    elif overall >= similar_threshold:
        relationship = "SIMILAR"
    else:
        relationship = "DIFFERENT"

    if overall < min_candidate_score and relationship == "DIFFERENT":
        return None

    return CandidateDraft(
        candidate_source_record_id="",
        lexical_score=lexical,
        attribute_score=attribute_score,
        overall_score=overall,
        relationship_class=relationship,
        confidence_level=confidence_from_score(overall),
        has_blocker=bool(blockers) or missing_blocker,
        evidences=tuple(evidences),
    )


def build_record_matching(
    *,
    source_record_id: str,
    source_description: str | None,
    source_status: str,
    source_attributes: dict[str, str],
    candidate_records: list[tuple[str, str | None, dict[str, str]]],
    configuration: dict[str, float | int] | None = None,
) -> RecordMatchingDraft:
    if source_status == "PENDING_INFORMATION":
        return RecordMatchingDraft(
            result="PENDING_INFORMATION",
            confidence_level=None,
            candidate_count=0,
            has_blocker=False,
            requires_review=True,
            candidates=(),
        )

    config = {**DEFAULT_CONFIGURATION, **(configuration or {})}
    max_candidates = int(config["max_candidates"])
    source_tokens = tokenize(source_description)
    source_unit = _normalize_value(source_attributes.get("CADASTRE_UNIT"))
    top_heap: list[tuple[Decimal, int, CandidateDraft]] = []
    seen = 0

    for candidate_id, candidate_description, candidate_attributes in candidate_records:
        if candidate_id == source_record_id:
            continue
        candidate_unit = _normalize_value(candidate_attributes.get("CADASTRE_UNIT"))
        if source_unit and candidate_unit and not (source_tokens & tokenize(candidate_description)):
            continue
        compared = compare_records(
            source_description=source_description,
            candidate_description=candidate_description,
            source_attributes=source_attributes,
            candidate_attributes=candidate_attributes,
            configuration=config,
        )
        if compared is None:
            continue
        draft = CandidateDraft(
            candidate_source_record_id=candidate_id,
            lexical_score=compared.lexical_score,
            attribute_score=compared.attribute_score,
            overall_score=compared.overall_score,
            relationship_class=compared.relationship_class,
            confidence_level=compared.confidence_level,
            has_blocker=compared.has_blocker,
            evidences=compared.evidences,
        )
        seen += 1
        item = (draft.overall_score, seen, draft)
        if len(top_heap) < max_candidates:
            heapq.heappush(top_heap, item)
        elif draft.overall_score > top_heap[0][0]:
            heapq.heapreplace(top_heap, item)

    top_candidates = tuple(
        item[2] for item in sorted(top_heap, key=lambda item: item[0], reverse=True)
    )

    if not top_candidates:
        return RecordMatchingDraft(
            result="DIFFERENT",
            confidence_level="LOW",
            candidate_count=0,
            has_blocker=False,
            requires_review=False,
            candidates=(),
        )

    best = top_candidates[0]
    if best.relationship_class == "EQUIVALENT":
        global_result = "EQUIVALENT"
    elif best.relationship_class == "INDETERMINATE":
        global_result = "PENDING_INFORMATION"
    elif best.relationship_class == "SIMILAR":
        global_result = "SIMILAR"
    else:
        global_result = "DIFFERENT"

    requires_review = global_result in {"SIMILAR", "PENDING_INFORMATION"} or best.has_blocker
    if len(top_candidates) > 1:
        runner_up = top_candidates[1]
        if runner_up.overall_score >= Decimal(str(config["similar_threshold"])) and abs(
            best.overall_score - runner_up.overall_score
        ) <= Decimal("0.05"):
            requires_review = True

    return RecordMatchingDraft(
        result=global_result,
        confidence_level=best.confidence_level,
        candidate_count=len(top_candidates),
        has_blocker=best.has_blocker,
        requires_review=requires_review,
        candidates=top_candidates,
    )
