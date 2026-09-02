from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.db import SessionLocal
from app.core.errors import register_error_handlers
from app.core.health import router as health_router
from app.core.request_context import RequestIdMiddleware
from app.core.seed import ensure_local_foundation
from app.organizations.router import router as foundation_router


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings = get_settings()
    if settings.app_env == "local":
        session = SessionLocal()
        try:
            ensure_local_foundation(session)
        except Exception:
            session.rollback()
        finally:
            session.close()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    application = FastAPI(
        title="Governança de Cadastros",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs" if settings.docs_enabled else None,
        redoc_url="/redoc" if settings.docs_enabled else None,
        openapi_url="/openapi.json" if settings.docs_enabled else None,
    )
    application.add_middleware(RequestIdMiddleware)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=False,
        allow_methods=["GET", "OPTIONS"],
        allow_headers=["Content-Type", "X-Request-ID"],
    )
    register_error_handlers(application)
    application.include_router(health_router)
    application.include_router(foundation_router, prefix="/api/v1")
    return application


app = create_app()
