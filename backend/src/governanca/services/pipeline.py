from __future__ import annotations

import re
from collections import defaultdict
from difflib import SequenceMatcher
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import case, delete, func, or_, select
from sqlalchemy.orm import Session, aliased

from governanca.core.config import get_settings
from governanca.core.errors import AppError
from governanca.core.tenant import LOCAL_ORG_ID, Tenant, local_tenant
from governanca.imports.columns import (
    build_header_maps,
    count_importable_records,
    iter_importable_records,
    read_spreadsheet_headers,
    resolve_column_index,
    suggest_mapping,
)
from governanca.models import (
    ImportBatch,
    MasterProduct,
    MatchCandidate,
    MatchGroup,
    Organization,
    ProductMapping,
    SanitizationDecision,
    SanitizationProject,
    SourceRecord,
)
from governanca.sanitization import sanitize_description
from governanca.services.decision_config import get_active_sanitization_config


def ensure_organization(session: Session) -> None:
    if session.get(Organization, LOCAL_ORG_ID) is None:
        session.add(Organization(id=LOCAL_ORG_ID, name="Organização Local"))
        session.commit()


# --- Projects ---


def list_projects(session: Session, tenant: Tenant) -> list[SanitizationProject]:
    return list(
        session.scalars(
            select(SanitizationProject)
            .where(SanitizationProject.organization_id == tenant.organization_id)
            .order_by(SanitizationProject.created_at.desc())
        )
    )


def create_project(session: Session, tenant: Tenant, name: str, description: str | None) -> SanitizationProject:
    project = SanitizationProject(
        organization_id=tenant.organization_id,
        name=name.strip(),
        description=description.strip() if description else None,
        status="ACTIVE",
    )
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


def get_project(session: Session, tenant: Tenant, project_id: UUID) -> SanitizationProject:
    project = session.get(SanitizationProject, project_id)
    if project is None or project.organization_id != tenant.organization_id:
        raise AppError("NOT_FOUND", "Projeto não encontrado.", status_code=404)
    return project


def update_project(
    session: Session,
    tenant: Tenant,
    project_id: UUID,
    name: str,
    description: str | None,
) -> SanitizationProject:
    project = get_project(session, tenant, project_id)
    project.name = name.strip()
    project.description = description.strip() if description else None
    session.commit()
    session.refresh(project)
    return project


def _cascade_delete_batches(session: Session, org_id: UUID, batch_ids) -> None:
    source_ids = select(SourceRecord.id).where(
        SourceRecord.batch_id.in_(batch_ids),
        SourceRecord.organization_id == org_id,
    )
    candidate_ids = select(MatchCandidate.id).where(
        MatchCandidate.batch_id.in_(batch_ids),
        MatchCandidate.organization_id == org_id,
    )

    session.execute(
        delete(SanitizationDecision).where(
            SanitizationDecision.organization_id == org_id,
            or_(
                SanitizationDecision.source_record_id.in_(source_ids),
                SanitizationDecision.candidate_id.in_(candidate_ids),
            ),
        )
    )
    session.execute(
        delete(ProductMapping).where(
            ProductMapping.organization_id == org_id,
            ProductMapping.source_record_id.in_(source_ids),
        )
    )
    session.execute(
        delete(MatchCandidate).where(
            MatchCandidate.organization_id == org_id,
            MatchCandidate.batch_id.in_(batch_ids),
        )
    )
    session.execute(
        delete(MatchGroup).where(
            MatchGroup.organization_id == org_id,
            MatchGroup.batch_id.in_(batch_ids),
        )
    )
    session.execute(
        delete(SourceRecord).where(
            SourceRecord.organization_id == org_id,
            SourceRecord.batch_id.in_(batch_ids),
        )
    )
    session.execute(
        delete(ImportBatch).where(
            ImportBatch.organization_id == org_id,
            ImportBatch.id.in_(batch_ids),
        )
    )


def delete_project(session: Session, tenant: Tenant, project_id: UUID) -> None:
    project = get_project(session, tenant, project_id)
    org_id = tenant.organization_id

    batch_ids = select(ImportBatch.id).where(
        ImportBatch.project_id == project.id,
        ImportBatch.organization_id == org_id,
    )
    _cascade_delete_batches(session, org_id, batch_ids)
    session.delete(project)
    session.commit()


def delete_import_batch(session: Session, tenant: Tenant, batch_id: UUID) -> None:
    batch = _get_batch(session, tenant, batch_id)
    org_id = tenant.organization_id
    batch_ids = select(ImportBatch.id).where(
        ImportBatch.id == batch.id,
        ImportBatch.organization_id == org_id,
    )
    _cascade_delete_batches(session, org_id, batch_ids)
    session.commit()


# --- Imports ---


def apply_mapping(
    session: Session,
    tenant: Tenant,
    batch_id: UUID,
    mapping: dict[str, str],
) -> ImportBatch:
    batch = _get_batch(session, tenant, batch_id)
    if batch.status != "AWAITING_MAPPING":
        raise AppError("VALIDATION_ERROR", "Lote já mapeado.", status_code=422)

    records = list(
        session.scalars(
            select(SourceRecord)
            .where(SourceRecord.batch_id == batch.id)
            .order_by(SourceRecord.row_number)
        )
    )
    # Re-read file not stored in MVP: mapping applied on upload path only
    batch.column_mapping = mapping
    batch.status = "IMPORTED"
    session.commit()
    session.refresh(batch)
    return batch


