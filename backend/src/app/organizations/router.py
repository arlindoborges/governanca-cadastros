from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import get_db
from app.core.errors import AppError
from app.organizations.schemas import FoundationResponse
from app.organizations.service import get_local_foundation

router = APIRouter(tags=["foundation"])


@router.get("/foundation", response_model=FoundationResponse)
def read_foundation(session: Session = Depends(get_db)) -> FoundationResponse:
    if not get_settings().is_local_identity_allowed:
        raise AppError(
            "NOT_FOUND",
            "Recurso não encontrado.",
            status_code=404,
        )
    return FoundationResponse(data=get_local_foundation(session))
