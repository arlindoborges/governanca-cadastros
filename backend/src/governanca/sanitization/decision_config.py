"""Configuração homologada das decisões da Fase 1 (Passos 01–12)."""

from __future__ import annotations

from copy import deepcopy
from typing import Any, Literal, TypedDict

ChoiceValue = Literal["adopted", "alternative"]


class StepDecision(TypedDict):
    key: str
    label: str
    adopted: str
    alternative: str
    choice: ChoiceValue


class SanitizationStep(TypedDict):
    code: str
    title: str
    objective: str
    enabled: bool
    decisions: list[StepDecision]


class SanitizationConfigDocument(TypedDict):
    version: int
    steps: list[SanitizationStep]
    principles: list[str]


DEFAULT_SANITIZATION_CONFIG: SanitizationConfigDocument = {
    "version": 1,
    "principles": [
        "Padronizar sem perder informação.",
        "Nunca criar informação que não exista no cadastro.",
        "Regras devem ser universais, não específicas de um produto.",
        "Toda alteração deve ser reversível e auditável.",
        "Casos de dúvida permanecem para revisão humana, não para automação.",
    ],
    "steps": [
        {
            "code": "01",
            "title": "Espaços, maiúsculas e acentos",
            "objective": "Eliminar variações puramente ortográficas.",
            "enabled": True,
            "decisions": [
                {
                    "key": "spaces",
                    "label": "Espaços",
                    "adopted": "Remover espaços duplos e espaços no início/fim",
                    "alternative": "Manter a formatação original",
                },
                {
                    "key": "case",
                    "label": "Capitalização",
                    "adopted": "Converter toda a descrição para MAIÚSCULAS",
                    "alternative": "Manter maiúsculas/minúsculas originais",
                },
                {
                    "key": "accents",
                    "label": "Acentuação",
                    "adopted": "Remover todos os acentos",
                    "alternative": "Preservar acentos",
                },
                {
                    "key": "cedilla",
                    "label": "Cedilha",
                    "adopted": "Converter Ç para C",
                    "alternative": "Manter Ç",
                },
            ],
        },
        {
            "code": "02",
            "title": "Identificadores protegidos",
            "objective": "Evitar perda de identidade técnica.",
            "enabled": True,
            "decisions": [
                {
                    "key": "technical_codes",
                    "label": "Modelos e códigos técnicos",
                    "adopted": "Preservar quando identificam o produto",
                    "alternative": "Remover todos os códigos",
                },
                {
                    "key": "commercial_refs",
                    "label": "Referências comerciais",
                    "adopted": "Manter códigos de peças, equipamentos e componentes",
                    "alternative": "Tratar como texto comum",
                },
            ],
        },
        {
            "code": "03",
            "title": "Unidades e quantidades",
            "objective": "Uniformizar todas as medidas.",
            "enabled": True,
            "decisions": [
                {
                    "key": "number_unit_space",
                    "label": "Separação número/unidade",
                    "adopted": "Inserir espaço entre número e unidade (500 ML)",
                    "alternative": "Manter 500ML",
                },
                {
                    "key": "liter",
                    "label": "Litro",
                    "adopted": "LT",
                    "alternative": "L",
                },
                {
                    "key": "unit",
                    "label": "Unidade",
                    "adopted": "UN",
                    "alternative": "UND",
                },
                {
                    "key": "package",
                    "label": "Pacote",
                    "adopted": "PC",
                    "alternative": "PCT",
                },
                {
                    "key": "sheets",
                    "label": "Folhas",
                    "adopted": "FL",
                    "alternative": "FOLHAS",
                },
                {
                    "key": "meter",
                    "label": "Metro",
                    "adopted": "MT",
                    "alternative": "M",
                },
                {
                    "key": "centimeter",
                    "label": "Centímetro",
                    "adopted": "CM",
                    "alternative": "CM sem padronização",
                },
                {
                    "key": "percent",
                    "label": "Percentual",
                    "adopted": "Manter junto ao número (70%)",
                    "alternative": "Separar (70 %)",
                },
                {
                    "key": "thousands",
                    "label": "Milhar",
                    "adopted": "Padronizar com ponto (12.000)",
                    "alternative": "Manter formatos variados",
                },
            ],
        },
        {
            "code": "04",
            "title": "Especificações técnicas",
            "objective": "Preservar informações funcionais.",
            "enabled": True,
            "decisions": [
                {
                    "key": "technical_siglas",
                    "label": "BTUS, AH, V, W, HP etc.",
                    "adopted": "Preservar como atributo técnico",
                    "alternative": "Remover por simplificação",
                },
                {
                    "key": "technical_sequence",
                    "label": "Sequência técnica",
                    "adopted": "Manter após o produto",
                    "alternative": "Reordenar livremente",
                },
            ],
        },
        {
            "code": "05",
            "title": "Dimensões e multiplicadores",
            "objective": "Tornar dimensões comparáveis.",
            "enabled": True,
            "decisions": [
                {
                    "key": "dimension_separator",
                    "label": "Medidas",
                    "adopted": "Padronizar com X (20 X 3,6)",
                    "alternative": "Misturar X, x, ×",
                },
                {
                    "key": "dimension_order",
                    "label": "Ordem das dimensões",
                    "adopted": "Preservar ordem original",
                    "alternative": "Reordenar automaticamente",
                },
                {
                    "key": "decimals",
                    "label": "Casas decimais",
                    "adopted": "Manter somente quando necessárias",
                    "alternative": "Arredondar valores",
                },
            ],
        },
        {
            "code": "06",
            "title": "Embalagem e logística",
            "objective": "Diferenciar produto da embalagem.",
            "enabled": True,
            "decisions": [
                {
                    "key": "logistics_packaging",
                    "label": "Embalagem logística",
                    "adopted": "Manter separada do produto",
                    "alternative": "Misturar embalagem na descrição",
                },
                {
                    "key": "master_box",
                    "label": "Caixa master",
                    "adopted": "Utilizar MC",
                    "alternative": "Escrever CAIXA MASTER",
                },
                {
                    "key": "logistics_units",
                    "label": "Unidade logística",
                    "adopted": "Preservar CX, FD, PC, SC etc.",
                    "alternative": "Remover informações logísticas",
                },
            ],
        },
        {
            "code": "07",
            "title": "Abreviações com barra",
            "objective": "Padronizar abreviações funcionais.",
            "enabled": True,
            "decisions": [
                {
                    "key": "slash_c",
                    "label": "C/",
                    "adopted": "Sempre com espaço (C/ GAS)",
                    "alternative": "C/GAS",
                },
                {
                    "key": "slash_s",
                    "label": "S/",
                    "adopted": "Sempre com espaço (S/ GAS)",
                    "alternative": "S/GAS",
                },
                {
                    "key": "slash_p",
                    "label": "P/",
                    "adopted": "Sempre com espaço (P/ ETHERNET)",
                    "alternative": "P/ETHERNET",
                },
            ],
        },
        {
            "code": "08A",
            "title": "Tamanhos de uniforme/EPI",
            "objective": "Manter um padrão único para vestuário.",
            "enabled": True,
            "decisions": [
                {
                    "key": "letter_sizes",
                    "label": "Tamanho por letra",
                    "adopted": "P, M, G, GG padronizados",
                    "alternative": "Formatos variados",
                },
                {
                    "key": "numeric_sizes",
                    "label": "Tamanho numérico",
                    "adopted": "Preservar (36, 38, 40...)",
                    "alternative": "Converter para texto",
                },
                {
                    "key": "uniform_order",
                    "label": "Ordem",
                    "adopted": "Produto → Tamanho → Cor",
                    "alternative": "Cor antes do tamanho",
                },
            ],
        },
        {
            "code": "08B",
            "title": "Pontuação",
            "objective": "Reduzir ruído visual.",
            "enabled": True,
            "decisions": [
                {
                    "key": "decorative_hyphens",
                    "label": "Hífens decorativos",
                    "adopted": "Remover",
                    "alternative": "Preservar",
                },
                {
                    "key": "duplicate_separators",
                    "label": "Separadores duplicados",
                    "adopted": "Eliminar",
                    "alternative": "Manter",
                },
                {
                    "key": "parentheses",
                    "label": "Parênteses",
                    "adopted": "Preservar apenas quando agregam significado",
                    "alternative": "Remover todos",
                },
            ],
        },
        {
            "code": "08C",
            "title": "Caracteres especiais",
            "objective": "Deixar apenas caracteres úteis.",
            "enabled": True,
            "decisions": [
                {
                    "key": "redundant_symbols",
                    "label": "Símbolos redundantes",
                    "adopted": "Remover",
                    "alternative": "Manter",
                },
                {
                    "key": "technical_slash",
                    "label": "Barra técnica",
                    "adopted": "Preservar quando funcional",
                    "alternative": "Remover indiscriminadamente",
                },
                {
                    "key": "invalid_chars",
                    "label": "Caracteres inválidos",
                    "adopted": "Eliminar",
                    "alternative": "Manter",
                },
            ],
        },
        {
            "code": "09",
            "title": "Posição de cores",
            "objective": "Facilitar comparação entre produtos.",
            "enabled": True,
            "decisions": [
                {
                    "key": "color_position",
                    "label": "Cor",
                    "adopted": "Sempre no final da descrição",
                    "alternative": "Cor em posição variável",
                },
                {
                    "key": "multiple_colors",
                    "label": "Múltiplas cores",
                    "adopted": "Preservar integralmente",
                    "alternative": "Simplificar para uma cor",
                },
            ],
        },
        {
            "code": "10",
            "title": "Reposicionar marcas",
            "objective": "Separar identidade comercial da descrição técnica.",
            "enabled": True,
            "decisions": [
                {
                    "key": "brand_position",
                    "label": "Marca",
                    "adopted": "Sempre ao final",
                    "alternative": "Marca no início",
                },
                {
                    "key": "internal_brands",
                    "label": "Marcas internas (FILIAL, COSTA OESTE etc.)",
                    "adopted": "Tratar como marca",
                    "alternative": "Manter misturado ao produto",
                },
            ],
        },
        {
            "code": "11",
            "title": "Estrutura segura",
            "objective": "Garantir que nenhuma regra altere a identidade do produto.",
            "enabled": True,
            "decisions": [
                {
                    "key": "reordering",
                    "label": "Reordenação",
                    "adopted": "Apenas quando 100% segura",
                    "alternative": "Reordenar agressivamente",
                },
                {
                    "key": "missing_info",
                    "label": "Informação ausente",
                    "adopted": "Nunca inventar",
                    "alternative": "Completar automaticamente",
                },
                {
                    "key": "priority",
                    "label": "Prioridade",
                    "adopted": "Preservar significado do cadastro",
                    "alternative": "Maximizar padronização",
                },
            ],
        },
        {
            "code": "12",
            "title": "Semântica segura",
            "objective": "Enriquecer descrições sem criar interpretações incorretas.",
            "enabled": True,
            "decisions": [
                {
                    "key": "semantic_substitutions",
                    "label": "Substituições semânticas",
                    "adopted": "Apenas equivalências universais",
                    "alternative": "Correções por contexto",
                },
                {
                    "key": "semantic_example",
                    "label": "Exemplo",
                    "adopted": "ARMARIO ACO → ARMARIO DE ACO",
                    "alternative": "Alterar qualquer frase semelhante",
                },
                {
                    "key": "semantic_limit",
                    "label": "Limite",
                    "adopted": "Não alterar atributos técnicos ou comerciais",
                    "alternative": "Reescrever descrições livremente",
                },
            ],
        },
    ],
}


