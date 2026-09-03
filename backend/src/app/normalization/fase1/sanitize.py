from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

from app.normalization.fase1.constants import (
    BRAND_TERMS,
    COLOR_AS_PRODUCT_TERMS,
    COMPOUND_COLORS,
    IDENTIFIERS_PROTECTED,
    PROTECTED_COLOR_EXPRESSIONS,
    SIMPLE_COLORS,
    UNIFORM_EPI_TERMS,
    UNIFORM_SIZES,
)

_WHITESPACE_RE = re.compile(r"\s+")


def normalize_spaces(text: str) -> str:
    return _WHITESPACE_RE.sub(" ", str(text).strip())


def remove_accents(text: str) -> str:
    value = str(text).replace("Ç", "C").replace("ç", "c")
    normalized = unicodedata.normalize("NFD", value)
    return "".join(char for char in normalized if unicodedata.category(char) != "Mn")


def escape_regex(text: str) -> str:
    return re.escape(str(text))


def restore_map(text: str, mapping: dict[str, str]) -> str:
    result = str(text)
    for key, value in mapping.items():
        result = result.replace(key, value)
    return result


def count_char(text: str, character: str) -> int:
    return str(text).count(character)


@dataclass(frozen=True)
class ColorBlock:
    text: str
    start: int
    end: int
    family: str


@dataclass(frozen=True)
class LocatedBrandTerm:
    term: str
    kind: str
    start: int
    end: int


STEP_FLAG_GROUPS: dict[str, tuple[str, ...]] = {
    "identifiers": ("identifiers",),
    "units": ("unit_aliases", "unit_split", "unit_l_to_lt", "unit_m_to_mt", "unit_percent_join"),
    "technical_specs": (
        "spec_mt_s",
        "spec_join_thousands",
        "spec_join_sigla",
        "spec_thousand_dots",
    ),
    "dimensions": ("dimensions_x", "dimensions_order", "dimensions_decimals"),
    "packaging": ("packaging_dash", "packaging_c_slash"),
    "abbreviations": ("abbr_c", "abbr_s", "abbr_p"),
    "uniform_sizes": ("size_tam_n", "size_n_ordinal", "size_strip_tam", "size_unico"),
    "punctuation": ("punct_before", "punct_after", "punct_repeat", "punct_decorative_hyphens"),
    "special_chars": (
        "special_n_ordinal",
        "special_ordinal_symbols",
        "special_quotes",
        "special_control",
        "special_slash_preserve",
    ),
    "colors": ("colors_simple", "colors_compound", "colors_reposition"),
    "brands": ("brand_marca", "brand_linha", "brand_interna", "brand_legado"),
    "structure": (
        "structure_parens",
        "structure_complements",
        "structure_no_invent",
        "structure_priority_meaning",
    ),
    "semantics": (
        "semantics_aco",
        "semantics_cola",
        "semantics_concentrado",
        "semantics_corrente",
        "semantics_balde",
        "semantics_limit",
    ),
}

BOOL_OPTION_FIELDS = tuple(field for fields in STEP_FLAG_GROUPS.values() for field in fields) + (
    "uppercase",
    "accents",
)