def upload_and_map(
    session: Session,
    tenant: Tenant,
    project_id: UUID,
    file_name: str,
    file_bytes: bytes,
    source_name: str | None,
    mapping: dict[str, str],
) -> ImportBatch:
    settings = get_settings()
    if len(file_bytes) > settings.import_max_bytes:
        raise AppError("VALIDATION_ERROR", "Arquivo excede o tamanho máximo.", status_code=422)

    project = get_project(session, tenant, project_id)
    headers = read_spreadsheet_headers(file_bytes)
    if len(headers) < 1:
        raise AppError("VALIDATION_ERROR", "Planilha sem cabeçalhos.", status_code=422)

    exact_headers, normalized_headers = build_header_maps(headers)
    if not resolve_column_index("original_description", mapping, exact_headers, normalized_headers):
        available = ", ".join(header for header in headers if header) or "(vazio)"
        raise AppError(
            "VALIDATION_ERROR",
            f"Coluna de descrição não encontrada. Cabeçalhos da planilha: {available}",
            status_code=422,
        )

    imported_count = count_importable_records(file_bytes, mapping)
    if imported_count == 0:
        raise AppError(
            "VALIDATION_ERROR",
            "Nenhuma linha com descrição foi encontrada. Revise o mapeamento das colunas.",
            status_code=422,
        )
    if imported_count > settings.import_max_rows:
        raise AppError("VALIDATION_ERROR", "Planilha excede o limite de linhas.", status_code=422)

    batch = ImportBatch(
        organization_id=tenant.organization_id,
        project_id=project.id,
        file_name=file_name,
        source_name=source_name,
        status="IMPORTED",
        column_mapping=mapping,
        total_rows=imported_count,
    )
    session.add(batch)
    session.flush()

    for excel_row_num, record in iter_importable_records(file_bytes, mapping):
        session.add(
            SourceRecord(
                organization_id=tenant.organization_id,
                batch_id=batch.id,
                row_number=excel_row_num,
                source_code=record["source_code"],
                original_description=record["original_description"],
                original_unit=record["original_unit"],
                processing_status="IMPORTED",
            )
        )
    session.commit()
    session.refresh(batch)
    return batch


def _get_batch(session: Session, tenant: Tenant, batch_id: UUID) -> ImportBatch:
    batch = session.get(ImportBatch, batch_id)
    if batch is None or batch.organization_id != tenant.organization_id:
        raise AppError("NOT_FOUND", "Lote não encontrado.", status_code=404)
    return batch


def list_batches(session: Session, tenant: Tenant, project_id: UUID | None = None) -> list[ImportBatch]:
    stmt = select(ImportBatch).where(ImportBatch.organization_id == tenant.organization_id)
    if project_id:
        stmt = stmt.where(ImportBatch.project_id == project_id)
    return list(session.scalars(stmt.order_by(ImportBatch.created_at.desc())))


def get_batch_detail(session: Session, tenant: Tenant, batch_id: UUID) -> dict:
    batch = _get_batch(session, tenant, batch_id)
    project = session.get(SanitizationProject, batch.project_id)
    return {
        "id": str(batch.id),
        "project_id": str(batch.project_id),
        "project_name": project.name if project else None,
        "file_name": batch.file_name,
        "source_name": batch.source_name,
        "status": batch.status,
        "total_rows": batch.total_rows,
        "created_at": batch.created_at.isoformat(),
    }


_RECORD_SORT_COLUMNS = {
    "row_number": SourceRecord.row_number,
    "source_code": SourceRecord.source_code,
    "original_description": SourceRecord.original_description,
    "sanitized_description": SourceRecord.sanitized_description,
    "original_unit": SourceRecord.original_unit,
    "processing_status": SourceRecord.processing_status,
}


def list_batch_records(
    session: Session,
    tenant: Tenant,
    batch_id: UUID,
    *,
    q: str | None = None,
    sort: str = "row_number",
    order: str = "asc",
    page: int = 1,
    page_size: int = 50,
) -> dict:
    batch = _get_batch(session, tenant, batch_id)
    page = max(page, 1)
    page_size = min(max(page_size, 1), 200)

    filters = [
        SourceRecord.batch_id == batch.id,
        SourceRecord.organization_id == tenant.organization_id,
    ]
    if q and q.strip():
        pattern = f"%{q.strip()}%"
        filters.append(
            or_(
                SourceRecord.source_code.ilike(pattern),
                SourceRecord.original_description.ilike(pattern),
                SourceRecord.sanitized_description.ilike(pattern),
                SourceRecord.original_unit.ilike(pattern),
            )
        )

    total = session.scalar(select(func.count()).select_from(SourceRecord).where(*filters)) or 0
    sort_column = _RECORD_SORT_COLUMNS.get(sort, SourceRecord.row_number)
    ordering = sort_column.desc().nulls_last() if order == "desc" else sort_column.asc().nulls_last()
    offset = (page - 1) * page_size

    records = session.scalars(
        select(SourceRecord)
        .where(*filters)
        .order_by(ordering, SourceRecord.id)
        .offset(offset)
        .limit(page_size)
    )

    return {
        "batch": get_batch_detail(session, tenant, batch_id),
        "items": [_record_payload(record) for record in records],
        "page": page,
        "page_size": page_size,
        "total": total,
    }


DISPOSITION_DECISIONS = frozenset({"MANTER", "INATIVAR"})

_DIAGNOSTIC_SORT_KEYS = {
    "row_number",
    "original_description",
    "sanitized_description",
    "identification",
    "duplicate_reference",
    "disposition",
    "treated_code",
    "treated_description",
    "record_status",
}


def _exact_duplicate_group_codes(records: list[SourceRecord]) -> dict[str, str]:
    groups: dict[str, int] = defaultdict(int)
    for record in records:
        sane = (record.sanitized_description or "").strip()
        if sane:
            groups[sane] += 1

    codes: dict[str, str] = {}
    group_no = 1
    for sane, size in sorted(groups.items(), key=lambda item: (-item[1], item[0])):
        if size < 2:
            continue
        codes[sane] = f"DUP-EX-{group_no:04d}"
        group_no += 1
    return codes


def _sanitized_records_for_batch(session: Session, tenant: Tenant, batch_id: UUID) -> list[SourceRecord]:
    return list(
        session.scalars(
            select(SourceRecord)
            .where(
                SourceRecord.batch_id == batch_id,
                SourceRecord.organization_id == tenant.organization_id,
                SourceRecord.sanitized_description.isnot(None),
                SourceRecord.sanitized_description != "",
            )
            .order_by(SourceRecord.row_number)
        )
    )


