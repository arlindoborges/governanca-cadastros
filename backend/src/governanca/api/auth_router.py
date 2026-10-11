from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from governanca.core.config import get_settings
from governanca.core.db import get_db
from governanca.core.errors import AppError
from governanca.core.security import create_access_token, decode_access_token
from governanca.services import auth as auth_svc

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=200)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


def _user_payload(user) -> dict:
    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
    }


def _set_auth_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=token,
        httponly=True,
        samesite="lax",
        max_age=settings.auth_token_expire_minutes * 60,
        path="/",
    )


@router.post("/register")
def register(body: RegisterIn, response: Response, session: Session = Depends(get_db)) -> dict:
    user = auth_svc.register_user(session, body.email, body.password, body.full_name)
    token = create_access_token(user.id)
    _set_auth_cookie(response, token)
    return {"data": {"access_token": token, "token_type": "bearer", "user": _user_payload(user)}}


@router.post("/login")
def login(body: LoginIn, response: Response, session: Session = Depends(get_db)) -> dict:
    user = auth_svc.authenticate_user(session, body.email, body.password)
    token = create_access_token(user.id)
    _set_auth_cookie(response, token)
    return {"data": {"access_token": token, "token_type": "bearer", "user": _user_payload(user)}}


@router.post("/logout")
def logout(response: Response) -> dict:
    settings = get_settings()
    response.delete_cookie(key=settings.auth_cookie_name, path="/")
    return {"data": {"ok": True}}


def get_token_from_request(request: Request) -> str | None:
    settings = get_settings()
    cookie = request.cookies.get(settings.auth_cookie_name)
    if cookie:
        return cookie
    auth = request.headers.get("Authorization", "")
    if auth.lower().startswith("bearer "):
        return auth[7:].strip() or None
    return None


def get_current_user_id(request: Request) -> UUID:
    token = get_token_from_request(request)
    if not token:
        raise AppError("UNAUTHORIZED", "Autenticação necessária.", status_code=401)
    user_id = decode_access_token(token)
    if not user_id:
        raise AppError("UNAUTHORIZED", "Sessão inválida ou expirada.", status_code=401)
    return user_id


@router.get("/me")
def me(request: Request, session: Session = Depends(get_db)) -> dict:
    user_id = get_current_user_id(request)
    user = auth_svc.get_user_by_id(session, user_id)
    if not user:
        raise AppError("UNAUTHORIZED", "Usuário não encontrado.", status_code=401)
    return {"data": _user_payload(user)}
