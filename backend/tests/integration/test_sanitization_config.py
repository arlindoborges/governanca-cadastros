from governanca.sanitization.decision_config import default_sanitization_config


def test_save_config_and_require_for_sanitize(client) -> None:
    blocked = client.post("/api/v1/projects", json={"name": "P"})
    project_id = blocked.json()["data"]["id"]

    config = default_sanitization_config()
    for decision in config["steps"][0]["decisions"]:
        if decision["key"] == "accents":
            decision["choice"] = "alternative"
    saved = client.put("/api/v1/sanitization-config", json=config).json()["data"]
    assert saved["configured"] is True

    project = client.post("/api/v1/projects", json={"name": "Com config"}).json()["data"]
    # sanity: first project still exists from before if not deleted - ignore

    from io import BytesIO

    from openpyxl import Workbook

    wb = Workbook()
    ws = wb.active
    ws.append(["codigo", "descricao", "unidade"])
    ws.append(["A1", "Álcool em Gel", "UN"])
    buf = BytesIO()
    wb.save(buf)

    files = {"file": ("base.xlsx", buf.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    data = {"source_code": "codigo", "original_description": "descricao", "original_unit": "unidade"}
    batch_id = client.post(f"/api/v1/projects/{project['id']}/imports", files=files, data=data).json()["data"]["batch_id"]

    result = client.post(f"/api/v1/batches/{batch_id}/sanitize").json()["data"]
    assert result["processed"] == 1


def test_sanitize_blocked_without_config(client, engine) -> None:
    from sqlalchemy.orm import sessionmaker

    from governanca.models import SanitizationConfigProfile

    cleanup = sessionmaker(bind=engine, autoflush=False, autocommit=False)()
    cleanup.query(SanitizationConfigProfile).delete()
    cleanup.commit()
    cleanup.close()

    project = client.post("/api/v1/projects", json={"name": "Sem config"}).json()["data"]
    from io import BytesIO

    from openpyxl import Workbook

    wb = Workbook()
    ws = wb.active
    ws.append(["codigo", "descricao", "unidade"])
    ws.append(["B1", "Papel", "UN"])
    buf = BytesIO()
    wb.save(buf)
    files = {"file": ("base.xlsx", buf.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    data = {"source_code": "codigo", "original_description": "descricao", "original_unit": "unidade"}
    batch_id = client.post(f"/api/v1/projects/{project['id']}/imports", files=files, data=data).json()["data"]["batch_id"]

    response = client.post(f"/api/v1/batches/{batch_id}/sanitize")
    assert response.status_code == 422
    assert "decisões" in response.json()["error"]["message"].lower()
