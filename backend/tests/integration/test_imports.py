from io import BytesIO
from uuid import uuid4

from sqlalchemy.orm import Session

from app.core.db import SessionLocal
from app.core.processing import job_key, mark_job_stale, set_running
from app.imports.models import ImportBatch, SourceSystem
from app.organizations.models import Organization, OrganizationUser, User
from helpers.imports import (
    _apply_mapping_and_wait,
    _delete_import_batch_and_wait,
    _upload_import_batch_and_wait,
)
from helpers.spreadsheet import xlsx_upload


def test_import_xlsx_maps_and_keeps_invalid_rows(migrated_client) -> None:
    unique = uuid4().hex[:8]
    payload = _upload_import_batch_and_wait(
        migrated_client,
        xlsx_upload(
            [
                ["CODIGO", "DESCRICAO", "UNIDADE"],
                [f"A-{unique}", "Arroz 1kg", "UN"],
                ["", "Feijão", "KG"],
                [f"B-{unique}", "Açúcar", ""],
            ],
            f"origem-{unique}.xlsx",
        ),
    )
    assert payload["batch"]["status"] == "AWAITING_MAPPING"
    assert payload["headers"] == ["CODIGO", "DESCRICAO", "UNIDADE"]
    batch_id = payload["batch"]["id"]

    mapped_payload = _apply_mapping_and_wait(
        migrated_client,
        batch_id,
        {
            "source_code": "CODIGO",
            "original_description": "DESCRICAO",
            "original_unit": "UNIDADE",
        },
    )
    batch = mapped_payload["batch"]
    assert batch["status"] == "COMPLETED"
    assert batch["total_rows"] == 3
    assert batch["valid_rows"] == 1
    assert batch["invalid_rows"] == 2

    errors = migrated_client.get(f"/api/v1/imports/batches/{batch_id}/row-errors")
    assert errors.status_code == 200
    issues = errors.json()["data"]["items"]
    assert len(issues) == 2
    assert issues[0]["issues"] == ["MISSING_SOURCE_CODE"]
    assert issues[1]["issues"] == ["MISSING_UNIT"]


def test_duplicate_file_is_rejected_before_new_batch(migrated_client) -> None:
    unique = uuid4().hex[:8]
    rows = [
        ["CODIGO", "DESCRICAO", "UNIDADE"],
        [f"DUP-{unique}", "Item", "UN"],
    ]
    first = migrated_client.post(
        "/api/v1/imports/batches",
        files=xlsx_upload(rows, f"dup-{unique}.xlsx"),
    )
    assert first.status_code == 202, first.text
    first_batch_id = first.json()["data"]["batch_id"]
    second = migrated_client.post(
        "/api/v1/imports/batches",
        files=xlsx_upload(rows, "outro-nome.xlsx"),
    )
    assert second.status_code == 409
    body = second.json()["error"]
    assert body["code"] == "IMPORT_DUPLICATE_FILE"
    assert body["details"]["batch_id"] == first_batch_id


def test_missing_mapped_column_returns_stable_code(migrated_client) -> None:
    unique = uuid4().hex[:8]
    payload = _upload_import_batch_and_wait(
        migrated_client,
        xlsx_upload(
            [
                ["CODIGO", "DESCRICAO", "UNIDADE"],
                [f"C-{unique}", "Café", "UN"],
            ],
            f"map-{unique}.xlsx",
        ),
    )
    batch_id = payload["batch"]["id"]
    mapped = migrated_client.post(
        f"/api/v1/imports/batches/{batch_id}/mapping",
        json={
            "source_code": "CODIGO",
            "original_description": "DESCRICAO",
            "original_unit": "UNID",
        },
    )
    assert mapped.status_code == 422
    error = mapped.json()["error"]
    assert error["code"] == "IMPORT_REQUIRED_COLUMN_MISSING"
    assert error["details"]["field"] == "original_unit"


def test_mapping_retries_after_stale_running_job(migrated_client) -> None:
    unique = uuid4().hex[:8]
    payload = _upload_import_batch_and_wait(
        migrated_client,
        xlsx_upload(
            [
                ["CODIGO", "DESCRICAO", "UNIDADE"],
                [f"R-{unique}", "Reprocessar", "UN"],
            ],
            f"retry-{unique}.xlsx",
        ),
    )
    batch_id = payload["batch"]["id"]
    foundation = migrated_client.get("/api/v1/foundation")
    organization_id = foundation.json()["data"]["organization"]["id"]

    key = job_key("import-mapping", organization_id, batch_id)
    set_running(key, 1, "Job obsoleto")
    mark_job_stale(key)

    mapped_payload = _apply_mapping_and_wait(
        migrated_client,
        batch_id,
        {
            "source_code": "CODIGO",
            "original_description": "DESCRICAO",
            "original_unit": "UNIDADE",
        },
    )
    assert mapped_payload["batch"]["status"] == "COMPLETED"