def default_sanitization_config() -> SanitizationConfigDocument:
    return _normalize_config(deepcopy(DEFAULT_SANITIZATION_CONFIG))


def _normalize_decision(raw: dict[str, Any]) -> StepDecision:
    choice = raw.get("choice", "adopted")
    if choice not in ("adopted", "alternative"):
        choice = "adopted"
    return {
        "key": str(raw["key"]),
        "label": str(raw.get("label", "")),
        "adopted": str(raw.get("adopted", "")),
        "alternative": str(raw.get("alternative", "")),
        "choice": choice,
    }


def _normalize_config(config: dict[str, Any]) -> SanitizationConfigDocument:
    steps: list[SanitizationStep] = []
    for step in config.get("steps", []):
        decisions = [_normalize_decision(item) for item in step.get("decisions", []) if isinstance(item, dict)]
        steps.append(
            {
                "code": str(step["code"]),
                "title": str(step.get("title", "")),
                "objective": str(step.get("objective", "")),
                "enabled": any(item["choice"] == "adopted" for item in decisions),
                "decisions": decisions,
            }
        )
    return {
        "version": int(config.get("version", 1)),
        "steps": steps,
        "principles": list(config.get("principles", DEFAULT_SANITIZATION_CONFIG["principles"])),
    }


def decision_adopted(config: SanitizationConfigDocument | None, step_code: str, decision_key: str) -> bool:
    if config is None:
        return True
    for step in config.get("steps", []):
        if step["code"] != step_code:
            continue
        for decision in step.get("decisions", []):
            if decision.get("key") == decision_key:
                return decision.get("choice", "adopted") == "adopted"
    return True


def step_active(config: SanitizationConfigDocument | None, code: str) -> bool:
    if config is None:
        return True
    for step in config.get("steps", []):
        if step["code"] != code:
            continue
        decisions = step.get("decisions", [])
        if not decisions:
            return bool(step.get("enabled", True))
        return any(decision.get("choice", "adopted") == "adopted" for decision in decisions)
    return True


def step_enabled(config: SanitizationConfigDocument | None, code: str) -> bool:
    return step_active(config, code)


def validate_config_payload(payload: dict[str, Any]) -> SanitizationConfigDocument:
    if "steps" not in payload or not isinstance(payload["steps"], list):
        raise ValueError("Configuração inválida: informe os passos.")
    return _normalize_config(payload)
