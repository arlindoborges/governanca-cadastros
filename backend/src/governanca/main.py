from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from governanca.api.router import router
from governanca.core.config import get_settings
from governanca.core.db import SessionLocal
from governanca.core.errors import register_error_handlers
from governanca.services.pipeline import ensure_organization


@asynccontextmanager
async def lifespan(_app: FastAPI):
    session = SessionLocal()
    try:
        ensure_organization(session)
    finally:
        session.close()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Governança de Cadastros", version="0.2.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type"],
    )
    register_error_handlers(app)
    app.include_router(router, prefix="/api/v1")
    return app


app = create_app()