def test_invalid_xlsx_content_is_rejected(migrated_client) -> None:
    unique = uuid4().hex[:8]
    response = migrated_client.post(
        "/api/v1/imports/batches",
        files={
            "file": (
                f"planilha-{unique}.xlsx",
                BytesIO(b"conteudo-invalido"),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "IMPORT_FILE_INVALID"


def test_csv_extension_is_rejected(migrated_client) -> None:
    unique = uuid4().hex[:8]
    response = migrated_client.post(
        "/api/v1/imports/batches",
        files={
            "file": (
                f"planilha-{unique}.csv",
                BytesIO(b"CODIGO,DESCRICAO,UNIDADE\nA1,Item,UN\n"),
                "text/csv",
            )
        },
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "IMPORT_FILE_INVALID"


def test_delete_import_batch_removes_data(migrated_client) -> None:
    unique = uuid4().hex[:8]
    upload = migrated_client.post(
        "/api/v1/imports/batches",
        files=xlsx_upload(
            [
                ["CODIGO", "DESCRICAO", "UNIDADE"],
                [f"DEL-{unique}", "Item", "UN"],
            ],
            f"delete-{unique}.xlsx",
        ),
    )
    assert upload.status_code == 202, upload.text
    batch_id = upload.json()["data"]["batch_id"]

    _delete_import_batch_and_wait(migrated_client, batch_id)

    missing = migrated_client.get(f"/api/v1/imports/batches/{batch_id}")
    assert missing.status_code == 404


def test_delete_import_batch_is_tenant_scoped(migrated_client) -> None:
    other_org_id = uuid4()
    other_batch_id = uuid4()
    other_system_id = uuid4()
    session: Session = SessionLocal()
    try:
        session.add(
            Organization(
                id=other_org_id,
                name=f"Org {other_org_id.hex[:6]}",
                status="ACTIVE",
            )
        )
        session.flush()
        session.add(
            SourceSystem(
                id=other_system_id,
                organization_id=other_org_id,
                name=f"ERP {other_system_id.hex[:6]}",
                status="ACTIVE",
            )
        )
        session.flush()
        session.add(
            ImportBatch(
                id=other_batch_id,
                organization_id=other_org_id,
                source_system_id=other_system_id,
                file_name="secreto.xlsx",
                file_type="xlsx",
                file_hash="c" * 64,
                status="COMPLETED",
            )
        )
        session.commit()
    finally:
        session.close()

    response = migrated_client.delete(f"/api/v1/imports/batches/{other_batch_id}")
    assert response.status_code == 404


def test_foreign_tenant_batch_is_not_visible(migrated_client) -> None:
    other_org_id = uuid4()
    other_user_id = uuid4()
    other_system_id = uuid4()
    other_batch_id = uuid4()
    session: Session = SessionLocal()
    try:
        session.add(
            Organization(
                id=other_org_id,
                name=f"Org {other_org_id.hex[:6]}",
                status="ACTIVE",
            )
        )
        session.add(
            User(
                id=other_user_id,
                name="Outro",
                email=f"other-{other_user_id.hex[:8]}@example.invalid",
                status="ACTIVE",
            )
        )
        session.flush()
        session.add(
            OrganizationUser(
                organization_id=other_org_id,
                user_id=other_user_id,
                role="operator",
                status="ACTIVE",
            )
        )
        session.add(
            SourceSystem(
                id=other_system_id,
                organization_id=other_org_id,
                name=f"ERP {other_system_id.hex[:6]}",
                status="ACTIVE",
            )
        )
        session.flush()
        session.add(
            ImportBatch(
                id=other_batch_id,
                organization_id=other_org_id,
                source_system_id=other_system_id,
                file_name="secreto.xlsx",
                file_type="xlsx",
                file_hash="b" * 64,
                status="COMPLETED",
            )
        )
        session.commit()
    finally:
        session.close()

    hidden = migrated_client.get(f"/api/v1/imports/batches/{other_batch_id}")
    assert hidden.status_code == 404
    assert hidden.json()["error"]["code"] == "NOT_FOUND"

    mapped = migrated_client.post(
        f"/api/v1/imports/batches/{other_batch_id}/mapping",
        json={
            "source_code": "CODIGO",
            "original_description": "DESCRICAO",
            "original_unit": "UNIDADE",
        },
    )
    assert mapped.status_code == 404
