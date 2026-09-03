"""Fase 1 — saneamento de descrições de cadastro (v1.2)."""

from __future__ import annotations

import re
import unicodedata
from typing import TypedDict


class _BlocoCor(TypedDict):
    texto: str
    inicio: int
    fim: int
    familia: str


class _TermoMarca(TypedDict):
    termo: str
    tipo: str
    inicio: int
    fim: int


_FASE1_IDENTIFICADORES_RAW = [
    "DS-K1T673DX-BR",
    "DS-K3G200LX-R",
    "AVA1500-60-1P",
    "AA-PBUN3AB",
    "DS-KAB6-ZUI",
    "DS-K7P04",
    "SA400S37",
    "1202SFX",
    "BCM57810S",
    "JBLC50HIBLK",
    "MLB4389589506",
    "NP350XAA",
    "PZ6029FX",
    "DTC1250E",
    "A.P.HD585",
    "AC1300",
    "AP1000T",
    "4103FDW",
    "I5-7400T",
    "TBES200H",
    "AA-PBUN3AB",
    "55DU8000",
    "FC-6S",
    "SM-X115",
    "C920E",
    "C-1000",
    "CDC-10",
    "PFL6520",
    "LTH1842",
    "MK120",
    "MZ560",
    "NVR08",
    "R730XD",
    "UE300C",
    "WD19S",
    "Z560X",
    "H730P",
    "JL685A",
    "NP350XAA",
    "PZ6029FX",
    "120U",
    "240H",
    "800X",
    "A06",
    "A33",
    "A260",
    "B-173",
    "BR420",
    "C-10",
    "C-15",
    "C15",
    "C621B",
    "CAT6",
    "CDC10",
    "CF300",
    "CI3",
    "CJ24",
    "CR80",
    "DA17",
    "DDR4",
    "DDR5",
    "DP722",
    "EC52",
    "EK221Q",
    "F307",
    "FH52",
    "FS220",
    "G04S",
    "G05",
    "G06",
    "H2D2",
    "HD585",
    "IM5",
    "K3XX",
    "K20A",
    "M90",
    "MCB-045",
    "MK2",
    "MZ52",
    "MZ54",
    "N20KJ",
    "NT200",
    "NT3000",
    "NV3",
    "P05",
    "P10",
    "PU40",
    "PX-29",
    "PZ60",
    "RC2",
    "RJ45",
    "RT-14",
    "RZ4824F",
    "SR420",
    "T3UU",
    "T20A",
    "TC310",
    "WD40",
    "X115",
]

FASE1_IDENTIFICADORES_PROTEGIDOS = sorted(
    dict.fromkeys(_FASE1_IDENTIFICADORES_RAW),
    key=len,
    reverse=True,
)

FASE1_CORES_SIMPLES = sorted(
    [
        {"cor": "AZUL", "familia": "AZUL"},
        {"cor": "BRANCO", "familia": "BRANCO"},
        {"cor": "BRANCA", "familia": "BRANCO"},
        {"cor": "VERDE", "familia": "VERDE"},
        {"cor": "PRETO", "familia": "PRETO"},
        {"cor": "PRETA", "familia": "PRETO"},
        {"cor": "CINZA", "familia": "CINZA"},
        {"cor": "LARANJA", "familia": "LARANJA"},
        {"cor": "VERMELHO", "familia": "VERMELHO"},
        {"cor": "VERMELHA", "familia": "VERMELHO"},
        {"cor": "AMARELO", "familia": "AMARELO"},
        {"cor": "AMARELA", "familia": "AMARELO"},
        {"cor": "TRANSPARENTE", "familia": "TRANSPARENTE"},
        {"cor": "INCOLOR", "familia": "INCOLOR"},
        {"cor": "MARROM", "familia": "MARROM"},
        {"cor": "BEGE", "familia": "BEGE"},
        {"cor": "ROSA", "familia": "ROSA"},
    ],
    key=lambda item: len(item["cor"]),
    reverse=True,
)

FASE1_CORES_COMPOSTAS = sorted(
    [
        "AZUL MARINHO",
        "AZUL CLARO",
        "AZUL ROYAL",
        "CINZA CHUMBO",
        "CINZA MESCLADO",
        "CINZA CLARO",
        "VERDE BANDEIRA",
        "VERDE OLIVA",
        "BRANCO LEITOSO",
    ],
    key=len,
    reverse=True,
)

