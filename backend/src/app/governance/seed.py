from uuid import UUID

from sqlalchemy.orm import Session

from app.core.seed import LOCAL_ORGANIZATION_ID
from app.governance.models import (
    AttributeDefinition,
    GovernanceProfile,
    GovernanceProfileVersion,
    NormalizationRule,
)

LOCAL_GOVERNANCE_PROFILE_ID = UUID("a1e1c3f4-1111-4111-8111-000000000020")
LOCAL_GOVERNANCE_PROFILE_VERSION_ID = UUID("a1e1c3f4-1111-4111-8111-000000000021")
LOCAL_BRAND_ATTRIBUTE_ID = UUID("a1e1c3f4-1111-4111-8111-000000000022")
LOCAL_CADASTRE_UNIT_ATTRIBUTE_ID = UUID("a1e1c3f4-1111-4111-8111-000000000023")
LOCAL_RULE_DESCRIPTION_ID = UUID("a1e1c3f4-1111-4111-8111-000000000024")
LOCAL_RULE_UNIT_ID = UUID("a1e1c3f4-1111-4111-8111-000000000025")

LOCAL_PROFILE_NAME = "Perfil Local MVP"
STATUS_ACTIVE = "ACTIVE"


def ensure_local_governance(session: Session) -> None:
    profile = session.get(GovernanceProfile, LOCAL_GOVERNANCE_PROFILE_ID)
    if profile is None:
        session.add(
            GovernanceProfile(
                id=LOCAL_GOVERNANCE_PROFILE_ID,
                organization_id=LOCAL_ORGANIZATION_ID,
                name=LOCAL_PROFILE_NAME,
                description="Perfil de governança controlado do ambiente local.",
                status=STATUS_ACTIVE,
            )
        )
    else:
        profile.name = LOCAL_PROFILE_NAME
        profile.status = STATUS_ACTIVE

    session.flush()

    version = session.get(GovernanceProfileVersion, LOCAL_GOVERNANCE_PROFILE_VERSION_ID)
    if version is None:
        session.add(
            GovernanceProfileVersion(
                id=LOCAL_GOVERNANCE_PROFILE_VERSION_ID,
                governance_profile_id=LOCAL_GOVERNANCE_PROFILE_ID,
                organization_id=LOCAL_ORGANIZATION_ID,
                version_number=1,
                status=STATUS_ACTIVE,
            )
        )
    else:
        version.status = STATUS_ACTIVE

    session.flush()

    brand = session.get(AttributeDefinition, LOCAL_BRAND_ATTRIBUTE_ID)
    if brand is None:
        session.add(
            AttributeDefinition(
                id=LOCAL_BRAND_ATTRIBUTE_ID,
                organization_id=LOCAL_ORGANIZATION_ID,
                code="BRAND",
                name="Marca",
                data_type="TEXT",
                description="Marca do produto extraída da coluna MARCA do arquivo de origem.",
                status=STATUS_ACTIVE,
            )
        )
    else:
        brand.status = STATUS_ACTIVE

    unit_attr = session.get(AttributeDefinition, LOCAL_CADASTRE_UNIT_ATTRIBUTE_ID)
    if unit_attr is None:
        session.add(
            AttributeDefinition(
                id=LOCAL_CADASTRE_UNIT_ATTRIBUTE_ID,
                organization_id=LOCAL_ORGANIZATION_ID,
                code="CADASTRE_UNIT",
                name="Unidade cadastral normalizada",
                data_type="TEXT",
                description="Unidade cadastral após regras determinísticas.",
                status=STATUS_ACTIVE,
            )
        )
    else:
        unit_attr.status = STATUS_ACTIVE

    session.flush()

    desc_rule = session.get(NormalizationRule, LOCAL_RULE_DESCRIPTION_ID)
    if desc_rule is None:
        session.add(
            NormalizationRule(
                id=LOCAL_RULE_DESCRIPTION_ID,
                governance_profile_version_id=LOCAL_GOVERNANCE_PROFILE_VERSION_ID,
                organization_id=LOCAL_ORGANIZATION_ID,
                rule_type="DESCRIPTION_COLLAPSE_WHITESPACE",
                priority=10,
                status=STATUS_ACTIVE,
            )
        )

    unit_rule = session.get(NormalizationRule, LOCAL_RULE_UNIT_ID)
    if unit_rule is None:
        session.add(
            NormalizationRule(
                id=LOCAL_RULE_UNIT_ID,
                governance_profile_version_id=LOCAL_GOVERNANCE_PROFILE_VERSION_ID,
                organization_id=LOCAL_ORGANIZATION_ID,
                rule_type="UNIT_UPPERCASE",
                priority=20,
                status=STATUS_ACTIVE,
            )
        )

    session.commit()
