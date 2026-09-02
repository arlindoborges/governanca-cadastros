from fastapi.testclient import TestClient

from app.main import app


def test_unknown_route_uses_error_envelope() -> None:
    client = TestClient(app)
    response = client.get("/api/v1/nao-existe", headers={"X-Request-ID": "req-404"})

    assert response.status_code == 404
    assert response.headers["X-Request-ID"] == "req-404"
    body = response.json()
    assert body["error"]["code"] == "NOT_FOUND"
    assert body["error"]["request_id"] == "req-404"
    assert "message" in body["error"]
    assert "details" in body["error"]
