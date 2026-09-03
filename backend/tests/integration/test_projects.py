def test_update_and_delete_project(client) -> None:
    created = client.post("/api/v1/projects", json={"name": "Antigo", "description": "Desc antiga"}).json()["data"]
    project_id = created["id"]

    updated = client.patch(
        f"/api/v1/projects/{project_id}",
        json={"name": "Atualizado", "description": "Desc nova"},
    ).json()["data"]
    assert updated["name"] == "Atualizado"
    assert updated["description"] == "Desc nova"

    listed = client.get("/api/v1/projects").json()["data"]["items"]
    assert any(item["id"] == project_id and item["name"] == "Atualizado" for item in listed)

    deleted = client.delete(f"/api/v1/projects/{project_id}").json()["data"]
    assert deleted["deleted"] is True

    listed_after = client.get("/api/v1/projects").json()["data"]["items"]
    assert not any(item["id"] == project_id for item in listed_after)