FASE1_MARCAS = sorted(
    [
        {"termo": "STIHL", "tipo": "MARCA"},
        {"termo": "BIC", "tipo": "MARCA"},
        {"termo": "DELL", "tipo": "MARCA"},
        {"termo": "SAMSUNG", "tipo": "MARCA"},
        {"termo": "INTELBRAS", "tipo": "MARCA"},
        {"termo": "INTEL", "tipo": "MARCA"},
        {"termo": "KINGSTON", "tipo": "MARCA"},
        {"termo": "LOGITECH", "tipo": "MARCA"},
        {"termo": "SPARTAN", "tipo": "MARCA"},
        {"termo": "KARCHER", "tipo": "MARCA"},
        {"termo": "JACTO", "tipo": "MARCA"},
        {"termo": "EKKOA", "tipo": "MARCA"},
        {"termo": "MARINE FRESH", "tipo": "LINHA_COMERCIAL"},
        {"termo": "SOLV FRESH", "tipo": "LINHA_COMERCIAL"},
        {"termo": "CLEAN GLASS", "tipo": "LINHA_COMERCIAL"},
        {"termo": "WHITE CLEAN", "tipo": "LINHA_COMERCIAL"},
        {"termo": "CLEAN BY PEROXI", "tipo": "LINHA_COMERCIAL"},
        {"termo": "YELLOW PINE", "tipo": "LINHA_COMERCIAL"},
        {"termo": "POWER PINE", "tipo": "LINHA_COMERCIAL"},
        {"termo": "BOWL CLEANSE", "tipo": "LINHA_COMERCIAL"},
        {"termo": "COSTA OESTE", "tipo": "IDENTIFICACAO_INTERNA"},
        {"termo": "GRABIN", "tipo": "IDENTIFICACAO_INTERNA"},
        {"termo": "GRAGIN", "tipo": "IDENTIFICACAO_INTERNA"},
        {"termo": "FACILITIES", "tipo": "IDENTIFICACAO_INTERNA"},
        {"termo": "FACILITEIS", "tipo": "IDENTIFICACAO_INTERNA"},
        {"termo": "FILIAL", "tipo": "MARCADOR_LEGADO"},
    ],
    key=lambda item: len(item["termo"]),
    reverse=True,
)

FASE1_TAMANHOS = [
    "EXXG",
    "EXGG",
    "XXG",
    "XGG",
    "EXG",
    "EGG",
    "GG",
    "G1",
    "G2",
    "G3",
    "G4",
    "G5",
    "EG",
    "PP",
    "XG",
    "P",
    "M",
    "G",
]


from governanca.sanitization.decision_config import (
    SanitizationConfigDocument,
    decision_adopted,
    step_active,
)


def sanitize_description(original: str, config: SanitizationConfigDocument | None = None) -> str:
    """Pipeline homologado dos Passos 01 a 12 da Fase 1."""
    if original is None or str(original).strip() == "":
        return ""

    texto = str(original)
    if decision_adopted(config, "01", "spaces"):
        texto = _normalizar_espacos(texto)
    else:
        texto = texto.strip()

    if decision_adopted(config, "01", "cedilla") and not decision_adopted(config, "01", "accents"):
        texto = texto.replace("Ç", "C").replace("ç", "c")
    elif decision_adopted(config, "01", "accents"):
        texto = _remover_acentuacao_fase1(texto)

    if decision_adopted(config, "01", "case"):
        texto = str(texto).upper()

    p_id = {"texto": texto, "mapa": {}}
    if step_active(config, "02"):
        p_id = _proteger_identificadores(texto)
        texto = p_id["texto"]

    p_tam = {"texto": texto, "mapa": {}}
    if step_active(config, "08A"):
        p_tam = _proteger_tamanhos_uniforme_epi(texto)
        texto = p_tam["texto"]

    p_barra = {"texto": texto, "mapa": {}}
    if step_active(config, "07"):
        p_barra = _proteger_p_barra(texto)
        texto = p_barra["texto"]

    if step_active(config, "03"):
        texto = _normalizar_unidades_quantidades(texto)
    if step_active(config, "04"):
        texto = _normalizar_especificacoes_tecnicas(texto)
    if step_active(config, "05"):
        texto = _normalizar_dimensoes_multiplicadores(texto)
    if step_active(config, "06"):
        texto = _normalizar_embalagem_logistica(texto)
    if step_active(config, "07"):
        texto = _restaurar_mapa(texto, p_barra["mapa"])
        texto = _normalizar_abreviacoes_barra(texto)
    if step_active(config, "08A"):
        texto = _normalizar_tamanhos_numericos_uniforme_epi(texto)
    if step_active(config, "08B"):
        texto = _normalizar_pontuacao(texto)
    if step_active(config, "08C"):
        texto = _normalizar_caracteres_especiais(texto)
    if step_active(config, "08A"):
        texto = _restaurar_mapa(texto, p_tam["mapa"])
    if step_active(config, "09"):
        texto = _normalizar_posicao_cores(texto)
    if step_active(config, "10"):
        texto = _reposicionar_marcas(texto)
    if step_active(config, "11"):
        texto = _normalizar_estrutura_segura(texto)
    if step_active(config, "02"):
        texto = _restaurar_mapa(texto, p_id["mapa"])
    if step_active(config, "12"):
        texto = _normalizar_semantica_segura_fase1(texto)

    return _normalizar_espacos(texto)


