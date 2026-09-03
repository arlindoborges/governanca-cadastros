def _wait_import_processing(
    migrated_client,
    batch_id: str,
    *,
    scope: str,
    not_found_message: str,
) -> dict:
    path = (
        f"/api/v1/imports/batches/{batch_id}/upload/status"
        if scope == "import-upload"
        else f"/api/v1/imports/batches/{batch_id}/mapping/status"
    )
    status = migrated_client.get(path)
    assert status.status_code == 200, status.text
    data = status.json()["data"]
    assert data["status"] == "COMPLETED", data
    assert data["preview"] is not None
    return data["preview"]


def _upload_import_batch_and_wait(migrated_client, files) -> dict:
    response = migrated_client.post("/api/v1/imports/batches", files=files)
    assert response.status_code == 202, response.text
    batch_id = response.json()["data"]["batch_id"]
    return _wait_import_processing(migrated_client, batch_id, scope="import-upload", not_found_message="")


def _apply_mapping_and_wait(migrated_client, batch_id: str, payload: dict) -> dict:
    response = migrated_client.post(
        f"/api/v1/imports/batches/{batch_id}/mapping",
        json=payload,
    )
    assert response.status_code == 202, response.text
    return _wait_import_processing(
        migrated_client,
        batch_id,
        scope="import-mapping",
        not_found_message="",
    )


def _delete_import_batch_and_wait(migrated_client, batch_id: str) -> dict:
    response = migrated_client.delete(f"/api/v1/imports/batches/{batch_id}")
    assert response.status_code == 202, response.text
    status = migrated_client.get(f"/api/v1/imports/batches/{batch_id}/delete/status")
    assert status.status_code == 200, status.text
    data = status.json()["data"]
    assert data["status"] == "COMPLETED", data
    return data