@dataclass(frozen=True)
class SanitizeOptions:
    spaces: str = "padrao"
    uppercase: bool = True
    accents: bool = True
    identifiers: bool = True
    unit_aliases: bool = True
    unit_split: bool = True
    unit_l_to_lt: bool = True
    unit_m_to_mt: bool = True
    unit_percent_join: bool = True
    spec_mt_s: bool = True
    spec_join_thousands: bool = True
    spec_join_sigla: bool = True
    spec_thousand_dots: bool = True
    dimensions_x: bool = True
    dimensions_order: bool = True
    dimensions_decimals: bool = True
    packaging_dash: bool = True
    packaging_c_slash: bool = True
    abbr_c: bool = True
    abbr_s: bool = True
    abbr_p: bool = True
    size_tam_n: bool = True
    size_n_ordinal: bool = True
    size_strip_tam: bool = True
    size_unico: bool = True
    punct_before: bool = True
    punct_after: bool = True
    punct_repeat: bool = True
    punct_decorative_hyphens: bool = True
    special_n_ordinal: bool = True
    special_ordinal_symbols: bool = True
    special_quotes: bool = True
    special_control: bool = True
    special_slash_preserve: bool = True
    colors_simple: bool = True
    colors_compound: bool = True
    colors_reposition: bool = True
    brand_marca: bool = True
    brand_linha: bool = True
    brand_interna: bool = True
    brand_legado: bool = True
    structure_parens: bool = True
    structure_complements: bool = True
    structure_no_invent: bool = True
    structure_priority_meaning: bool = True
    semantics_aco: bool = True
    semantics_cola: bool = True
    semantics_concentrado: bool = True
    semantics_corrente: bool = True
    semantics_balde: bool = True
    semantics_limit: bool = True

    @classmethod
    def disabled(cls) -> SanitizeOptions:
        return cls(spaces="manter", **dict.fromkeys(BOOL_OPTION_FIELDS, False))

    @classmethod
    def from_mode(cls, mode: str, steps: list[str] | None = None) -> SanitizeOptions:
        if mode == "original":
            return cls.disabled()
        if mode == "basica":
            kwargs = dict.fromkeys(BOOL_OPTION_FIELDS, False)
            kwargs.update({"uppercase": True, "accents": True, "identifiers": True})
            return cls(spaces="padrao", **kwargs)
        if mode == "custom":
            selected = set(steps or [])
            kwargs = dict.fromkeys(BOOL_OPTION_FIELDS, False)
            spaces = "manter"
            if "grafia" in selected:
                spaces = "padrao"
                kwargs["uppercase"] = True
                kwargs["accents"] = True
            for step, fields in STEP_FLAG_GROUPS.items():
                if step in selected:
                    for field in fields:
                        kwargs[field] = True
            return cls(spaces=spaces, **kwargs)
        return cls()

    @classmethod
    def from_fase1(cls, payload: dict[str, object]) -> SanitizeOptions:
        allowed = {"spaces", *BOOL_OPTION_FIELDS}
        filtered = {key: value for key, value in payload.items() if key in allowed}
        return cls(**filtered)

    def has_any_step(self) -> bool:
        if self.spaces == "padrao":
            return True
        return any(getattr(self, field) for field in BOOL_OPTION_FIELDS)