def _normalizar_espacos(texto: str) -> str:
    return re.sub(r"\s+", " ", str(texto).strip())


def _remover_acentuacao_fase1(texto: str) -> str:
    texto = str(texto).replace("Ç", "C").replace("ç", "c")
    texto = unicodedata.normalize("NFD", texto)
    return "".join(c for c in texto if unicodedata.category(c) != "Mn")


def _escapar_regex(texto: str) -> str:
    return re.escape(str(texto))


def _proteger_identificadores(texto: str) -> dict[str, object]:
    resultado = str(texto)
    mapa: dict[str, str] = {}
    contador = 0

    for identificador in FASE1_IDENTIFICADORES_PROTEGIDOS:
        regex = re.compile(
            r"(^|[^A-Z0-9])(" + _escapar_regex(identificador) + r")(?=$|[^A-Z0-9])"
        )

        def replacer(match: re.Match[str], _id: str = identificador) -> str:
            nonlocal contador
            chave = f"ZZID{contador:05d}ZZ"
            mapa[chave] = _id
            contador += 1
            return match.group(1) + chave

        resultado = regex.sub(replacer, resultado)

    return {"texto": resultado, "mapa": mapa}


def _restaurar_mapa(texto: str, mapa: dict[str, str]) -> str:
    resultado = str(texto)
    for chave, valor in mapa.items():
        resultado = resultado.replace(chave, valor)
    return resultado


def _eh_contexto_uniforme_epi(descricao: str) -> bool:
    termos = [
        "CAMISA",
        "CAMISETA",
        "CAMISETE",
        "BABY LOOK",
        "BLUSA",
        "BLAZER",
        "SUETER",
        "CALCA",
        "CALÇA",
        "BERMUDA",
        "JAQUETA",
        "CONJUNTO COPEIRA",
        "CONJUNTO PIJAMA",
        "CONJUNTO PVC",
        "GANDOLA",
        "GRAVATA",
        "LENCO",
        "LENÇO",
        "JALECO",
        "AVENTAL",
        "TOUCA",
        "LUVA",
        "BOTA",
        "BOTINA",
        "SAPATO",
        "TENIS",
        "COLETE",
        "UNIFORME",
        "EPI",
        "CAPACETE",
        "MASCARA",
        "RESPIRADOR",
        "OCULOS",
        "PROTETOR",
        "PERNEIRA",
    ]
    texto = str(descricao).upper()
    return any(termo in texto for termo in termos)


def _proteger_tamanhos_uniforme_epi(texto: str) -> dict[str, object]:
    descricao = str(texto).upper()
    if not _eh_contexto_uniforme_epi(descricao):
        return {"texto": descricao, "mapa": {}}

    resultado = descricao
    mapa: dict[str, str] = {}
    contador = 0

    for tamanho in sorted(FASE1_TAMANHOS, key=len, reverse=True):
        regex = re.compile(
            r"(^|\s)(" + _escapar_regex(tamanho) + r")(?=$|\s|[(),;])"
        )

        def replacer(match: re.Match[str], tam: str = tamanho) -> str:
            nonlocal contador
            valor = match.group(2)
            prefixo = match.group(1)
            inicio_valor = match.start() + len(prefixo)
            antes = match.string[:inicio_valor].rstrip()

            if valor in ("G", "M", "P") and re.search(r"\d(?:[.,]\d+)?\s*$", antes):
                return match.group(0)

            chave = f"ZZTAM{contador:05d}ZZ"
            mapa[chave] = valor
            contador += 1
            return prefixo + chave

        resultado = regex.sub(replacer, resultado)

    return {"texto": resultado, "mapa": mapa}


