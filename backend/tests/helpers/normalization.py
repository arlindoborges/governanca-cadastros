from helpers.imports import _wait_job


def _run_normalization_and_wait(
    migrated_client, batch_id: str, payload: dict | None = None
) -> dict:
    response = migrated_client.post(
        f"/api/v1/normalization/batches/{batch_id}/run",
        json=payload or {},
    )
    assert response.status_code == 202, response.text
    data = _wait_job(
        migrated_client,
        f"/api/v1/normalization/batches/{batch_id}/run/status",
    )
    assert data["summary"] is not None
    return data["summary"]