def _default_diagnostic_dispositions(
    records: list[SourceRecord],
    group_codes: dict[str, str],
) -> dict[UUID, str]:
    by_sanitized: dict[str, list[SourceRecord]] = defaultdict(list)
    for record in records:
        sane = (record.sanitized_description or "").strip()
        if sane:
            by_sanitized[sane].append(record)

    defaults: dict[UUID, str] = {}
    for sane, members in by_sanitized.items():
        if sane not in group_codes:
            for member in members:
                defaults[member.id] = "MANTER"
            continue
        ordered = sorted(members, key=lambda item: item.row_number)
        defaults[ordered[0].id] = "MANTER"
        for member in ordered[1:]:
            defaults[member.id] = "INATIVAR"
    return defaults


def _load_diagnostic_dispositions(
    session: Session,
    tenant: Tenant,
    batch_id: UUID,
) -> dict[UUID, str]:
    rows = session.execute(
        select(SanitizationDecision.source_record_id, SanitizationDecision.decision, SanitizationDecision.decided_at)
        .join(SourceRecord, SanitizationDecision.source_record_id == SourceRecord.id)
        .where(
            SourceRecord.batch_id == batch_id,
            SanitizationDecision.organization_id == tenant.organization_id,
            SanitizationDecision.decision.in_(DISPOSITION_DECISIONS),
        )
        .order_by(SanitizationDecision.decided_at.desc())
    )
    saved: dict[UUID, str] = {}
    for source_record_id, decision, _decided_at in rows:
        if source_record_id not in saved:
            saved[source_record_id] = decision
    return saved


def _duplicate_group_members(
    records: list[SourceRecord],
    group_codes: dict[str, str],
    duplicate_reference: str,
) -> list[SourceRecord]:
    return [
        record
        for record in records
        if group_codes.get((record.sanitized_description or "").strip()) == duplicate_reference
    ]


def _effective_group_dispositions(
    members: list[SourceRecord],
    saved: dict[UUID, str],
    defaults: dict[UUID, str],
) -> dict[UUID, str]:
    return {member.id: saved.get(member.id, defaults.get(member.id, "MANTER")) for member in members}


def set_diagnostic_disposition(
    session: Session,
    tenant: Tenant,
    batch_id: UUID,
    source_record_id: UUID,
    disposition: str,
) -> dict:
    if disposition not in DISPOSITION_DECISIONS:
        raise AppError("VALIDATION_ERROR", "Decisão inválida. Use MANTER ou INATIVAR.", status_code=422)

    batch = _get_batch(session, tenant, batch_id)
    records = _sanitized_records_for_batch(session, tenant, batch.id)
    record_by_id = {record.id: record for record in records}
    record = record_by_id.get(source_record_id)
    if record is None:
        raise AppError("NOT_FOUND", "Registro não encontrado.", status_code=404)

    group_codes = _exact_duplicate_group_codes(records)
    defaults = _default_diagnostic_dispositions(records, group_codes)
    saved = _load_diagnostic_dispositions(session, tenant, batch.id)

    sane = (record.sanitized_description or "").strip()
    duplicate_reference = group_codes.get(sane)
    if duplicate_reference is None:
        if disposition != "MANTER":
            raise AppError(
                "VALIDATION_ERROR",
                "Registros únicos devem permanecer como Manter.",
                status_code=422,
            )
        members = [record]
    else:
        members = _duplicate_group_members(records, group_codes, duplicate_reference)

    effective = _effective_group_dispositions(members, saved, defaults)
    if disposition == "MANTER":
        for member in members:
            effective[member.id] = "MANTER" if member.id == source_record_id else "INATIVAR"
    else:
        effective[source_record_id] = "INATIVAR"
        if not any(value == "MANTER" for value in effective.values()):
            raise AppError(
                "VALIDATION_ERROR",
                "Cada grupo de duplicidade precisa de ao menos um registro marcado como Manter.",
                status_code=422,
            )

    member_ids = [member.id for member in members]
    session.execute(
        delete(SanitizationDecision).where(
            SanitizationDecision.organization_id == tenant.organization_id,
            SanitizationDecision.source_record_id.in_(member_ids),
            SanitizationDecision.decision.in_(DISPOSITION_DECISIONS),
        )
    )
    for member_id, value in effective.items():
        session.add(
            SanitizationDecision(
                organization_id=tenant.organization_id,
                source_record_id=member_id,
                candidate_id=None,
                decision=value,
                reason=duplicate_reference,
            )
        )
    session.commit()

    return {
        "source_record_id": str(source_record_id),
        "disposition": disposition,
        "duplicate_reference": duplicate_reference,
        "updated": [
            {
                "id": str(member_id),
                "disposition": value,
            }
            for member_id, value in effective.items()
        ],
    }


def _next_prd_code(session: Session, org_id: UUID) -> str:
    codes = session.scalars(
        select(MasterProduct.master_code).where(
            MasterProduct.organization_id == org_id,
            MasterProduct.master_code.like("PRD-%"),
        )
    )
    max_num = 0
    for code in codes:
        suffix = code.removeprefix("PRD-")
        if suffix.isdigit():
            max_num = max(max_num, int(suffix))
    return f"PRD-{max_num + 1:06d}"


def _create_prd_master(
    session: Session,
    tenant: Tenant,
    record: SourceRecord,
    master_code: str,
) -> MasterProduct:
    master = MasterProduct(
        organization_id=tenant.organization_id,
        master_code=master_code,
        description=(record.sanitized_description or record.original_description or "SEM DESCRICAO").strip(),
        unit=(record.original_unit or "UN").upper(),
    )
    session.add(master)
    session.flush()
    return master


def _load_treatment_by_record(
    session: Session,
    record_ids: list[UUID],
) -> dict[UUID, tuple[ProductMapping | None, MasterProduct | None]]:
    if not record_ids:
        return {}
    rows = session.execute(
        select(SourceRecord.id, ProductMapping, MasterProduct)
        .outerjoin(ProductMapping, ProductMapping.source_record_id == SourceRecord.id)
        .outerjoin(MasterProduct, ProductMapping.master_product_id == MasterProduct.id)
        .where(SourceRecord.id.in_(record_ids))
    )
    return {record_id: (mapping, master) for record_id, mapping, master in rows}