def _proteger_p_barra(texto: str) -> dict[str, object]:
    resultado = str(texto)
    mapa: dict[str, str] = {}
    contador = 0

    def replacer(_match: re.Match[str]) -> str:
        nonlocal contador
        chave = f"ZZPBARRA{contador:04d}ZZ"
        mapa[chave] = "P/ "
        contador += 1
        return chave

    resultado = re.sub(r"\bP/\s*", replacer, resultado)
    return {"texto": resultado, "mapa": mapa}


def _normalizar_unidades_quantidades(texto: str) -> str:
    resultado = str(texto)

    conversoes = [
        ("FOLHAS", "FL"),
        ("FOLHA", "FL"),
        ("FLS", "FL"),
        ("UNID", "UN"),
        ("UND", "UN"),
        ("PCT", "PC"),
        ("PCS", "PC"),
        ("GRS", "G"),
        ("GR", "G"),
        ("LITROS", "LT"),
        ("LITRO", "LT"),
        ("LTS", "LT"),
        ("METROS", "MT"),
        ("METRO", "MT"),
        ("MTS", "MT"),
    ]

    for origem, destino in conversoes:
        regex = re.compile(r"(\d+(?:[.,]\d+)?)\s*" + origem + r"\b")
        resultado = regex.sub(r"\1 " + destino, resultado)

    unidades = ["KG", "G", "ML", "LT", "KM", "MT", "CM", "MM", "UN", "PC", "FL", "CX"]
    for unidade in sorted(unidades, key=len, reverse=True):
        regex = re.compile(r"(\d+(?:[.,]\d+)?)\s*" + unidade + r"\b")
        resultado = regex.sub(r"\1 " + unidade, resultado)

    resultado = re.sub(r"(\d+(?:[.,]\d+)?)\s*L\b", r"\1 LT", resultado)
    resultado = re.sub(r"(\d+(?:[.,]\d+)?)\s*M\b", r"\1 MT", resultado)

    return _normalizar_espacos(resultado)


def _formatar_milhar_tecnico(numero: str) -> str:
    valor = str(numero).replace(".", "")
    parts: list[str] = []
    for i, char in enumerate(reversed(valor)):
        if i > 0 and i % 3 == 0:
            parts.append(".")
        parts.append(char)
    return "".join(reversed(parts))


def _normalizar_especificacoes_tecnicas(texto: str) -> str:
    resultado = str(texto)

    def replacer_milhar(match: re.Match[str]) -> str:
        return _formatar_milhar_tecnico(match.group(1)) + "MT/S"

    resultado = re.sub(r"\b(\d{4,})\s*MT\s*/\s*S\b", replacer_milhar, resultado)
    resultado = re.sub(r"\b(\d{1,3})\s*MT\s*/\s*S\b", r"\1MT/S", resultado)

    preservados: dict[str, str] = {}
    contador = 0

    def proteger(pattern: str) -> None:
        nonlocal resultado, contador

        def guard(match: re.Match[str]) -> str:
            nonlocal contador
            chave = f"ZZTEC{contador:05d}ZZ"
            preservados[chave] = match.group(0)
            contador += 1
            return chave

        resultado = re.sub(pattern, guard, resultado)

    proteger(r"\b\d{1,2}W\d{2}\b")
    proteger(r"\bPFF-?\d+\b")
    proteger(r"\b\d{1,3}(?:\.\d{3})*MT/S\b")

    resultado = re.sub(
        r"\b(\d{1,3})\s+000\s*(BTUS?|RPM|MAH|W|KW|K|HZ|GHZ|MHZ|KHZ)\b",
        r"\g<1>000\2",
        resultado,
    )

    siglas = [
        "BTUS",
        "BTU",
        "KV",
        "V",
        "KW",
        "W",
        "MAH",
        "AH",
        "AMP",
        "A",
        "OHMS",
        "OHM",
        "GHZ",
        "MHZ",
        "KHZ",
        "HZ",
        "GBPS",
        "MBPS",
        "TB",
        "GB",
        "MB",
        "DBI",
        "DB",
        "AWG",
        "RPM",
        "MP",
        "MS",
        "P",
        "K",
    ]

    for sigla in sorted(siglas, key=len, reverse=True):
        regex = re.compile(r"(\d+(?:[.,]\d+)?)\s*" + _escapar_regex(sigla) + r"\b")
        resultado = regex.sub(r"\1" + sigla, resultado)

    regex_milhar = re.compile(
        r"\b(\d{4,})(?=(" + "|".join(_escapar_regex(s) for s in siglas) + r")\b)"
    )
    resultado = regex_milhar.sub(lambda m: _formatar_milhar_tecnico(m.group(1)), resultado)

    resultado = _restaurar_mapa(resultado, preservados)
    return _normalizar_espacos(resultado)


