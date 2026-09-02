from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.db import SessionLocal
from app.core.errors import error_body

router = APIRouter(tags=["health"])


@router.get("/health/live")
def live() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/health/ready", response_model=None)
def ready() -> dict[str, str] | JSONResponse:
    session: Session = SessionLocal()
    try:
        session.execute(text("SELECT 1"))
        return {"status": "ok", "database": "ok"}
    except Exception:
        return JSONResponse(
            status_code=503,
            content=error_body(
                "DATABASE_UNAVAILABLE",
                "O banco de dados não está disponível.",
            ),
        )
    finally:
        session.close()