def _governance_status(
    *,
    duplicate_reference: str | None,
    processing_status: str,
    mapping_type: str | None,
) -> str | None:
    if processing_status not in ("TREATED", "INATIVATED"):
        return None
    if processing_status == "INATIVATED":
        return "DE_PARA_EXATO"
    if duplicate_reference:
        return "MESTRE_PROVISORIO"
    return "CADASTRO_UNICO"


def apply_diagnostic_treatment(session: Session, tenant: Tenant, batch_id: UUID) -> dict[str, int]:
    batch = _get_batch(session, tenant, batch_id)
    records = _sanitized_records_for_batch(session, tenant, batch.id)
    if not records:
        raise AppError("VALIDATION_ERROR", "Não há registros saneados para tratar.", status_code=422)

    group_codes = _exact_duplicate_group_codes(records)
    defaults = _default_diagnostic_dispositions(records, group_codes)
    saved = _load_diagnostic_dispositions(session, tenant, batch.id)
    disposition_by_id = {
        record.id: saved.get(record.id, defaults.get(record.id, "MANTER")) for record in records
    }

    duplicate_groups: dict[str, list[SourceRecord]] = defaultdict(list)
    for record in records:
        duplicate_reference = group_codes.get((record.sanitized_description or "").strip())
        if duplicate_reference:
            duplicate_groups[duplicate_reference].append(record)

    for duplicate_reference, members in duplicate_groups.items():
        keepers = [member for member in members if disposition_by_id[member.id] == "MANTER"]
        if len(keepers) != 1:
            raise AppError(
                "VALIDATION_ERROR",
                f"O grupo {duplicate_reference} precisa de exatamente um registro Manter.",
                status_code=422,
            )

    record_ids = [record.id for record in records]
    session.execute(
        delete(ProductMapping).where(
            ProductMapping.organization_id == tenant.organization_id,
            ProductMapping.source_record_id.in_(record_ids),
        )
    )

    next_code_value = _next_prd_code(session, tenant.organization_id)
    next_num = int(next_code_value.removeprefix("PRD-"))
    mantidos = 0
    inativados = 0
    masters_created = 0

    for duplicate_reference, members in sorted(duplicate_groups.items()):
        keeper = next(member for member in members if disposition_by_id[member.id] == "MANTER")
        master_code = f"PRD-{next_num:06d}"
        next_num += 1
        master = _create_prd_master(session, tenant, keeper, master_code)
        masters_created += 1

        for member in members:
            is_keeper = member.id == keeper.id
            member.processing_status = "TREATED" if is_keeper else "INATIVATED"
            session.add(
                ProductMapping(
                    organization_id=tenant.organization_id,
                    source_record_id=member.id,
                    master_product_id=master.id,
                    mapping_type="EQUIVALENCE" if is_keeper else "DE_PARA",
                )
            )
            if is_keeper:
                mantidos += 1
            else:
                inativados += 1

    for record in records:
        if (record.sanitized_description or "").strip() in group_codes:
            continue
        master_code = f"PRD-{next_num:06d}"
        next_num += 1
        master = _create_prd_master(session, tenant, record, master_code)
        masters_created += 1
        record.processing_status = "TREATED"
        session.add(
            ProductMapping(
                organization_id=tenant.organization_id,
                source_record_id=record.id,
                master_product_id=master.id,
                mapping_type="EQUIVALENCE",
            )
        )
        mantidos += 1

    batch.status = "COMPLETED"
    session.commit()
    return {
        "mantidos": mantidos,
        "inativados": inativados,
        "masters_created": masters_created,
        "total": len(records),
    }


def list_diagnostics(
    session: Session,
    tenant: Tenant,
    batch_id: UUID,
    *,
    identification: str | None = None,
    q: str | None = None,
    sort: str = "row_number",
    order: str = "asc",
    page: int = 1,
    page_size: int = 50,
) -> dict:
    batch = _get_batch(session, tenant, batch_id)
    page = max(page, 1)
    page_size = min(max(page_size, 1), 200)

    records = _sanitized_records_for_batch(session, tenant, batch.id)

    group_codes = _exact_duplicate_group_codes(records)
    defaults = _default_diagnostic_dispositions(records, group_codes)
    saved = _load_diagnostic_dispositions(session, tenant, batch.id)
    treatment_by_record = _load_treatment_by_record(session, [record.id for record in records])
    items: list[dict] = []
    treated_count = 0
    for record in records:
        sane = (record.sanitized_description or "").strip()
        duplicate_reference = group_codes.get(sane)
        item_identification = "DUPLICADO" if duplicate_reference else "UNICO"
        disposition = saved.get(record.id, defaults.get(record.id, "MANTER"))
        mapping, master = treatment_by_record.get(record.id, (None, None))
        governance_status = _governance_status(
            duplicate_reference=duplicate_reference,
            processing_status=record.processing_status,
            mapping_type=mapping.mapping_type if mapping else None,
        )
        if record.processing_status in ("TREATED", "INATIVATED"):
            treated_count += 1
        items.append(
            {
                "id": str(record.id),
                "row_number": record.row_number,
                "original_description": record.original_description,
                "sanitized_description": sane,
                "identification": item_identification,
                "duplicate_reference": duplicate_reference,
                "disposition": disposition,
                "disposition_editable": item_identification == "DUPLICADO"
                and record.processing_status not in ("TREATED", "INATIVATED"),
                "treated_code": master.master_code if master else None,
                "treated_description": master.description if master else None,
                "governance_status": governance_status,
                "record_status": (
                    "INATIVADO"
                    if record.processing_status == "INATIVATED"
                    else "ATIVO"
                    if record.processing_status == "TREATED"
                    else None
                ),
            }
        )

    if identification in ("UNICO", "DUPLICADO"):
        items = [item for item in items if item["identification"] == identification]

    if q and q.strip():
        pattern = q.strip().upper()
        items = [
            item
            for item in items
            if pattern in (item["original_description"] or "").upper()
            or pattern in (item["sanitized_description"] or "").upper()
            or pattern in (item["duplicate_reference"] or "").upper()
        ]

    summary = {
        "total": len(records),
        "unicos": sum(
            1 for record in records if (record.sanitized_description or "").strip() not in group_codes
        ),
        "duplicados": sum(
            1 for record in records if (record.sanitized_description or "").strip() in group_codes
        ),
        "grupos_duplicidade": len(group_codes),
        "tratados": treated_count,
    }

    sort_key = sort if sort in _DIAGNOSTIC_SORT_KEYS else "row_number"
    reverse = order == "desc"

    def sort_value(item: dict) -> tuple:
        value = item.get(sort_key)
        if sort_key == "row_number":
            return (value,)
        if value is None:
            return ("",)
        return (str(value).upper(),)

    items.sort(key=sort_value, reverse=reverse)

    total = len(items)
    offset = (page - 1) * page_size
    page_items = items[offset : offset + page_size]

    return {
        "batch": get_batch_detail(session, tenant, batch_id),
        "items": page_items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "summary": summary,
    }