def _normalizar_dimensoes_multiplicadores(texto: str) -> str:
    resultado = str(texto)
    unidades = ["KM", "MT", "CM", "MM", "M", "KG", "G", "ML", "LT", "L", "UN", "PC", "FL"]
    bloco = "|".join(_escapar_regex(u) for u in unidades)

    regex_x = re.compile(
        r"(\d+(?:[.,]\d+)?(?:\s*(?:" + bloco + r"))?)\s*X\s*(?=\d)",
        re.IGNORECASE,
    )
    resultado = regex_x.sub(r"\1 X ", resultado)
    resultado = re.sub(r"(\d+(?:[.,]\d+)?)\s+X\s+(?=\d)", r"\1 X ", resultado)
    resultado = _normalizar_unidades_quantidades(resultado)
    resultado = _normalizar_especificacoes_tecnicas(resultado)

    return _normalizar_espacos(resultado)


def _normalizar_embalagem_logistica(texto: str) -> str:
    resultado = str(texto)
    siglas = ["CX", "FD", "MC"]
    bloco_siglas = "|".join(_escapar_regex(s) for s in siglas)
    unidades = ["KG", "G", "ML", "LT", "KM", "MT", "CM", "MM", "UN", "PC", "FL", "CX"]
    bloco_unidades = "|".join(_escapar_regex(u) for u in unidades)

    r1 = re.compile(
        r"(\d+(?:[.,]\d+)?\s+(?:" + bloco_unidades + r"))\s+(" + bloco_siglas + r")\s+(?=(?:C/\s*)?\d)"
    )
    resultado = r1.sub(r"\1 - \2 ", resultado)

    r2 = re.compile(
        r"(\d+(?:[.,]\d+)?\s+X\s+\d+(?:[.,]\d+)?(?:\s+(?:CM|MM|MT))?)\s+("
        + bloco_siglas
        + r")\s+(?=\d)"
    )
    resultado = r2.sub(r"\1 - \2 ", resultado)

    r3 = re.compile(
        r"(\d+(?:[.,]\d+)?\s+(?:" + bloco_unidades + r"))\s+(" + bloco_siglas + r")\s+C/\s*(?=\d)"
    )
    resultado = r3.sub(r"\1 - \2 C/ ", resultado)

    r4 = re.compile(r"(^|\s)(" + bloco_siglas + r")\s+C/\s*(?=\d)")

    def replacer_r4(match: re.Match[str]) -> str:
        return " - " + match.group(2) + " C/ "

    resultado = r4.sub(replacer_r4, resultado)

    resultado = re.sub(r"\s+-\s+-\s+", " - ", resultado)
    resultado = re.sub(r"\s*-\s*(?=(?:CX|FD|MC)\b)", " - ", resultado)

    return _normalizar_espacos(resultado)


def _normalizar_abreviacoes_barra(texto: str) -> str:
    resultado = str(texto)
    resultado = re.sub(r"\bC/\s*", "C/ ", resultado)
    resultado = re.sub(r"\bS/\s*", "S/ ", resultado)
    resultado = re.sub(r"\bP/\s*", "P/ ", resultado)
    return _normalizar_espacos(resultado)


def _normalizar_tamanhos_numericos_uniforme_epi(texto: str) -> str:
    resultado = str(texto)
    if not _eh_contexto_uniforme_epi(resultado):
        return resultado

    resultado = re.sub(
        r"\bTAM\.?\s*(?:N\s*[º°.]?\s*)?(\d{1,3})\b",
        r"N.\1",
        resultado,
    )
    resultado = re.sub(r"\bN\s*[º°.]?\s*(\d{1,3})\b", r"N.\1", resultado)
    resultado = re.sub(
        r"\bTAM\.?\s+(PP|P|M|G|GG|XG|XGG|EXG|EXGG|XXG|EXXG|EG|EGG|G1|G2|G3|G4|G5)\b",
        r"\1",
        resultado,
    )
    resultado = re.sub(r"\bTAM\.?\s+UNICO\b", "UNICO", resultado)

    return _normalizar_espacos(resultado)


def _normalizar_pontuacao(texto: str) -> str:
    resultado = str(texto)
    resultado = re.sub(r"\s+,", ",", resultado)
    resultado = re.sub(r"\s+;", ";", resultado)
    resultado = re.sub(r"\s+:", ":", resultado)
    resultado = re.sub(r"\s+\.", ".", resultado)
    resultado = re.sub(
        r",([A-ZÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ])",
        r", \1",
        resultado,
    )
    resultado = re.sub(
        r";([A-ZÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ])",
        r"; \1",
        resultado,
    )
    resultado = re.sub(
        r":([A-ZÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ])",
        r": \1",
        resultado,
    )
    resultado = re.sub(r",{2,}", ",", resultado)
    resultado = re.sub(r";{2,}", ";", resultado)
    resultado = re.sub(r":{2,}", ":", resultado)
    return _normalizar_espacos(resultado)


