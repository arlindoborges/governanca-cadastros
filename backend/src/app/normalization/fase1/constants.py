from __future__ import annotations

from dataclasses import dataclass

FASE1_VERSION = "1.2"

IDENTIFIERS_PROTECTED: tuple[str, ...] = tuple(
    dict.fromkeys(
        [
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
    )
)
IDENTIFIERS_PROTECTED = tuple(sorted(IDENTIFIERS_PROTECTED, key=len, reverse=True))


@dataclass(frozen=True)
class SimpleColor:
    color: str
    family: str


SIMPLE_COLORS: tuple[SimpleColor, ...] = tuple(
    sorted(
        [
            SimpleColor("AZUL", "AZUL"),
            SimpleColor("BRANCO", "BRANCO"),
            SimpleColor("BRANCA", "BRANCO"),
            SimpleColor("VERDE", "VERDE"),
            SimpleColor("PRETO", "PRETO"),
            SimpleColor("PRETA", "PRETO"),
            SimpleColor("CINZA", "CINZA"),
            SimpleColor("LARANJA", "LARANJA"),
            SimpleColor("VERMELHO", "VERMELHO"),
            SimpleColor("VERMELHA", "VERMELHO"),
            SimpleColor("AMARELO", "AMARELO"),
            SimpleColor("AMARELA", "AMARELO"),
            SimpleColor("TRANSPARENTE", "TRANSPARENTE"),
            SimpleColor("INCOLOR", "INCOLOR"),
            SimpleColor("MARROM", "MARROM"),
            SimpleColor("BEGE", "BEGE"),
            SimpleColor("ROSA", "ROSA"),
        ],
        key=lambda item: len(item.color),
        reverse=True,
    )
)

COMPOUND_COLORS: tuple[str, ...] = tuple(
    sorted(
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
)


@dataclass(frozen=True)
class BrandTerm:
    term: str
    kind: str


BRAND_TERMS: tuple[BrandTerm, ...] = tuple(
    sorted(
        [
            BrandTerm("STIHL", "MARCA"),
            BrandTerm("BIC", "MARCA"),
            BrandTerm("DELL", "MARCA"),
            BrandTerm("SAMSUNG", "MARCA"),
            BrandTerm("INTELBRAS", "MARCA"),
            BrandTerm("INTEL", "MARCA"),
            BrandTerm("KINGSTON", "MARCA"),
            BrandTerm("LOGITECH", "MARCA"),
            BrandTerm("SPARTAN", "MARCA"),
            BrandTerm("KARCHER", "MARCA"),
            BrandTerm("JACTO", "MARCA"),
            BrandTerm("EKKOA", "MARCA"),
            BrandTerm("MARINE FRESH", "LINHA_COMERCIAL"),
            BrandTerm("SOLV FRESH", "LINHA_COMERCIAL"),
            BrandTerm("CLEAN GLASS", "LINHA_COMERCIAL"),
            BrandTerm("WHITE CLEAN", "LINHA_COMERCIAL"),
            BrandTerm("CLEAN BY PEROXI", "LINHA_COMERCIAL"),
            BrandTerm("YELLOW PINE", "LINHA_COMERCIAL"),
            BrandTerm("POWER PINE", "LINHA_COMERCIAL"),
            BrandTerm("BOWL CLEANSE", "LINHA_COMERCIAL"),
            BrandTerm("COSTA OESTE", "IDENTIFICACAO_INTERNA"),
            BrandTerm("GRABIN", "IDENTIFICACAO_INTERNA"),
            BrandTerm("GRAGIN", "IDENTIFICACAO_INTERNA"),
            BrandTerm("FACILITIES", "IDENTIFICACAO_INTERNA"),
            BrandTerm("FACILITEIS", "IDENTIFICACAO_INTERNA"),
            BrandTerm("FILIAL", "MARCADOR_LEGADO"),
        ],
        key=lambda item: len(item.term),
        reverse=True,
    )
)

UNIFORM_SIZES: tuple[str, ...] = tuple(
    sorted(
        [
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
        ],
        key=len,
        reverse=True,
    )
)

UNIFORM_EPI_TERMS: tuple[str, ...] = (
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
)

COLOR_AS_PRODUCT_TERMS: tuple[str, ...] = (
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
)

PROTECTED_COLOR_EXPRESSIONS: tuple[str, ...] = ("OURO BRANCO",)
