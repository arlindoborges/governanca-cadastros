from governanca.sanitization import sanitize_description


def test_normaliza_espacos_maiusculas_e_acentos() -> None:
    assert sanitize_description("Álcool   em Gel") == "ALCOOL EM GEL"


def test_normaliza_unidades_e_quantidades() -> None:
    assert sanitize_description("5 FOLHAS") == "5 FL"
    assert sanitize_description("500ML") == "500 ML"


def test_reorganiza_cola_branca_semantica_segura() -> None:
    assert sanitize_description("COLA 100 G BRANCA") == "COLA BRANCA 100 G"