def sanitize_description(
    description: str | None,
    options: SanitizeOptions | None = None,
) -> str:
    if description is None or not str(description).strip():
        return ""

    opts = options or SanitizeOptions()
    if not opts.has_any_step():
        return str(description).strip()

    text = str(description)
    if opts.spaces == "padrao":
        text = normalize_spaces(text)
    else:
        text = text.strip()
    if opts.accents:
        text = remove_accents(text)
    if opts.uppercase:
        text = text.upper()

    if opts.identifiers:
        protected_ids = _protect_identifiers(text)
        text = protected_ids.text
    else:
        protected_ids = _ProtectionResult(text, {})

    if opts.size_tam_n or opts.size_n_ordinal or opts.size_strip_tam or opts.size_unico:
        protected_sizes = _protect_uniform_sizes(text)
        text = protected_sizes.text
    elif opts.punct_before or opts.punct_after or opts.punct_repeat:
        protected_sizes = _protect_uniform_sizes(text)
        text = protected_sizes.text
    elif (
        opts.special_n_ordinal
        or opts.special_ordinal_symbols
        or opts.special_quotes
        or opts.special_control
    ):
        protected_sizes = _protect_uniform_sizes(text)
        text = protected_sizes.text
    else:
        protected_sizes = _ProtectionResult(text, {})

    if opts.packaging_dash or opts.packaging_c_slash or opts.abbr_c or opts.abbr_s or opts.abbr_p:
        protected_p_slash = _protect_p_slash(text)
        text = protected_p_slash.text
    else:
        protected_p_slash = _ProtectionResult(text, {})

    if opts.unit_aliases or opts.unit_split or opts.unit_l_to_lt or opts.unit_m_to_mt or opts.unit_percent_join:
        text = _normalize_units_quantities(text, opts)
    if (
        opts.spec_mt_s
        or opts.spec_join_thousands
        or opts.spec_join_sigla
        or opts.spec_thousand_dots
    ):
        text = _normalize_technical_specs(text, opts)
    if opts.dimensions_x:
        text = _normalize_dimensions_multipliers(text, opts)
    if opts.packaging_dash or opts.packaging_c_slash:
        text = _normalize_logistics_packaging(text, opts)
    text = restore_map(text, protected_p_slash.mapping)
    if opts.abbr_c or opts.abbr_s or opts.abbr_p:
        if opts.special_slash_preserve:
            text = _normalize_slash_abbreviations(text, opts)
    if opts.size_tam_n or opts.size_n_ordinal or opts.size_strip_tam or opts.size_unico:
        text = _normalize_numeric_uniform_sizes(text, opts)
    if opts.punct_before or opts.punct_after or opts.punct_repeat or opts.punct_decorative_hyphens:
        text = _normalize_punctuation(text, opts)
    if (
        opts.special_n_ordinal
        or opts.special_ordinal_symbols
        or opts.special_quotes
        or opts.special_control
    ):
        text = _normalize_special_characters(text, opts)
    text = restore_map(text, protected_sizes.mapping)
    if opts.colors_reposition and (opts.colors_simple or opts.colors_compound):
        text = _normalize_color_position(text, opts)
    if opts.brand_marca or opts.brand_linha or opts.brand_interna or opts.brand_legado:
        text = _reposition_brands(text, opts)
    if opts.structure_parens or opts.structure_complements:
        text = _normalize_safe_structure(text, opts)
    text = restore_map(text, protected_ids.mapping)
    if (
        opts.semantics_limit
        and (
            opts.semantics_aco
            or opts.semantics_cola
            or opts.semantics_concentrado
            or opts.semantics_corrente
            or opts.semantics_balde
        )
    ):
        text = _normalize_safe_semantics(text, opts)

    if opts.spaces == "padrao":
        return normalize_spaces(text)
    return str(text).strip()


def extract_brand_term(description: str | None) -> str | None:
    if description is None or not str(description).strip():
        return None
    located = locate_brand_terms(description)
    brand_terms = [item.term for item in located if item.kind == "MARCA"]
    distinct = list(dict.fromkeys(brand_terms))
    if len(distinct) == 1:
        return distinct[0]
    return None


def locate_brand_terms(text: str) -> list[LocatedBrandTerm]:
    found: list[LocatedBrandTerm] = []
    mask = str(text).upper()
    for item in BRAND_TERMS:
        pattern = re.compile(
            rf"(^|[^A-Z0-9])({escape_regex(item.term)})(?=$|[^A-Z0-9])",
            flags=re.MULTILINE,
        )
        while match := pattern.search(mask):
            prefix = match.group(1) or ""
            start = match.start() + len(prefix)
            end = start + len(item.term)
            found.append(LocatedBrandTerm(item.term, item.kind, start, end))
            mask = mask[:start] + (" " * len(item.term)) + mask[end:]
    return found


def _protect_identifiers(text: str) -> _ProtectionResult:
    result = str(text)
    mapping: dict[str, str] = {}
    counter = 0
    for identifier in IDENTIFIERS_PROTECTED:
        pattern = re.compile(rf"(^|[^A-Z0-9])({escape_regex(identifier)})(?=$|[^A-Z0-9])")

        def replacer(match: re.Match[str]) -> str:
            nonlocal counter
            key = f"ZZID{counter:05d}ZZ"
            mapping[key] = identifier
            counter += 1
            return match.group(1) + key

        result = pattern.sub(replacer, result)
    return _ProtectionResult(result, mapping)


def _is_uniform_epi_context(description: str) -> bool:
    upper = str(description).upper()
    return any(term in upper for term in UNIFORM_EPI_TERMS)


