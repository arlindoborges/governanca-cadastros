from __future__ import annotations

import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from governanca.core.errors import AppError
from governanca.core.security import hash_password, verify_password
from governanca.core.tenant import LOCAL_ORG_ID
from governanca.models import User

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def register_user(session: Session, email: str, password: str, full_name: str | None) -> User:
    normalized_email = email.strip().lower()
    if not _EMAIL_RE.match(normalized_email):
        raise AppError("VALIDATION_ERROR", "Informe um e-mail válido.", status_code=422)
    if len(password) < 8:
        raise AppError("VALIDATION_ERROR", "A senha deve ter pelo menos 8 caracteres.", status_code=422)

    existing = session.scalar(select(User).where(User.email == normalized_email))
    if existing:
        raise AppError("CONFLICT", "Este e-mail já está cadastrado.", status_code=409)

    user = User(
        organization_id=LOCAL_ORG_ID,
        email=normalized_email,
        password_hash=hash_password(password),
        full_name=full_name.strip() if full_name else None,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def authenticate_user(session: Session, email: str, password: str) -> User:
    normalized_email = email.strip().lower()
    user = session.scalar(select(User).where(User.email == normalized_email))
    if not user or not verify_password(password, user.password_hash):
        raise AppError("UNAUTHORIZED", "E-mail ou senha inválidos.", status_code=401)
    return user


def get_user_by_id(session: Session, user_id) -> User | None:
    return session.get(User, user_id)