def _normalizar_caracteres_especiais(texto: str) -> str:
    resultado = str(texto)
    resultado = re.sub(r"\bN\s*[º°.]?\s*(\d{1,3})\b", r"N.\1", resultado)
    resultado = re.sub(r"[º°ª]", "", resultado)
    resultado = re.sub(r"[“”„]", '"', resultado)
    resultado = re.sub(r"[''´`]", "'", resultado)
    resultado = re.sub(r"[\x00-\x1f\x7f-\x9f]", " ", resultado)
    resultado = resultado.replace("\u00a0", " ")
    return _normalizar_espacos(resultado)


def _possui_expressao_cor_protegida(descricao: str) -> bool:
    return any(x in str(descricao).upper() for x in ["OURO BRANCO"])


def _eh_contexto_cor_como_nome_produto(descricao: str) -> bool:
    termos = [
        "ARROZ",
        "FEIJAO",
        "CHA",
        "CHOCOLATE",
        "VINHO",
        "CAFE",
        "ACUCAR",
        "FARINHA",
        "FUBA",
        "PIMENTA",
        "UVA",
        "CARVAO",
        "GRAFITE",
    ]
    texto = str(descricao).upper()
    return any(t in texto for t in termos)


def _identificar_cores_descricao(texto: str) -> dict[str, object]:
    descricao = str(texto).upper()
    blocos: list[_BlocoCor] = []
    familias: set[str] = set()
    mascara = descricao

    for cor_composta in FASE1_CORES_COMPOSTAS:
        regex = re.compile(
            r"(^|\s)" + _escapar_regex(cor_composta) + r"(?=$|\s|[,;:.()\-])"
        )
        for match in regex.finditer(mascara):
            prefixo = match.group(1) or ""
            inicio = match.start() + len(prefixo)
            fim = inicio + len(cor_composta)
            blocos.append(
                {
                    "texto": descricao[inicio:fim],
                    "inicio": inicio,
                    "fim": fim,
                    "familia": cor_composta,
                }
            )
            familias.add(cor_composta)
            mascara = (
                mascara[:inicio] + " " * len(cor_composta) + mascara[fim:]
            )

    for item in FASE1_CORES_SIMPLES:
        regex = re.compile(
            r"(^|\s)" + _escapar_regex(item["cor"]) + r"(?=$|\s|[,;:.()\-])"
        )
        for match in regex.finditer(mascara):
            prefixo = match.group(1) or ""
            inicio = match.start() + len(prefixo)
            fim = inicio + len(item["cor"])
            blocos.append(
                {
                    "texto": descricao[inicio:fim],
                    "inicio": inicio,
                    "fim": fim,
                    "familia": item["familia"],
                }
            )
            familias.add(item["familia"])

    blocos.sort(key=lambda b: b["inicio"])
    return {"blocos": blocos, "familias": familias}


def _remover_bloco_cor(texto: str, bloco: _BlocoCor) -> str:
    antes = str(texto)[: bloco["inicio"]]
    depois = str(texto)[bloco["fim"] :]
    return _normalizar_espacos(antes + " " + depois)


def _inserir_cor_antes_do_tamanho(base: str, cor: str, match_tamanho: object) -> str:
    if isinstance(match_tamanho, re.Match):
        inicio = match_tamanho.start()
        tamanho = match_tamanho.group(0)
    else:
        inicio = match_tamanho["index"]  # type: ignore[index]
        tamanho = match_tamanho.get("texto") or match_tamanho[0]  # type: ignore[index]

    antes = base[:inicio].strip()
    depois = base[inicio + len(tamanho) :].strip()
    resultado = _normalizar_espacos(f"{antes} {cor} {tamanho}")
    if depois:
        resultado = _normalizar_espacos(f"{resultado} {depois}")
    return resultado


