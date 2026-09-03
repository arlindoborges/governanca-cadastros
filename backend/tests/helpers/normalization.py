def _run_normalization_and_wait(migrated_client, batch_id: str) -> dict:
    response = migrated_client.post(f"/api/v1/normalization/batches/{batch_id}/run")
    assert response.status_code == 202, response.text
    status = migrated_client.get(f"/api/v1/normalization/batches/{batch_id}/run/status")
    assert status.status_code == 200, status.text
    data = status.json()["data"]
    assert data["status"] == "COMPLETED", data
    assert data["summary"] is not None
    return data["summary"]
