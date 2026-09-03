from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


engine = create_engine(
    get_settings().database_url,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_reset_on_return="rollback",
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


def release_request_transaction(session: Session) -> None:
    """Encerra a transação HTTP antes de jobs em background.

    O FastAPI só fecha a sessão depois das background tasks; transação aberta
    segura lock e trava exclusão/mapeamento.
    """
    session.rollback()