# --- Pipeline: Fase 1 + Fase 2 ---


def run_sanitization(session: Session, tenant: Tenant, batch_id: UUID) -> dict[str, int]:
    batch = _get_batch(session, tenant, batch_id)
    config = get_active_sanitization_config(session, tenant)
    records = list(
        session.scalars(select(SourceRecord).where(SourceRecord.batch_id == batch.id))
    )
    processed = 0
    for record in records:
        if not record.original_description:
            record.processing_status = "PENDING_INFORMATION"
            continue
        record.sanitized_description = sanitize_description(record.original_description, config)
        record.processing_status = "SANITIZED"
        processed += 1
    batch.status = "SANITIZED"
    session.commit()
    match_stats = run_matching(session, tenant, batch_id)
    return {"processed": processed, "total": len(records), **match_stats}



def _record_tokens(text: str | None) -> list[str]:
    if not text:
        return []
    return re.findall(r"[A-Z0-9]{2,}", text.upper())


def _score(a: str | None, b: str | None) -> float:
    if not a or not b:
        return 0.0
    left, right = a.upper(), b.upper()
    if left == right:
        return 1.0
    matcher = SequenceMatcher(None, left, right)
    quick = matcher.quick_ratio()
    if quick < 0.65:
        return quick
    return matcher.ratio()


def _build_token_index(records: list[SourceRecord]) -> dict[str, list[int]]:
    index: dict[str, list[int]] = defaultdict(list)
    for idx, record in enumerate(records):
        for token in set(_record_tokens(record.sanitized_description)):
            index[token].append(idx)
    return index


def _candidate_indices(
    records: list[SourceRecord],
    token_index: dict[str, list[int]],
    index: int,
    *,
    max_candidates: int = 400,
) -> list[int]:
    tokens = set(_record_tokens(records[index].sanitized_description))
    if not tokens:
        unit = (records[index].original_unit or "").upper()
        unit_pool = [j for j, record in enumerate(records) if j != index and (record.original_unit or "").upper() == unit]
        return unit_pool[:max_candidates]

    overlap: dict[int, int] = defaultdict(int)
    for token in tokens:
        for candidate_index in token_index.get(token, []):
            if candidate_index != index:
                overlap[candidate_index] += 1

    if not overlap:
        unit = (records[index].original_unit or "").upper()
        unit_pool = [j for j, record in enumerate(records) if j != index and (record.original_unit or "").upper() == unit]
        return unit_pool[:max_candidates]

    ranked = sorted(overlap.keys(), key=lambda candidate_index: overlap[candidate_index], reverse=True)
    return ranked[:max_candidates]


def run_matching(session: Session, tenant: Tenant, batch_id: UUID) -> dict[str, int]:
    batch = _get_batch(session, tenant, batch_id)
    if batch.status not in ("SANITIZED", "MATCHED"):
        raise AppError(
            "VALIDATION_ERROR",
            "Execute o saneamento antes da análise cadastral.",
            status_code=422,
        )
    records = list(
        session.scalars(
            select(SourceRecord).where(
                SourceRecord.batch_id == batch.id,
                SourceRecord.processing_status == "SANITIZED",
            )
        )
    )

    session.execute(delete(MatchCandidate).where(MatchCandidate.batch_id == batch.id))
    session.execute(delete(MatchGroup).where(MatchGroup.batch_id == batch.id))

    token_index = _build_token_index(records)
    equivalents = 0
    for i, left in enumerate(records):
        best = None
        best_score = 0.0
        for j in _candidate_indices(records, token_index, i):
            right = records[j]
            score = _score(left.sanitized_description, right.sanitized_description)
            if score > best_score:
                best_score = score
                best = right
        if best is None:
            continue
        if best_score >= 0.92:
            rel = "EQUIVALENT"
            equivalents += 1
        elif best_score >= 0.70:
            rel = "SIMILAR"
        else:
            rel = "DIFFERENT"
        session.add(
            MatchCandidate(
                organization_id=tenant.organization_id,
                batch_id=batch.id,
                source_record_id=left.id,
                candidate_record_id=best.id,
                relationship_class=rel,
                score=round(best_score, 4),
            )
        )

    _build_groups(session, tenant, batch, records)
    batch.status = "MATCHED"
    session.commit()
    return {"records": len(records), "equivalents": equivalents}


def _build_groups(session: Session, tenant: Tenant, batch: ImportBatch, records: list[SourceRecord]) -> None:
    parent: dict[UUID, UUID] = {r.id: r.id for r in records}

    def find(node: UUID) -> UUID:
        while parent[node] != node:
            parent[node] = parent[parent[node]]
            node = parent[node]
        return node

    def union(a: UUID, b: UUID) -> None:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[rb] = ra

    candidates = session.scalars(
        select(MatchCandidate).where(
            MatchCandidate.batch_id == batch.id,
            MatchCandidate.relationship_class.in_(("EQUIVALENT", "SIMILAR")),
        )
    )
    for cand in candidates:
        union(cand.source_record_id, cand.candidate_record_id)

    clusters: dict[UUID, list[UUID]] = defaultdict(list)
    for record in records:
        clusters[find(record.id)].append(record.id)

    group_no = 1
    record_by_id = {r.id: r for r in records}
    for members in sorted(clusters.values(), key=lambda m: (-len(m), m[0].hex)):
        if len(members) < 2:
            continue
        code = f"GOV-{group_no:04d}"
        group_no += 1
        group = MatchGroup(
            organization_id=tenant.organization_id,
            batch_id=batch.id,
            code=code,
            group_type="DUPLICIDADE_EXATA",
            size=len(members),
        )
        session.add(group)
        session.flush()
        for member_id in members:
            for cand in session.scalars(
                select(MatchCandidate).where(MatchCandidate.source_record_id == member_id)
            ):
                cand.group_id = group.id


