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


def test_import_sanitize_match_and_preserve_original(client) -> None:
    _save_default_config(client)
    project = client.post("/api/v1/projects", json={"name": "Projeto Teste"}).json()["data"]
    project_id = project["id"]

    content = _build_xlsx(
        [
            ("A1", "Álcool em Gel 500ML", "UN"),
            ("A2", "ALCOOL EM GEL 500 ML", "UN"),
            ("B1", "Papel Higiênico", "UN"),
        ]
    )
    files = {"file": ("base.xlsx", content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    data = {
        "source_code": "codigo",
        "original_description": "descricao",
        "original_unit": "unidade",
    }
    batch_id = client.post(f"/api/v1/projects/{project_id}/imports", files=files, data=data).json()["data"]["batch_id"]

    sanitize = client.post(f"/api/v1/batches/{batch_id}/sanitize").json()["data"]
    assert sanitize["processed"] == 3
    assert sanitize["records"] == 3

    diagnostics = client.get(f"/api/v1/batches/{batch_id}/diagnostics").json()["data"]
    assert diagnostics["summary"]["total"] == 3
    assert diagnostics["summary"]["grupos_duplicidade"] == 1
    assert diagnostics["summary"]["duplicados"] == 2
    assert diagnostics["summary"]["unicos"] == 1
    dup_items = [item for item in diagnostics["items"] if item["identification"] == "DUPLICADO"]
    assert len(dup_items) == 2
    assert dup_items[0]["duplicate_reference"] == "DUP-EX-0001"
    assert dup_items[0]["sanitized_description"] == dup_items[1]["sanitized_description"]
    assert dup_items[0]["disposition"] == "MANTER"
    assert dup_items[1]["disposition"] == "INATIVAR"

    keep_first = client.put(
        f"/api/v1/batches/{batch_id}/diagnostics/dispositions",
        json={"source_record_id": dup_items[0]["id"], "disposition": "MANTER"},
    ).json()["data"]
    assert keep_first["disposition"] == "MANTER"

    swap = client.put(
        f"/api/v1/batches/{batch_id}/diagnostics/dispositions",
        json={"source_record_id": dup_items[1]["id"], "disposition": "MANTER"},
    ).json()["data"]
    assert {item["disposition"] for item in swap["updated"]} == {"MANTER", "INATIVAR"}

    blocked = client.put(
        f"/api/v1/batches/{batch_id}/diagnostics/dispositions",
        json={"source_record_id": dup_items[1]["id"], "disposition": "INATIVAR"},
    )
    assert blocked.status_code == 422

    treated = client.post(f"/api/v1/batches/{batch_id}/diagnostics/apply").json()["data"]
    assert treated["mantidos"] == 2
    assert treated["inativados"] == 1
    assert treated["masters_created"] == 2

    diagnostics_after = client.get(f"/api/v1/batches/{batch_id}/diagnostics").json()["data"]
    assert diagnostics_after["summary"]["tratados"] == 3
    inactive = next(
        item for item in diagnostics_after["items"] if item["record_status"] == "INATIVADO"
    )
    assert inactive["treated_code"].startswith("PRD-")

    queue = client.get(f"/api/v1/batches/{batch_id}/queue").json()["data"]["items"]
    assert queue

    originals = {item["source"]["original_description"] for item in queue}
    assert "Álcool em Gel 500ML" in originals

    group_code = next((item["governance_group_code"] for item in queue if item["governance_group_code"]), None)
    if group_code:
        decision = client.post(
            f"/api/v1/batches/{batch_id}/decisions",
            json={"decision": "CONFIRM_EQUIVALENT", "governance_group_code": group_code},
        ).json()["data"]["applied"]
        master_ids = {item["master_product_id"] for item in decision if item["master_product_id"]}
        assert len(master_ids) == 1

    masters = client.get("/api/v1/master-products").json()["data"]["items"]
    mappings = client.get("/api/v1/mappings").json()["data"]["items"]
    assert masters
    assert mappings

    inactive_master = next(item for item in masters if item["inactive_count"] > 0)
    inactive_records = client.get(
        f"/api/v1/master-products/{inactive_master['id']}/inactive-records"
    ).json()["data"]["items"]
    assert inactive_records
    assert inactive_records[0]["original_description"]


def test_match_requires_sanitization_and_batch_can_be_deleted(client) -> None:
    _save_default_config(client)
    project = client.post("/api/v1/projects", json={"name": "Fluxo Import"}).json()["data"]
    content = _build_xlsx([("A1", "Item teste", "UN")])
    files = {"file": ("fluxo.xlsx", content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    data = {
        "source_code": "codigo",
        "original_description": "descricao",
        "original_unit": "unidade",
    }
    batch_id = client.post(f"/api/v1/projects/{project['id']}/imports", files=files, data=data).json()["data"]["batch_id"]

    blocked = client.post(f"/api/v1/batches/{batch_id}/match")
    assert blocked.status_code == 422

    client.post(f"/api/v1/batches/{batch_id}/sanitize").raise_for_status()

    records = client.get(f"/api/v1/batches/{batch_id}/records?q=Item").json()["data"]
    assert records["total"] == 1
    assert records["items"][0]["sanitized_description"]

    client.post(f"/api/v1/batches/{batch_id}/match").raise_for_status()

    deleted = client.delete(f"/api/v1/batches/{batch_id}").json()["data"]
    assert deleted["deleted"] is True

    batches = client.get(f"/api/v1/projects/{project['id']}/batches").json()["data"]["items"]
    assert not any(item["id"] == batch_id for item in batches)
