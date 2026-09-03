from uuid import uuid4

from helpers.imports import _apply_mapping_and_wait, _upload_import_batch_and_wait
from helpers.matching import _run_matching_and_wait
from helpers.normalization import _run_normalization_and_wait
from helpers.spreadsheet import xlsx_upload


def _import_and_normalize_batch(migrated_client, unique: str | None = None):
    token = unique or uuid4().hex[:8]
    payload = _upload_import_batch_and_wait(
        migrated_client,
        xlsx_upload(
            [
                ["CODIGO", "DESCRICAO", "UNIDADE", "MARCA"],
                [f"A-{token}", "Arroz 1kg", "un", "Marca A"],
                [f"B-{token}", "Arroz 1kg", "un", "Marca A"],
                [f"C-{token}", "Sal fino", "un", "Marca B"],
            ],
            f"match-{token}.xlsx",
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
    _run_normalization_and_wait(migrated_client, batch_id)
    return batch_id, token


def test_matching_run_finds_equivalent_candidates(migrated_client) -> None:
    batch_id, token = _import_and_normalize_batch(migrated_client)
    summary = _run_matching_and_wait(migrated_client, batch_id)
    assert summary["processed_records"] == 3
    assert summary["equivalent_records"] >= 1
    assert summary["candidates_created"] >= 1
    assert summary["evidences_created"] >= 1

    results = migrated_client.get(
        f"/api/v1/matching/batches/{batch_id}/results?page=1&page_size=20"
    )
    assert results.status_code == 200
    items = results.json()["data"]["items"]
    arroz = next(item for item in items if item["record"]["source_code"] == f"A-{token}")
    assert arroz["result"]["result"] == "EQUIVALENT"
    assert len(arroz["top_candidates"]) >= 1
    assert arroz["top_candidates"][0]["candidate_source_code"] == f"B-{token}"


def test_matching_rejects_foreign_batch(migrated_client) -> None:
    response = migrated_client.post(f"/api/v1/matching/batches/{uuid4()}/run")
    assert response.status_code == 404
