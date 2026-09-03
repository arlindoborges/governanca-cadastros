from __future__ import annotations

import time

POLL_INTERVAL_SECONDS = 0.05
POLL_TIMEOUT_SECONDS = 30


def _wait_job(migrated_client, path: str, *, preview: bool = False) -> dict:
    deadline = time.monotonic() + POLL_TIMEOUT_SECONDS
    last = None
    while time.monotonic() < deadline:
        status = migrated_client.get(path)
        assert status.status_code == 200, status.text
        last = status.json()["data"]
        if last["status"] == "COMPLETED":
            if preview:
                assert last["preview"] is not None
                return last["preview"]
            return last
        if last["status"] == "FAILED":
            raise AssertionError(last)
        time.sleep(POLL_INTERVAL_SECONDS)
    raise AssertionError(last)


def _wait_import_processing(
    migrated_client,
    batch_id: str,
    *,
    scope: str,
    not_found_message: str,
) -> dict:
    _ = not_found_message
    path = (
        f"/api/v1/imports/batches/{batch_id}/upload/status"
        if scope == "import-upload"
        else f"/api/v1/imports/batches/{batch_id}/mapping/status"
    )
    return _wait_job(migrated_client, path, preview=True)


def _upload_import_batch_and_wait(migrated_client, files) -> dict:
    response = migrated_client.post("/api/v1/imports/batches", files=files)
    assert response.status_code == 202, response.text
    batch_id = response.json()["data"]["batch_id"]
    return _wait_import_processing(
        migrated_client,
        batch_id,
        scope="import-upload",
        not_found_message="",
    )


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
    return _wait_job(migrated_client, f"/api/v1/imports/batches/{batch_id}/delete/status")
