from __future__ import annotations

from copy import deepcopy
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from governanca.core.errors import AppError
from governanca.core.tenant import Tenant
from governanca.models import SanitizationConfigProfile
from governanca.sanitization.decision_config import (
    SanitizationConfigDocument,
    default_sanitization_config,
    validate_config_payload,
)


def _normalize_stored_config(config: dict[str, Any]) -> SanitizationConfigDocument:
    return validate_config_payload(config)


def get_sanitization_config(session: Session, tenant: Tenant) -> dict[str, Any] | None:
    profile = session.scalar(
        select(SanitizationConfigProfile).where(
            SanitizationConfigProfile.organization_id == tenant.organization_id
        )
    )
    if profile is None:
        return None
    return {
        "configured": True,
        "updated_at": profile.updated_at.isoformat(),
        "config": _normalize_stored_config(profile.config),
    }


def get_active_sanitization_config(session: Session, tenant: Tenant) -> SanitizationConfigDocument:
    profile = session.scalar(
        select(SanitizationConfigProfile).where(
            SanitizationConfigProfile.organization_id == tenant.organization_id
        )
    )
    if profile is None:
        raise AppError(
            "CONFIG_REQUIRED",
            "Configure as decisões de saneamento antes de executar a Fase 1.",
            status_code=422,
        )
    return deepcopy(_normalize_stored_config(profile.config))


def save_sanitization_config(session: Session, tenant: Tenant, payload: dict[str, Any]) -> dict[str, Any]:
    try:
        config = validate_config_payload(payload)
    except ValueError as exc:
        raise AppError("VALIDATION_ERROR", str(exc), status_code=422) from exc

    profile = session.scalar(
        select(SanitizationConfigProfile).where(
            SanitizationConfigProfile.organization_id == tenant.organization_id
        )
    )
    if profile is None:
        profile = SanitizationConfigProfile(
            organization_id=tenant.organization_id,
            config=config,
        )
        session.add(profile)
    else:
        profile.config = config
    session.commit()
    session.refresh(profile)
    return {
        "configured": True,
        "updated_at": profile.updated_at.isoformat(),
        "config": _normalize_stored_config(profile.config),
    }


def get_default_sanitization_config() -> dict[str, Any]:
    return {
        "configured": False,
        "config": default_sanitization_config(),
    }
