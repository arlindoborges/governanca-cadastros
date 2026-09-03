from io import BytesIO

from openpyxl import Workbook

from governanca.sanitization.decision_config import default_sanitization_config


def _save_default_config(client) -> None:
    client.put("/api/v1/sanitization-config", json=default_sanitization_config())


def _build_xlsx(rows: list[tuple[str, str, str]]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.append(["codigo", "descricao", "unidade"])
    for row in rows:
        ws.append(list(row))
    buffer = BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


def _import_and_treat(client, project_id: str, rows: list[tuple[str, str, str]]) -> str:
    content = _build_xlsx(rows)
    files = {"file": ("base.xlsx", content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    data = {
        "source_code": "codigo",
        "original_description": "descricao",
        "original_unit": "unidade",
    }
    batch_id = client.post(f"/api/v1/projects/{project_id}/imports", files=files, data=data).json()["data"]["batch_id"]
    client.post(f"/api/v1/batches/{batch_id}/sanitize").raise_for_status()
    client.post(f"/api/v1/batches/{batch_id}/diagnostics/apply").raise_for_status()
    return batch_id


def test_manual_master_unification(client) -> None:
    _save_default_config(client)
    project_id = client.post("/api/v1/projects", json={"name": "DE/PARA"}).json()["data"]["id"]
    _import_and_treat(
        client,
        project_id,
        [
            ("A1", "AGUA SANITARIA 5 (FILIAIS)", "UN"),
            ("A2", "AGUA SANITARIA 5 LT FILIAL", "UN"),
            ("A3", "AGUA SANITARIA 5 LT", "UN"),
        ],
    )

    masters = client.get("/api/v1/master-products?page_size=10").json()["data"]["items"]
    assert len(masters) == 3

    target = masters[0]
    de_masters = masters[1:]
    result = client.post(
        "/api/v1/master-products/unify",
        json={
            "selected_master_ids": [item["id"] for item in masters],
            "target_master_id": target["id"],
            "conversion_factors": [
                {"master_id": de_masters[0]["id"], "factor": 2.5},
                {"master_id": de_masters[1]["id"], "factor": 0.5},
            ],
        },
    ).json()["data"]
    assert result["unified_masters"] == 2
    assert result["target_master_code"] == target["master_code"]

    active = client.get("/api/v1/master-products?page_size=10").json()["data"]["items"]
    assert len(active) == 1
    assert active[0]["id"] == target["id"]

    inactive = client.get("/api/v1/master-products?status=INACTIVE&page_size=10").json()["data"]["items"]
    assert len(inactive) == 2

    mappings = client.get("/api/v1/mappings").json()["data"]["items"]
    de_para = [item for item in mappings if item["mapping_type"] == "DE_PARA"]
    assert len(de_para) == 2
    assert {item["master_code"] for item in de_para} == {target["master_code"]}
    factors = {round(item["conversion_factor"], 1) for item in de_para}
    assert factors == {2.5, 0.5}

    blocked = client.post(
        "/api/v1/master-products/unify",
        json={
            "selected_master_ids": [inactive[0]["id"], target["id"]],
            "target_master_id": target["id"],
        },
    )
    assert blocked.status_code == 422
