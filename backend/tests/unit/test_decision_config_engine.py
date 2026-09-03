from governanca.sanitization import sanitize_description
from governanca.sanitization.decision_config import default_sanitization_config


def test_respeita_escolha_alternativa_no_passo_01() -> None:
    config = default_sanitization_config()
    for decision in config["steps"][0]["decisions"]:
        if decision["key"] == "accents":
            decision["choice"] = "alternative"
        if decision["key"] == "case":
            decision["choice"] = "adopted"

    result = sanitize_description("Álcool em Gel", config)
    assert "Á" in result or "á" in result.lower()
    assert result.isupper()