def _protect_uniform_sizes(text: str) -> _ProtectionResult:
    description = str(text).upper()
    if not _is_uniform_epi_context(description):
        return _ProtectionResult(description, {})
    result = description
    mapping: dict[str, str] = {}
    counter = 0
    for size in UNIFORM_SIZES:
        pattern = re.compile(rf"(^|\s)({escape_regex(size)})(?=$|\s|[(),;])")

        def replacer(match: re.Match[str]) -> str:
            nonlocal counter
            value = match.group(2)
            if value in {"G", "M", "P"}:
                start = match.start() + len(match.group(1) or "")
                before = result[:start].rstrip()
                if re.search(r"\d(?:[.,]\d+)?\s*$", before):
                    return match.group(0)
            key = f"ZZTAM{counter:05d}ZZ"
            mapping[key] = value
            counter += 1
            return (match.group(1) or "") + key

        result = pattern.sub(replacer, result)
    return _ProtectionResult(result, mapping)


def _protect_p_slash(text: str) -> _ProtectionResult:
    result = str(text)
    mapping: dict[str, str] = {}
    counter = 0

    def replacer(_match: re.Match[str]) -> str:
        nonlocal counter
        key = f"ZZPBARRA{counter:04d}ZZ"
        mapping[key] = "P/ "
        counter += 1
        return key

    result = re.sub(r"\bP/\s*", replacer, result)
    return _ProtectionResult(result, mapping)


