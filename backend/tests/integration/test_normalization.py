from uuid import uuid4

from helpers.imports import _apply_mapping_and_wait, _upload_import_batch_and_wait
from helpers.normalization import _run_normalization_and_wait
from helpers.spreadsheet import xlsx_upload


def _import_sample_batch(migrated_client):
    unique = uuid4().hex[:8]
    payload = _upload_import_batch_and_wait(
        migrated_client,
        xlsx_upload(
            [
                ["CODIGO", "DESCRICAO", "UNIDADE", "MARCA"],
                [f"A-{unique}", "Arroz 1kg", "un", "Cereal Sul"],
                [f"B-{unique}", "Feijão", "kg", ""],
                [f"C-{unique}", "Sal", "un", "Marca Boa"],
            ],
            f"norm-{unique}.xlsx",
        ),
    )
    batch_id = payload["batch"]["id"]
    _apply_mapping_and_wait(
        migrated_client,
        batch_id,
        {
            "source_code": "CODIGO",
            "original_description": "DESCRICAO",
            "original_unit": "UNIDADE",
        },
    )
    return batch_id


def test_normalization_run_extracts_attributes_and_issues(migrated_client) -> None:
    batch_id = _import_sample_batch(migrated_client)
    summary = _run_normalization_and_wait(migrated_client, batch_id)
    assert summary["processed_records"] == 3
    assert summary["normalized_records"] == 2
    assert summary["pending_information_records"] == 1
    assert summary["attributes_created"] >= 4
    assert summary["issues_created"] == 1

    records = migrated_client.get(
        f"/api/v1/normalization/batches/{batch_id}/records?page=1&page_size=20"
    )
    assert records.status_code == 200
    items = records.json()["data"]["items"]
    assert len(items) == 3
    arroz = next(item for item in items if item["record"]["source_code"].startswith("A-"))
    assert arroz["record"]["normalized_description"] == "ARROZ 1 KG"
    assert arroz["record"]["processing_status"] == "NORMALIZED"
    brand_codes = [attr["attribute_code"] for attr in arroz["attributes"]]
    assert "BRAND" in brand_codes
    assert "CADASTRE_UNIT" in brand_codes

    issues = migrated_client.get(
        f"/api/v1/normalization/batches/{batch_id}/issues?page=1&page_size=20"
    )
    assert issues.status_code == 200
    assert issues.json()["data"]["total"] == 1
    assert issues.json()["data"]["items"][0]["issue_type"] == "MISSING_INFORMATION"


def test_normalization_rejects_foreign_batch(migrated_client) -> None:
    response = migrated_client.post(f"/api/v1/normalization/batches/{uuid4()}/run")
    assert response.status_code == 404


def test_normalization_extracts_brand_from_description(migrated_client) -> None:
    unique = uuid4().hex[:8]
    payload = _upload_import_batch_and_wait(
        migrated_client,
        xlsx_upload(
            [
                ["CODIGO", "DESCRICAO", "UNIDADE"],
                [f"S-{unique}", "Corrente para motosserra STIHL 3/8", "un"],
            ],
            f"norm-brand-{unique}.xlsx",
        ),
    )
    batch_id = payload["batch"]["id"]
    _apply_mapping_and_wait(
        migrated_client,
        batch_id,
        {
            "source_code": "CODIGO",
            "original_description": "DESCRICAO",
            "original_unit": "UNIDADE",
        },
    )

    summary = _run_normalization_and_wait(migrated_client, batch_id)
    assert summary["normalized_records"] == 1
    assert summary["pending_information_records"] == 0

    records = migrated_client.get(
        f"/api/v1/normalization/batches/{batch_id}/records?page=1&page_size=20"
    )
    item = records.json()["data"]["items"][0]
    brand_attrs = [attr for attr in item["attributes"] if attr["attribute_code"] == "BRAND"]
    assert len(brand_attrs) == 1
    assert brand_attrs[0]["value_text"] == "STIHL"
    assert brand_attrs[0]["extraction_method"] == "RULE_DERIVED"


def test_normalization_original_mode_preserves_description(migrated_client) -> None:
    unique = uuid4().hex[:8]
    payload = _upload_import_batch_and_wait(
        migrated_client,
        xlsx_upload(
            [
                ["CODIGO", "DESCRICAO", "UNIDADE"],
                [f"O-{unique}", "Feijão 1kg", "un"],
            ],
            f"norm-original-{unique}.xlsx",
        ),
    )
    batch_id = payload["batch"]["id"]
    _apply_mapping_and_wait(
        migrated_client,
        batch_id,
        {
            "source_code": "CODIGO",
            "original_description": "DESCRICAO",
            "original_unit": "UNIDADE",
        },
    )

    _run_normalization_and_wait(
        migrated_client,
        batch_id,
        {"description_mode": "original"},
    )
    records = migrated_client.get(
        f"/api/v1/normalization/batches/{batch_id}/records?page=1&page_size=20"
    )
    item = records.json()["data"]["items"][0]
    assert item["record"]["normalized_description"] == "Feijão 1kg"


def test_normalization_basica_mode_skips_fase1_steps(migrated_client) -> None:
    unique = uuid4().hex[:8]
    payload = _upload_import_batch_and_wait(
        migrated_client,
        xlsx_upload(
            [
                ["CODIGO", "DESCRICAO", "UNIDADE"],
                [f"B-{unique}", "Feijão 1kg", "un"],
            ],
            f"norm-basica-{unique}.xlsx",
        ),
    )
    batch_id = payload["batch"]["id"]
    _apply_mapping_and_wait(
        migrated_client,
        batch_id,
        {
            "source_code": "CODIGO",
            "original_description": "DESCRICAO",
            "original_unit": "UNIDADE",
        },
    )

    _run_normalization_and_wait(
        migrated_client,
        batch_id,
        {"description_mode": "basica"},
    )
    records = migrated_client.get(
        f"/api/v1/normalization/batches/{batch_id}/records?page=1&page_size=20"
    )
    item = records.json()["data"]["items"][0]
    assert item["record"]["normalized_description"] == "FEIJAO 1KG"
