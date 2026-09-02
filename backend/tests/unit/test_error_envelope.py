from app.core.errors import error_body
from app.core.request_context import REQUEST_ID_HEADER, request_id_var


def test_error_envelope_contains_stable_fields() -> None:
    token = request_id_var.set("req-test-1")
    try:
        body = error_body("NOT_FOUND", "Recurso não encontrado.", {"field": "id"})
    finally:
        request_id_var.reset(token)

    assert body == {
        "error": {
            "code": "NOT_FOUND",
            "message": "Recurso não encontrado.",
            "details": {"field": "id"},
            "request_id": "req-test-1",
        }
    }
    assert REQUEST_ID_HEADER == "X-Request-ID"