def _posicionar_cor_uniforme_epi(texto: str, cor: str) -> str:
    base = str(texto).strip()
    match_numerico = re.search(r"\bN\.\d{1,3}\b", base)
    if match_numerico:
        return _inserir_cor_antes_do_tamanho(base, cor, match_numerico)

    lista = [
        "EXXG",
        "EXGG",
        "XXG",
        "XGG",
        "EXG",
        "EGG",
        "GG",
        "G1",
        "G2",
        "G3",
        "G4",
        "G5",
        "EG",
        "PP",
        "XG",
        "P",
        "M",
        "G",
        "UNICO",
    ]
    candidatos: list[dict[str, object]] = []

    for tamanho in lista:
        regex = re.compile(r"\b" + _escapar_regex(tamanho) + r"\b")
        for match in regex.finditer(base):
            if tamanho in ("P", "M", "G"):
                antes = base[: match.start()].rstrip()
                if re.search(r"\d(?:[.,]\d+)?\s*$", antes):
                    continue
            candidatos.append({"texto": match.group(0), "index": match.start()})

    if not candidatos:
        return _normalizar_espacos(f"{base} {cor}")

    candidatos.sort(key=lambda c: c["index"], reverse=True)  # type: ignore[arg-type, return-value]
    return _inserir_cor_antes_do_tamanho(base, cor, candidatos[0])


def _normalizar_posicao_cores(texto: str) -> str:
    resultado = str(texto).strip()
    principal = resultado
    embalagem = ""

    match_embalagem = re.search(r"\s+-\s+(CX|FD|MC)\b.*$", resultado)
    if match_embalagem:
        embalagem = match_embalagem.group(0).strip()
        principal = resultado[: match_embalagem.start()].strip()

    identificacao = _identificar_cores_descricao(principal)
    blocos: list[_BlocoCor] = identificacao["blocos"]  # type: ignore[assignment]
    familias: set[str] = identificacao["familias"]  # type: ignore[assignment]

    if not blocos:
        return resultado
    if len(familias) > 1:
        return resultado
    if len(blocos) != 1:
        return resultado
    if _possui_expressao_cor_protegida(principal):
        return resultado
    if _eh_contexto_cor_como_nome_produto(principal):
        return resultado

    bloco_cor = blocos[0]
    cor = bloco_cor["texto"]
    base = _remover_bloco_cor(principal, bloco_cor)
    base = _normalizar_espacos(base)

    if _eh_contexto_uniforme_epi(principal):
        principal = _posicionar_cor_uniforme_epi(base, cor)
    else:
        principal = _normalizar_espacos(f"{base} {cor}")

    resultado = f"{principal} {embalagem}" if embalagem else principal
    return _normalizar_espacos(resultado)


def _localizar_termos_marca(texto: str) -> list[_TermoMarca]:
    encontrados: list[_TermoMarca] = []
    mascara = str(texto).upper()

    for item in FASE1_MARCAS:
        regex = re.compile(
            r"(^|[^A-Z0-9])(" + _escapar_regex(item["termo"]) + r")(?=$|[^A-Z0-9])"
        )
        for match in regex.finditer(mascara):
            prefixo = match.group(1) or ""
            inicio = match.start() + len(prefixo)
            fim = inicio + len(item["termo"])
            encontrados.append(
                {
                    "termo": item["termo"],
                    "tipo": item["tipo"],
                    "inicio": inicio,
                    "fim": fim,
                }
            )
            mascara = mascara[:inicio] + " " * len(item["termo"]) + mascara[fim:]

    return encontrados


def _remover_todas_ocorrencias_marca(texto: str, termo: str) -> str:
    regex = re.compile(
        r"(^|[^A-Z0-9])(" + _escapar_regex(termo) + r")(?=$|[^A-Z0-9])"
    )
    resultado = regex.sub(lambda m: m.group(1), str(texto))
    resultado = re.sub(r"\(\s*\)", " ", resultado)
    return _normalizar_espacos(resultado)


def _reposicionar_marcas(texto: str) -> str:
    resultado = _normalizar_espacos(texto)
    principal = resultado
    embalagem = ""

    match_embalagem = re.search(r"\s+-\s+(CX|FD|MC)\b.*$", resultado)
    if match_embalagem:
        embalagem = match_embalagem.group(0).strip()
        principal = resultado[: match_embalagem.start()].strip()

    encontrados = _localizar_termos_marca(principal)
    if not encontrados:
        return resultado

    termos_distintos = list(dict.fromkeys(x["termo"] for x in encontrados))
    if len(termos_distintos) > 1:
        return resultado

    termo = termos_distintos[0]
    item = next((x for x in FASE1_MARCAS if x["termo"] == termo), None)
    if item is None:
        return resultado

    permitidos = ["MARCA", "LINHA_COMERCIAL", "IDENTIFICACAO_INTERNA", "MARCADOR_LEGADO"]
    if item["tipo"] not in permitidos:
        return resultado

    principal = _remover_todas_ocorrencias_marca(principal, termo)
    principal = re.sub(r"\(\s*\)", " ", principal)
    principal = _normalizar_espacos(principal)
    principal = _normalizar_espacos(f"{principal} {termo}")

    resultado = f"{principal} {embalagem}" if embalagem else principal
    return _normalizar_espacos(resultado)