# --- Review / Master ---

_QUEUE_SORT_KEYS = {
    "score",
    "relationship_class",
    "governance_group_code",
    "source_code",
    "source_description",
    "candidate_description",
}


def list_queue(
    session: Session,
    tenant: Tenant,
    batch_id: UUID,
    *,
    relationship: str | None = None,
    q: str | None = None,
    sort: str = "score",
    order: str = "desc",
    page: int = 1,
    page_size: int = 50,
) -> dict:
    _get_batch(session, tenant, batch_id)
    page = max(page, 1)
    page_size = min(max(page_size, 1), 200)

    source = aliased(SourceRecord)
    target = aliased(SourceRecord)

    filters = [MatchCandidate.batch_id == batch_id]
    if relationship:
        filters.append(MatchCandidate.relationship_class == relationship)
    if q and q.strip():
        pattern = f"%{q.strip()}%"
        filters.append(
            or_(
                source.source_code.ilike(pattern),
                source.original_description.ilike(pattern),
                source.sanitized_description.ilike(pattern),
                target.source_code.ilike(pattern),
                target.original_description.ilike(pattern),
                target.sanitized_description.ilike(pattern),
                MatchGroup.code.ilike(pattern),
            )
        )

    summary_rows = session.execute(
        select(MatchCandidate.relationship_class, func.count())
        .where(MatchCandidate.batch_id == batch_id)
        .group_by(MatchCandidate.relationship_class)
    )
    summary = {"EQUIVALENT": 0, "SIMILAR": 0, "DIFFERENT": 0}
    for rel, count in summary_rows:
        summary[rel] = count

    total = session.scalar(
        select(func.count())
        .select_from(MatchCandidate)
        .join(source, MatchCandidate.source_record_id == source.id)
        .join(target, MatchCandidate.candidate_record_id == target.id)
        .outerjoin(MatchGroup, MatchCandidate.group_id == MatchGroup.id)
        .where(*filters)
    ) or 0

    sort_key = sort if sort in _QUEUE_SORT_KEYS else "score"
    if sort_key == "score":
        ordering = MatchCandidate.score.desc() if order == "desc" else MatchCandidate.score.asc()
    elif sort_key == "relationship_class":
        ordering = (
            MatchCandidate.relationship_class.desc() if order == "desc" else MatchCandidate.relationship_class.asc()
        )
    elif sort_key == "governance_group_code":
        ordering = MatchGroup.code.desc().nulls_last() if order == "desc" else MatchGroup.code.asc().nulls_last()
    elif sort_key == "source_code":
        ordering = source.source_code.desc().nulls_last() if order == "desc" else source.source_code.asc().nulls_last()
    elif sort_key == "source_description":
        ordering = (
            source.sanitized_description.desc().nulls_last()
            if order == "desc"
            else source.sanitized_description.asc().nulls_last()
        )
    else:
        ordering = (
            target.sanitized_description.desc().nulls_last()
            if order == "desc"
            else target.sanitized_description.asc().nulls_last()
        )

    rows = session.execute(
        select(MatchCandidate, source, target, MatchGroup)
        .join(source, MatchCandidate.source_record_id == source.id)
        .join(target, MatchCandidate.candidate_record_id == target.id)
        .outerjoin(MatchGroup, MatchCandidate.group_id == MatchGroup.id)
        .where(*filters)
        .order_by(ordering, MatchCandidate.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    decided = {
        (source_record_id, candidate_id)
        for source_record_id, candidate_id in session.execute(
            select(SanitizationDecision.source_record_id, SanitizationDecision.candidate_id)
            .join(SourceRecord, SanitizationDecision.source_record_id == SourceRecord.id)
            .where(SourceRecord.batch_id == batch_id)
        )
    }

    items: list[dict] = []
    for cand, source_row, target_row, group in rows:
        items.append(
            {
                "candidate_id": str(cand.id),
                "relationship_class": cand.relationship_class,
                "score": cand.score,
                "treatable": (cand.source_record_id, cand.id) not in decided,
                "source": _record_payload(source_row),
                "candidate": _record_payload(target_row),
                "governance_group_code": group.code if group else None,
                "governance_group_size": group.size if group else None,
            }
        )

    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "summary": summary,
    }


def _record_payload(record: SourceRecord) -> dict:
    return {
        "id": str(record.id),
        "row_number": record.row_number,
        "source_code": record.source_code,
        "original_description": record.original_description,
        "sanitized_description": record.sanitized_description,
        "original_unit": record.original_unit,
        "processing_status": record.processing_status,
    }


def apply_decision(
    session: Session,
    tenant: Tenant,
    batch_id: UUID,
    decision: str,
    source_record_id: UUID | None,
    candidate_id: UUID | None,
    reason: str | None,
    group_code: str | None = None,
    excluded_source_ids: list[UUID] | None = None,
) -> list[dict]:
    _get_batch(session, tenant, batch_id)
    applied: list[dict] = []

    source_ids: list[UUID] = []
    if group_code:
        group = session.scalar(
            select(MatchGroup).where(
                MatchGroup.batch_id == batch_id,
                MatchGroup.code == group_code,
            )
        )
        if group is None:
            raise AppError("NOT_FOUND", "Grupo não encontrado.", status_code=404)
        members = session.scalars(
            select(MatchCandidate.source_record_id).where(MatchCandidate.group_id == group.id).distinct()
        )
        excluded = set(excluded_source_ids or [])
        source_ids = [sid for sid in members if sid not in excluded]
    elif source_record_id is not None:
        source_ids = [source_record_id]
    else:
        raise AppError("VALIDATION_ERROR", "Informe registro ou grupo.", status_code=422)

    shared_master: MasterProduct | None = None
    if decision == "CONFIRM_EQUIVALENT" and group_code and len(source_ids) > 1:
        anchor = session.get(SourceRecord, source_ids[0])
        if anchor is not None:
            code_base = (group_code or "GOV").upper()
            shared_master = MasterProduct(
                organization_id=tenant.organization_id,
                master_code=_unique_master_code(session, tenant.organization_id, code_base),
                description=(anchor.sanitized_description or anchor.original_description or "SEM DESCRICAO").strip(),
                unit=(anchor.original_unit or "UN").upper(),
            )
            session.add(shared_master)
            session.flush()

    for sid in source_ids:
        cand_id = candidate_id
        if cand_id is None and decision != "CREATE_MASTER":
            cand = session.scalar(
                select(MatchCandidate).where(
                    MatchCandidate.batch_id == batch_id,
                    MatchCandidate.source_record_id == sid,
                )
            )
            cand_id = cand.id if cand else None

        session.add(
            SanitizationDecision(
                organization_id=tenant.organization_id,
                source_record_id=sid,
                candidate_id=cand_id,
                decision=decision,
                reason=reason,
            )
        )

        master_id = None
        if decision in ("CONFIRM_EQUIVALENT", "CREATE_MASTER"):
            source = session.get(SourceRecord, sid)
            if source is None:
                continue
            if decision == "CONFIRM_EQUIVALENT" and shared_master is not None:
                master = shared_master
            else:
                code_base = (source.source_code or f"LINHA-{source.row_number}").upper()
                master = MasterProduct(
                    organization_id=tenant.organization_id,
                    master_code=_unique_master_code(session, tenant.organization_id, code_base),
                    description=(source.sanitized_description or source.original_description or "SEM DESCRICAO").strip(),
                    unit=(source.original_unit or "UN").upper(),
                )
                session.add(master)
                session.flush()
            master_id = master.id
            session.add(
                ProductMapping(
                    organization_id=tenant.organization_id,
                    source_record_id=sid,
                    master_product_id=master.id,
                    mapping_type="DE_PARA" if decision == "CREATE_MASTER" else "EQUIVALENCE",
                )
            )
        applied.append({"source_record_id": str(sid), "master_product_id": str(master_id) if master_id else None})

    session.commit()
    return applied


def _unique_master_code(session: Session, org_id: UUID, base: str) -> str:
    candidate = base[:80]
    suffix = 0
    while session.scalar(
        select(func.count()).select_from(MasterProduct).where(
            MasterProduct.organization_id == org_id,
            MasterProduct.master_code == candidate,
        )
    ):
        suffix += 1
        candidate = f"{base}-{suffix}"
    return candidate


_MASTER_SORT_COLUMNS = {
    "master_code": MasterProduct.master_code,
    "description": MasterProduct.description,
    "unit": MasterProduct.unit,
    "status": MasterProduct.status,
}


def _canonical_source_subquery(organization_id: UUID):
    preference = case((ProductMapping.mapping_type == "EQUIVALENCE", 0), else_=1)
    ranked = (
        select(
            ProductMapping.master_product_id.label("master_product_id"),
            ProductMapping.source_record_id.label("source_record_id"),
            func.row_number()
            .over(
                partition_by=ProductMapping.master_product_id,
                order_by=(preference, ProductMapping.created_at),
            )
            .label("rn"),
        )
        .where(ProductMapping.organization_id == organization_id)
        .subquery()
    )
    return (
        select(ranked.c.master_product_id, ranked.c.source_record_id)
        .where(ranked.c.rn == 1)
        .subquery("canonical_source")
    )


def list_masters(
    session: Session,
    tenant: Tenant,
    *,
    q: str | None = None,
    status: str | None = "ACTIVE",
    sort: str = "master_code",
    order: str = "asc",
    page: int = 1,
    page_size: int = 50,
) -> dict:
    page = max(page, 1)
    page_size = min(max(page_size, 1), 200)

    canonical = _canonical_source_subquery(tenant.organization_id)
    source = aliased(SourceRecord)

    filters = [MasterProduct.organization_id == tenant.organization_id]
    if status:
        filters.append(MasterProduct.status == status)
    if q and q.strip():
        pattern = f"%{q.strip()}%"
        matching_masters = (
            select(ProductMapping.master_product_id)
            .join(SourceRecord, SourceRecord.id == ProductMapping.source_record_id)
            .where(
                ProductMapping.organization_id == tenant.organization_id,
                or_(
                    SourceRecord.original_description.ilike(pattern),
                    SourceRecord.sanitized_description.ilike(pattern),
                    SourceRecord.source_code.ilike(pattern),
                ),
            )
            .distinct()
        )
        filters.append(
            or_(
                MasterProduct.master_code.ilike(pattern),
                MasterProduct.description.ilike(pattern),
                MasterProduct.unit.ilike(pattern),
                source.original_description.ilike(pattern),
                source.sanitized_description.ilike(pattern),
                MasterProduct.id.in_(matching_masters),
            )
        )

    base = (
        select(MasterProduct, source.original_description, source.sanitized_description)
        .outerjoin(canonical, canonical.c.master_product_id == MasterProduct.id)
        .outerjoin(source, source.id == canonical.c.source_record_id)
        .where(*filters)
    )

    total = session.scalar(select(func.count()).select_from(base.subquery())) or 0

    sort_columns = {
        **_MASTER_SORT_COLUMNS,
        "original_description": source.original_description,
        "sanitized_description": source.sanitized_description,
    }
    sort_column = sort_columns.get(sort, MasterProduct.master_code)
    ordering = sort_column.desc().nulls_last() if order == "desc" else sort_column.asc().nulls_last()
    offset = (page - 1) * page_size

    rows = session.execute(
        base.order_by(ordering, MasterProduct.id).offset(offset).limit(page_size)
    )
    page_rows = list(rows)
    master_ids = [master.id for master, _, _ in page_rows]
    inactive_counts: dict[UUID, int] = {}
    if master_ids:
        inactive_counts = dict(
            session.execute(
                select(ProductMapping.master_product_id, func.count())
                .where(
                    ProductMapping.organization_id == tenant.organization_id,
                    ProductMapping.master_product_id.in_(master_ids),
                    ProductMapping.mapping_type == "DE_PARA",
                )
                .group_by(ProductMapping.master_product_id)
            ).all()
        )

    return {
        "items": [
            {
                "id": str(master.id),
                "master_code": master.master_code,
                "original_description": original_description,
                "sanitized_description": sanitized_description,
                "description": master.description,
                "unit": master.unit,
                "status": master.status,
                "inactive_count": inactive_counts.get(master.id, 0),
            }
            for master, original_description, sanitized_description in page_rows
        ],
        "page": page,
        "page_size": page_size,
        "total": total,
    }


def list_master_inactive_records(session: Session, tenant: Tenant, master_id: UUID) -> list[dict]:
    master = session.scalar(
        select(MasterProduct).where(
            MasterProduct.id == master_id,
            MasterProduct.organization_id == tenant.organization_id,
        )
    )
    if master is None:
        raise AppError("NOT_FOUND", "Produto mestre não encontrado.", status_code=404)

    rows = session.execute(
        select(SourceRecord, ProductMapping)
        .join(ProductMapping, ProductMapping.source_record_id == SourceRecord.id)
        .where(
            ProductMapping.organization_id == tenant.organization_id,
            ProductMapping.master_product_id == master.id,
            ProductMapping.mapping_type == "DE_PARA",
        )
        .order_by(SourceRecord.row_number, SourceRecord.id)
    )
    return [
        {
            "id": str(record.id),
            "row_number": record.row_number,
            "source_code": record.source_code,
            "original_description": record.original_description,
            "sanitized_description": record.sanitized_description,
            "unit": record.original_unit,
            "conversion_factor": float(mapping.conversion_factor),
        }
        for record, mapping in rows
    ]


def unify_masters(
    session: Session,
    tenant: Tenant,
    *,
    selected_master_ids: list[UUID],
    target_master_id: UUID,
    conversion_factors: dict[UUID, Decimal] | None = None,
) -> dict:
    unique_ids = list(dict.fromkeys(selected_master_ids))
    if len(unique_ids) < 2:
        raise AppError("VALIDATION_ERROR", "Selecione pelo menos dois produtos.", status_code=422)
    if target_master_id not in unique_ids:
        raise AppError("VALIDATION_ERROR", "O destino PARA deve estar entre os selecionados.", status_code=422)

    de_ids = [master_id for master_id in unique_ids if master_id != target_master_id]
    factors = conversion_factors or {}
    masters = session.scalars(
        select(MasterProduct).where(
            MasterProduct.organization_id == tenant.organization_id,
            MasterProduct.id.in_(unique_ids),
        )
    ).all()
    masters_by_id = {master.id: master for master in masters}
    if len(masters_by_id) != len(unique_ids):
        raise AppError("NOT_FOUND", "Produto mestre não encontrado.", status_code=404)

    target = masters_by_id[target_master_id]
    if target.status != "ACTIVE":
        raise AppError("VALIDATION_ERROR", "O produto PARA precisa estar ativo.", status_code=422)

    for de_id in de_ids:
        de_master = masters_by_id[de_id]
        if de_master.status != "ACTIVE":
            raise AppError(
                "VALIDATION_ERROR",
                f"O produto {de_master.master_code} já está inativo.",
                status_code=422,
            )

    unified_mappings = 0
    for de_id in de_ids:
        factor = factors.get(de_id, Decimal("1"))
        if factor <= 0:
            raise AppError(
                "VALIDATION_ERROR",
                "O fator de conversão precisa ser maior que zero.",
                status_code=422,
            )
        mappings = session.scalars(
            select(ProductMapping).where(
                ProductMapping.organization_id == tenant.organization_id,
                ProductMapping.master_product_id == de_id,
            )
        ).all()
        for mapping in mappings:
            mapping.master_product_id = target.id
            mapping.mapping_type = "DE_PARA"
            mapping.conversion_factor = factor
            unified_mappings += 1
            record = session.get(SourceRecord, mapping.source_record_id)
            if record is not None:
                record.processing_status = "INATIVATED"

        masters_by_id[de_id].status = "INACTIVE"

    session.commit()
    return {
        "target_master_id": str(target.id),
        "target_master_code": target.master_code,
        "unified_masters": len(de_ids),
        "unified_mappings": unified_mappings,
    }


def list_mappings(session: Session, tenant: Tenant) -> list[dict]:
    rows = session.execute(
        select(ProductMapping, MasterProduct, SourceRecord)
        .join(MasterProduct, ProductMapping.master_product_id == MasterProduct.id)
        .join(SourceRecord, ProductMapping.source_record_id == SourceRecord.id)
        .where(ProductMapping.organization_id == tenant.organization_id)
        .order_by(ProductMapping.created_at.desc())
    )
    return [
        {
            "id": str(mapping.id),
            "mapping_type": mapping.mapping_type,
            "master_code": master.master_code,
            "master_description": master.description,
            "source_code": source.source_code,
            "original_description": source.original_description,
            "conversion_factor": float(mapping.conversion_factor),
        }
        for mapping, master, source in rows
    ]


def dashboard_summary(session: Session, tenant: Tenant) -> dict[str, int]:
    return {
        "projects": session.scalar(
            select(func.count()).select_from(SanitizationProject).where(
                SanitizationProject.organization_id == tenant.organization_id
            )
        )
        or 0,
        "batches": session.scalar(
            select(func.count()).select_from(ImportBatch).where(
                ImportBatch.organization_id == tenant.organization_id
            )
        )
        or 0,
        "master_products": session.scalar(
            select(func.count()).select_from(MasterProduct).where(
                MasterProduct.organization_id == tenant.organization_id,
                MasterProduct.status == "ACTIVE",
            )
        )
        or 0,
        "mappings": session.scalar(
            select(func.count()).select_from(ProductMapping).where(
                ProductMapping.organization_id == tenant.organization_id
            )
        )
        or 0,
        "pending_review": session.scalar(
            select(func.count()).select_from(MatchCandidate).where(
                MatchCandidate.organization_id == tenant.organization_id
            )
        )
        or 0,
    }