def _normalize_units_quantities(text: str, options: SanitizeOptions | None = None) -> str:
    opts = options or SanitizeOptions()
    result = str(text)
    if opts.unit_aliases:
        conversions = [
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
        for origin, dest in conversions:
            result = re.sub(
                rf"(\d+(?:[.,]\d+)?)\s*{origin}\b",
                rf"\1 {dest}",
                result,
            )
    if opts.unit_split:
        units = ["KG", "G", "ML", "LT", "KM", "MT", "CM", "MM", "UN", "PC", "FL", "CX"]
        for unit in sorted(units, key=len, reverse=True):
            result = re.sub(rf"(\d+(?:[.,]\d+)?)\s*{unit}\b", rf"\1 {unit}", result)
    if opts.unit_l_to_lt:
        result = re.sub(r"(\d+(?:[.,]\d+)?)\s*L\b", r"\1 LT", result)
    if opts.unit_m_to_mt:
        result = re.sub(r"(\d+(?:[.,]\d+)?)\s*M\b", r"\1 MT", result)
    if opts.unit_percent_join:
        result = re.sub(r"(\d+(?:[.,]\d+)?)\s+%", r"\1%", result)
    return normalize_spaces(result)


def _format_thousand(number: str) -> str:
    value = str(number).replace(".", "")
    return re.sub(r"\B(?=(\d{3})+(?!\d))", ".", value)


def _normalize_technical_specs(text: str, options: SanitizeOptions | None = None) -> str:
    opts = options or SanitizeOptions()
    result = str(text)
    if opts.spec_mt_s:
        result = re.sub(
            r"\b(\d{4,})\s*MT\s*/\s*S\b",
            lambda match: f"{_format_thousand(match.group(1))}MT/S",
            result,
        )
        result = re.sub(r"\b(\d{1,3})\s*MT\s*/\s*S\b", r"\1MT/S", result)

    preserved: dict[str, str] = {}
    counter = 0

    def protect(pattern: re.Pattern[str], value: str) -> str:
        nonlocal counter

        def replacer(match: re.Match[str]) -> str:
            nonlocal counter
            key = f"ZZTEC{counter:05d}ZZ"
            preserved[key] = match.group(0)
            counter += 1
            return key

        return pattern.sub(replacer, value)

    result = protect(re.compile(r"\b\d{1,2}W\d{2}\b"), result)
    result = protect(re.compile(r"\bPFF-?\d+\b"), result)
    result = protect(re.compile(r"\b\d{1,3}(?:\.\d{3})*MT/S\b"), result)

    if opts.spec_join_thousands:
        result = re.sub(
            r"\b(\d{1,3})\s+000\s*(BTUS?|RPM|MAH|W|KW|K|HZ|GHZ|MHZ|KHZ)\b",
            r"\g<1>000\2",
            result,
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
    if opts.spec_join_sigla:
        for sigla in sorted(siglas, key=len, reverse=True):
            result = re.sub(
                rf"(\d+(?:[.,]\d+)?)\s*{escape_regex(sigla)}\b",
                rf"\1{sigla}",
                result,
            )
    if opts.spec_thousand_dots:
        sigla_pattern = "|".join(escape_regex(sigla) for sigla in siglas)
        result = re.sub(
            rf"\b(\d{{4,}})(?=({sigla_pattern})\b)",
            lambda match: _format_thousand(match.group(1)),
            result,
        )
    return normalize_spaces(restore_map(result, preserved))


def _normalize_dimensions_multipliers(text: str, options: SanitizeOptions | None = None) -> str:
    opts = options or SanitizeOptions()
    units = ["KM", "MT", "CM", "MM", "M", "KG", "G", "ML", "LT", "L", "UN", "PC", "FL"]
    unit_pattern = "|".join(escape_regex(unit) for unit in units)
    result = re.sub(
        rf"(\d+(?:[.,]\d+)?(?:\s*(?:{unit_pattern}))?)\s*X\s*(?=\d)",
        r"\1 X ",
        str(text),
        flags=re.IGNORECASE,
    )
    result = re.sub(r"(\d+(?:[.,]\d+)?)\s+X\s+(?=\d)", r"\1 X ", result)
    result = _normalize_units_quantities(result, opts)
    result = _normalize_technical_specs(result, opts)
    return normalize_spaces(result)


def _normalize_logistics_packaging(text: str, options: SanitizeOptions | None = None) -> str:
    opts = options or SanitizeOptions()
    result = str(text)
    siglas = ["CX", "FD", "MC"]
    sigla_pattern = "|".join(siglas)
    units = ["KG", "G", "ML", "LT", "KM", "MT", "CM", "MM", "UN", "PC", "FL", "CX"]
    unit_pattern = "|".join(units)
    if opts.packaging_dash:
        result = re.sub(
            rf"(\d+(?:[.,]\d+)?\s+(?:{unit_pattern}))\s+({sigla_pattern})\s+(?=(?:C/\s*)?\d)",
            r"\1 - \2 ",
            result,
        )
        result = re.sub(
            rf"(\d+(?:[.,]\d+)?\s+X\s+\d+(?:[.,]\d+)?(?:\s+(?:CM|MM|MT))?)\s+({sigla_pattern})\s+(?=\d)",
            r"\1 - \2 ",
            result,
        )
        result = re.sub(r"\s+-\s+-\s+", " - ", result)
        result = re.sub(r"\s*-\s*(?=(?:CX|FD|MC)\b)", " - ", result)
    if opts.packaging_c_slash:
        result = re.sub(
            rf"(\d+(?:[.,]\d+)?\s+(?:{unit_pattern}))\s+({sigla_pattern})\s+C/\s*(?=\d)",
            r"\1 - \2 C/ ",
            result,
        )
        result = re.sub(
            rf"(^|\s)({sigla_pattern})\s+C/\s*(?=\d)",
            lambda match: f" - {match.group(2)} C/ ",
            result,
        )
    return normalize_spaces(result)


def _normalize_slash_abbreviations(text: str, options: SanitizeOptions | None = None) -> str:
    opts = options or SanitizeOptions()
    result = str(text)
    if opts.abbr_c:
        result = re.sub(r"\bC/\s*", "C/ ", result)
    if opts.abbr_s:
        result = re.sub(r"\bS/\s*", "S/ ", result)
    if opts.abbr_p:
        result = re.sub(r"\bP/\s*", "P/ ", result)
    return normalize_spaces(result)


def _normalize_numeric_uniform_sizes(text: str, options: SanitizeOptions | None = None) -> str:
    opts = options or SanitizeOptions()
    result = str(text)
    if not _is_uniform_epi_context(result):
        return result
    if opts.size_tam_n:
        result = re.sub(r"\bTAM\.?\s*(?:N\s*[º°.]?\s*)?(\d{1,3})\b", r"N.\1", result)
    if opts.size_n_ordinal:
        result = re.sub(r"\bN\s*[º°.]?\s*(\d{1,3})\b", r"N.\1", result)
    if opts.size_strip_tam:
        result = re.sub(
            r"\bTAM\.?\s+(PP|P|M|G|GG|XG|XGG|EXG|EXGG|XXG|EXXG|EG|EGG|G1|G2|G3|G4|G5)\b",
            r"\1",
            result,
        )
    if opts.size_unico:
        result = re.sub(r"\bTAM\.?\s+UNICO\b", "UNICO", result)
    return normalize_spaces(result)


def _normalize_punctuation(text: str, options: SanitizeOptions | None = None) -> str:
    opts = options or SanitizeOptions()
    result = str(text)
    if opts.punct_before:
        result = re.sub(r"\s+,", ",", result)
        result = re.sub(r"\s+;", ";", result)
        result = re.sub(r"\s+:", ":", result)
        result = re.sub(r"\s+\.", ".", result)
    if opts.punct_after:
        result = re.sub(r",([A-Z])", r", \1", result)
        result = re.sub(r";([A-Z])", r"; \1", result)
        result = re.sub(r":([A-Z])", r": \1", result)
    if opts.punct_repeat:
        result = re.sub(r",{2,}", ",", result)
        result = re.sub(r";{2,}", ";", result)
        result = re.sub(r":{2,}", ":", result)
    if opts.punct_decorative_hyphens:
        result = re.sub(r"-{2,}", " ", result)
    return normalize_spaces(result)


def _normalize_special_characters(text: str, options: SanitizeOptions | None = None) -> str:
    opts = options or SanitizeOptions()
    result = str(text)
    if opts.special_n_ordinal:
        result = re.sub(r"\bN\s*[º°.]?\s*(\d{1,3})\b", r"N.\1", result)
    if opts.special_ordinal_symbols:
        result = re.sub(r"[º°ª]", "", result)
    if opts.special_quotes:
        result = result.replace("“", '"').replace("”", '"').replace("„", '"')
        result = result.replace("‘", "'").replace("’", "'").replace("´", "'").replace("`", "'")
    if opts.special_control:
        result = re.sub(r"[\x00-\x1f\x7f-\x9f]", " ", result)
        result = result.replace("\u00a0", " ")
    return normalize_spaces(result)


def _identify_color_blocks(
    text: str, options: SanitizeOptions | None = None
) -> tuple[list[ColorBlock], set[str]]:
    opts = options or SanitizeOptions()
    description = str(text).upper()
    blocks: list[ColorBlock] = []
    families: set[str] = set()
    mask = description

    if opts.colors_compound:
        for compound in COMPOUND_COLORS:
            pattern = re.compile(rf"(^|\s){escape_regex(compound)}(?=$|\s|[,;:.()\-])")
            while match := pattern.search(mask):
                prefix = match.group(1) or ""
                start = match.start() + len(prefix)
                end = start + len(compound)
                blocks.append(ColorBlock(description[start:end], start, end, compound))
                families.add(compound)
                mask = mask[:start] + (" " * len(compound)) + mask[end:]
                pattern = re.compile(rf"(^|\s){escape_regex(compound)}(?=$|\s|[,;:.()\-])")

    if opts.colors_simple:
        for item in SIMPLE_COLORS:
            pattern = re.compile(rf"(^|\s){escape_regex(item.color)}(?=$|\s|[,;:.()\-])")
            while match := pattern.search(mask):
                prefix = match.group(1) or ""
                start = match.start() + len(prefix)
                end = start + len(item.color)
                blocks.append(ColorBlock(description[start:end], start, end, item.family))
                families.add(item.family)
                mask = mask[:start] + (" " * len(item.color)) + mask[end:]
                pattern = re.compile(rf"(^|\s){escape_regex(item.color)}(?=$|\s|[,;:.()\-])")

    blocks.sort(key=lambda block: block.start)
    return blocks, families


def _remove_color_block(text: str, block: ColorBlock) -> str:
    before = str(text)[: block.start]
    after = str(text)[block.end :]
    return normalize_spaces(f"{before} {after}")


def _has_protected_color_expression(description: str) -> bool:
    upper = str(description).upper()
    return any(expression in upper for expression in PROTECTED_COLOR_EXPRESSIONS)


def _is_color_as_product_name(description: str) -> bool:
    upper = str(description).upper()
    return any(term in upper for term in COLOR_AS_PRODUCT_TERMS)


def _insert_color_before_size(base: str, color: str, match: re.Match[str]) -> str:
    start = match.start()
    size = match.group(0)
    before = base[:start].strip()
    after = base[start + len(size) :].strip()
    result = normalize_spaces(f"{before} {color} {size}")
    if after:
        result = normalize_spaces(f"{result} {after}")
    return result


def _position_uniform_color(text: str, color: str) -> str:
    base = str(text).strip()
    numeric = re.search(r"\bN\.\d{1,3}\b", base)
    if numeric:
        return _insert_color_before_size(base, color, numeric)

    sizes = [
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
    candidates: list[tuple[str, int]] = []
    for size in sizes:
        for match in re.finditer(rf"\b{escape_regex(size)}\b", base):
            if size in {"P", "M", "G"}:
                before = base[: match.start()].rstrip()
                if re.search(r"\d(?:[.,]\d+)?\s*$", before):
                    continue
            candidates.append((match.group(0), match.start()))
    if not candidates:
        return normalize_spaces(f"{base} {color}")
    candidates.sort(key=lambda item: item[1], reverse=True)
    size_text, _index = candidates[0]
    size_match = re.search(rf"\b{escape_regex(size_text)}\b", base)
    if size_match is None:
        return normalize_spaces(f"{base} {color}")
    return _insert_color_before_size(base, color, size_match)


def _normalize_color_position(text: str, options: SanitizeOptions | None = None) -> str:
    opts = options or SanitizeOptions()
    result = str(text).strip()
    principal = result
    packaging = ""
    packaging_match = re.search(r"\s+-\s+(CX|FD|MC)\b.*$", result)
    if packaging_match:
        packaging = packaging_match.group(0).strip()
        principal = result[: packaging_match.start()].strip()

    blocks, families = _identify_color_blocks(principal, opts)
    if not blocks or len(families) > 1 or len(blocks) != 1:
        return result
    if _has_protected_color_expression(principal) or _is_color_as_product_name(principal):
        return result

    block = blocks[0]
    base = _remove_color_block(principal, block)
    if _is_uniform_epi_context(principal):
        principal = _position_uniform_color(base, block.text)
    else:
        principal = normalize_spaces(f"{base} {block.text}")

    return normalize_spaces(f"{principal} {packaging}" if packaging else principal)


def _remove_brand_occurrences(text: str, term: str) -> str:
    result = re.sub(
        rf"(^|[^A-Z0-9])({escape_regex(term)})(?=$|[^A-Z0-9])",
        r"\1",
        str(text),
    )
    result = re.sub(r"\(\s*\)", " ", result)
    return normalize_spaces(result)


def _reposition_brands(text: str, options: SanitizeOptions | None = None) -> str:
    opts = options or SanitizeOptions()
    allowed: set[str] = set()
    if opts.brand_marca:
        allowed.add("MARCA")
    if opts.brand_linha:
        allowed.add("LINHA_COMERCIAL")
    if opts.brand_interna:
        allowed.add("IDENTIFICACAO_INTERNA")
    if opts.brand_legado:
        allowed.add("MARCADOR_LEGADO")
    if not allowed:
        return str(text)

    result = normalize_spaces(text)
    principal = result
    packaging = ""
    packaging_match = re.search(r"\s+-\s+(CX|FD|MC)\b.*$", result)
    if packaging_match:
        packaging = packaging_match.group(0).strip()
        principal = result[: packaging_match.start()].strip()

    located = locate_brand_terms(principal)
    if not located:
        return result

    distinct = list(dict.fromkeys(item.term for item in located))
    if len(distinct) != 1:
        return result

    term = distinct[0]
    item = next((entry for entry in BRAND_TERMS if entry.term == term), None)
    if item is None:
        return result

    if item.kind not in allowed:
        return result

    principal = _remove_brand_occurrences(principal, term)
    principal = re.sub(r"\(\s*\)", " ", principal)
    principal = normalize_spaces(f"{principal} {term}")
    return normalize_spaces(f"{principal} {packaging}" if packaging else principal)


def _normalize_known_parentheticals(text: str) -> str:
    replacements = [
        (r"\(\s*SEM\s+LOGO\s*\)", "(SEM LOGO)"),
        (r"\(\s*COM\s+LOGO\s*\)", "(COM LOGO)"),
        (r"\(\s*TIPO\s+COLEGIAL\s*\)", "(TIPO COLEGIAL)"),
        (r"\(\s*LOGO\s+COSTA\s+OESTE\s*\)", "(LOGO COSTA OESTE)"),
        (r"\(\s*LOGO\s+BORDADO\s+COSTA\s+OESTE\s*\)", "(LOGO BORDADO COSTA OESTE)"),
        (r"\(\s*LOGO\s+GRABIN\s*\)", "(LOGO GRABIN)"),
        (r"\(\s*LOGO\s+GRAGIN\s*\)", "(LOGO GRAGIN)"),
        (r"\(\s*COSTA\s+OESTE\s*\)", "(COSTA OESTE)"),
        (r"\(\s*GRABIN\s*\)", "(GRABIN)"),
        (r"\(\s*GRAGIN\s*\)", "(GRAGIN)"),
        (r"\(\s*FACILITIES\s*\)", "(FACILITIES)"),
        (r"\(\s*FACILITEIS\s*\)", "(FACILITEIS)"),
        (r"\(\s*FILIAL\s*\)", "(FILIAL)"),
    ]
    result = str(text)
    for pattern, replacement in replacements:
        result = re.sub(pattern, replacement, result)
    return result


def _normalize_safe_structure(text: str, options: SanitizeOptions | None = None) -> str:
    opts = options or SanitizeOptions()
    result = str(text).strip()
    if opts.structure_parens:
        if count_char(result, "(") != count_char(result, ")"):
            return result
        result = re.sub(r"\(\s+", "(", result)
        result = re.sub(r"\s+\)", ")", result)
        result = re.sub(r"\(\s*\)", " ", result)
        result = re.sub(r"\s+\(", " (", result)
        result = re.sub(r"\)(?=[A-Z0-9])", ") ", result)
        result = re.sub(r"\s*,\s*\(", " (", result)
        result = re.sub(r"\s*;\s*\(", " (", result)
    if opts.structure_complements:
        result = _normalize_known_parentheticals(result)
    return normalize_spaces(result)


def _normalize_safe_semantics(text: str, options: SanitizeOptions | None = None) -> str:
    opts = options or SanitizeOptions()
    result = normalize_spaces(text)
    if opts.semantics_aco:
        result = re.sub(r"\b(ARMARIO|ARQUIVO)\s+ACO\b", r"\1 DE ACO", result)
    if opts.semantics_cola:
        result = re.sub(
            r"\bCOLA\s+(\d+(?:[.,]\d+)?\s+(?:G|KG|ML|LT))\s+BRANCA\b",
            r"COLA BRANCA \1",
            result,
        )
    if opts.semantics_concentrado:
        result = re.sub(
            r"\bCONCENTRADO\s+(?:DE\s+)?AGUA\s+SANITARIA\b",
            "AGUA SANITARIA CONCENTRADO",
            result,
        )
        result = re.sub(r"\bCONCENTRADO\s+DESINFETANTE\b", "DESINFETANTE CONCENTRADO", result)
        result = re.sub(
            r"\bCONCENTRADO\s+DETERGENTE\s+NEUTRO\b",
            "DETERGENTE NEUTRO CONCENTRADO",
            result,
        )
        result = re.sub(r"\bCONCENTRADO\s+MULTIUSO\b", "MULTIUSO CONCENTRADO", result)
    if opts.semantics_corrente:
        result = re.sub(r"\bCORRENTE\s+PARA\s+MOTOSSERRA\b", "CORRENTE MOTOSSERRA", result)
    if opts.semantics_balde:
        result = re.sub(r"\bBALDE\s+PLASTICO\s+-\s+(?=\d)", "BALDE PLASTICO ", result)
        result = re.sub(r"\bBALDE\s+PLASTICO\s+DE\s+(?=\d)", "BALDE PLASTICO ", result)
    return normalize_spaces(result)


@dataclass(frozen=True)
class _ProtectionResult:
    text: str
    mapping: dict[str, str]