def _contar_caracter(texto: str, caractere: str) -> int:
    return str(texto).count(caractere)


def _normalizar_complementos_conhecidos(texto: str) -> str:
    r = str(texto)
    r = re.sub(r"\(\s*SEM\s+LOGO\s*\)", "(SEM LOGO)", r)
    r = re.sub(r"\(\s*COM\s+LOGO\s*\)", "(COM LOGO)", r)
    r = re.sub(r"\(\s*TIPO\s+COLEGIAL\s*\)", "(TIPO COLEGIAL)", r)
    r = re.sub(r"\(\s*LOGO\s+COSTA\s+OESTE\s*\)", "(LOGO COSTA OESTE)", r)
    r = re.sub(
        r"\(\s*LOGO\s+BORDADO\s+COSTA\s+OESTE\s*\)",
        "(LOGO BORDADO COSTA OESTE)",
        r,
    )
    r = re.sub(r"\(\s*LOGO\s+GRABIN\s*\)", "(LOGO GRABIN)", r)
    r = re.sub(r"\(\s*LOGO\s+GRAGIN\s*\)", "(LOGO GRAGIN)", r)
    r = re.sub(r"\(\s*COSTA\s+OESTE\s*\)", "(COSTA OESTE)", r)
    r = re.sub(r"\(\s*GRABIN\s*\)", "(GRABIN)", r)
    r = re.sub(r"\(\s*GRAGIN\s*\)", "(GRAGIN)", r)
    r = re.sub(r"\(\s*FACILITIES\s*\)", "(FACILITIES)", r)
    r = re.sub(r"\(\s*FACILITEIS\s*\)", "(FACILITEIS)", r)
    r = re.sub(r"\(\s*FILIAL\s*\)", "(FILIAL)", r)
    return r


def _normalizar_estrutura_segura(texto: str) -> str:
    resultado = str(texto).strip()

    if _contar_caracter(resultado, "(") != _contar_caracter(resultado, ")"):
        return resultado

    resultado = re.sub(r"\(\s+", "(", resultado)
    resultado = re.sub(r"\s+\)", ")", resultado)
    resultado = re.sub(r"\(\s*\)", " ", resultado)
    resultado = re.sub(r"\s+\(", " (", resultado)
    resultado = re.sub(
        r"\)(?=[A-ZÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ0-9])",
        ") ",
        resultado,
    )
    resultado = _normalizar_complementos_conhecidos(resultado)
    resultado = re.sub(r"\s*,\s*\(", " (", resultado)
    resultado = re.sub(r"\s*;\s*\(", " (", resultado)

    return _normalizar_espacos(resultado)


def _normalizar_semantica_segura_fase1(texto: str) -> str:
    r = _normalizar_espacos(texto)

    r = re.sub(r"\b(ARMARIO|ARQUIVO)\s+ACO\b", r"\1 DE ACO", r)

    r = re.sub(
        r"\bCOLA\s+(\d+(?:[.,]\d+)?\s+(?:G|KG|ML|LT))\s+BRANCA\b",
        r"COLA BRANCA \1",
        r,
    )

    r = re.sub(
        r"\bCONCENTRADO\s+(?:DE\s+)?AGUA\s+SANITARIA\b",
        "AGUA SANITARIA CONCENTRADO",
        r,
    )
    r = re.sub(r"\bCONCENTRADO\s+DESINFETANTE\b", "DESINFETANTE CONCENTRADO", r)
    r = re.sub(
        r"\bCONCENTRADO\s+DETERGENTE\s+NEUTRO\b",
        "DETERGENTE NEUTRO CONCENTRADO",
        r,
    )
    r = re.sub(r"\bCONCENTRADO\s+MULTIUSO\b", "MULTIUSO CONCENTRADO", r)

    r = re.sub(r"\bCORRENTE\s+PARA\s+MOTOSSERRA\b", "CORRENTE MOTOSSERRA", r)

    r = re.sub(r"\bBALDE\s+PLASTICO\s+-\s+(?=\d)", "BALDE PLASTICO ", r)
    r = re.sub(r"\bBALDE\s+PLASTICO\s+DE\s+(?=\d)", "BALDE PLASTICO ", r)

    return _normalizar_espacos(r)
