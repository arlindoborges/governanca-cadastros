export type DescriptionSanitizeMode = "fase1" | "basica" | "original" | "custom";

export type SpacesMode = "padrao" | "manter";

export type Fase1Options = {
  spaces: SpacesMode;
  uppercase: boolean;
  accents: boolean;
  identifiers: boolean;
  unit_aliases: boolean;
  unit_split: boolean;
  unit_l_to_lt: boolean;
  unit_m_to_mt: boolean;
  unit_percent_join: boolean;
  spec_mt_s: boolean;
  spec_join_thousands: boolean;
  spec_join_sigla: boolean;
  spec_thousand_dots: boolean;
  dimensions_x: boolean;
  dimensions_order: boolean;
  dimensions_decimals: boolean;
  packaging_dash: boolean;
  packaging_c_slash: boolean;
  abbr_c: boolean;
  abbr_s: boolean;
  abbr_p: boolean;
  size_tam_n: boolean;
  size_n_ordinal: boolean;
  size_strip_tam: boolean;
  size_unico: boolean;
  punct_before: boolean;
  punct_after: boolean;
  punct_repeat: boolean;
  punct_decorative_hyphens: boolean;
  special_n_ordinal: boolean;
  special_ordinal_symbols: boolean;
  special_quotes: boolean;
  special_control: boolean;
  special_slash_preserve: boolean;
  colors_simple: boolean;
  colors_compound: boolean;
  colors_reposition: boolean;
  brand_marca: boolean;
  brand_linha: boolean;
  brand_interna: boolean;
  brand_legado: boolean;
  structure_parens: boolean;
  structure_complements: boolean;
  structure_no_invent: boolean;
  structure_priority_meaning: boolean;
  semantics_aco: boolean;
  semantics_cola: boolean;
  semantics_concentrado: boolean;
  semantics_corrente: boolean;
  semantics_balde: boolean;
  semantics_limit: boolean;
};

export type BoolSelectChoice = {
  kind: "bool-select";
  id?: string;
  key: keyof Fase1Options;
  keys?: ReadonlyArray<keyof Fase1Options>;
  label: string;
  hint?: string;
  options: ReadonlyArray<{ value: "padrao" | "manter"; label: string }>;
};

export type StepChoice = BoolSelectChoice;

export type SanitizeStep = {
  title: string;
  objective?: string;
  choices: ReadonlyArray<StepChoice>;
};

export function choiceKeys(choice: BoolSelectChoice): ReadonlyArray<keyof Fase1Options> {
  return choice.keys ?? [choice.key];
}

export function isChoiceAdopted(fase1: Fase1Options, choice: BoolSelectChoice): boolean {
  return choiceKeys(choice).every((key) =>
    key === "spaces" ? fase1.spaces === "padrao" : fase1[key],
  );
}

export function applyChoiceAdoption(
  fase1: Fase1Options,
  choice: BoolSelectChoice,
  adopted: boolean,
): Fase1Options {
  const next = { ...fase1 };
  for (const key of choiceKeys(choice)) {
    if (key === "spaces") {
      next.spaces = adopted ? "padrao" : "manter";
    } else {
      next[key] = adopted;
    }
  }
  return next;
}

export const DESCRIPTION_SANITIZE_STEPS: ReadonlyArray<SanitizeStep> = [
  {
    title: "Passo 01 — Espaços, maiúsculas e acentos",
    objective: "Eliminar variações puramente ortográficas.",
    choices: [
      {
        kind: "bool-select",
        key: "spaces",
        label: "Espaços",
        options: [
          { value: "padrao", label: "Remover espaços duplos e espaços no início/fim" },
          { value: "manter", label: "Manter a formatação original" },
        ],
      },
      {
        kind: "bool-select",
        key: "uppercase",
        label: "Capitalização",
        options: [
          { value: "padrao", label: "Converter toda a descrição para MAIÚSCULAS" },
          { value: "manter", label: "Manter maiúsculas/minúsculas originais" },
        ],
      },
      {
        kind: "bool-select",
        key: "accents",
        label: "Acentuação",
        options: [
          { value: "padrao", label: "Remover todos os acentos" },
          { value: "manter", label: "Preservar acentos" },
        ],
      },
      {
        kind: "bool-select",
        id: "cedilha",
        key: "accents",
        label: "Cedilha",
        hint: "Aplicada junto com a acentuação no processamento atual.",
        options: [
          { value: "padrao", label: "Converter Ç para C" },
          { value: "manter", label: "Manter Ç" },
        ],
      },
    ],
  },
  {
    title: "Passo 02 — Identificadores protegidos",
    objective: "Evitar perda de identidade técnica.",
    choices: [
      {
        kind: "bool-select",
        key: "identifiers",
        label: "Modelos e códigos técnicos",
        options: [
          { value: "padrao", label: "Preservar quando identificam o produto" },
          { value: "manter", label: "Remover todos os códigos" },
        ],
      },
      {
        kind: "bool-select",
        id: "referencias-comerciais",
        key: "identifiers",
        label: "Referências comerciais",
        hint: "Aplicada junto com modelos e códigos técnicos no processamento atual.",
        options: [
          { value: "padrao", label: "Manter códigos de peças, equipamentos e componentes" },
          { value: "manter", label: "Tratar como texto comum" },
        ],
      },
    ],
  },
  {
    title: "Passo 03 — Unidades e quantidades",
    objective: "Uniformizar todas as medidas.",
    choices: [
      {
        kind: "bool-select",
        key: "unit_split",
        label: "Separação número/unidade",
        options: [
          { value: "padrao", label: "Inserir espaço entre número e unidade (500 ML)" },
          { value: "manter", label: "Manter 500ML" },
        ],
      },
      {
        kind: "bool-select",
        key: "unit_l_to_lt",
        label: "Litro",
        options: [
          { value: "padrao", label: "LT" },
          { value: "manter", label: "L" },
        ],
      },
      {
        kind: "bool-select",
        id: "unidade-und",
        key: "unit_aliases",
        label: "Unidade",
        options: [
          { value: "padrao", label: "UN" },
          { value: "manter", label: "UND" },
        ],
      },
      {
        kind: "bool-select",
        id: "pacote-pct",
        key: "unit_aliases",
        label: "Pacote",
        hint: "Aplicada junto com as demais conversões de unidade no processamento atual.",
        options: [
          { value: "padrao", label: "PC" },
          { value: "manter", label: "PCT" },
        ],
      },
      {
        kind: "bool-select",
        id: "folhas-fl",
        key: "unit_aliases",
        label: "Folhas",
        hint: "Aplicada junto com as demais conversões de unidade no processamento atual.",
        options: [
          { value: "padrao", label: "FL" },
          { value: "manter", label: "FOLHAS" },
        ],
      },
      {
        kind: "bool-select",
        key: "unit_m_to_mt",
        label: "Metro",
        options: [
          { value: "padrao", label: "MT" },
          { value: "manter", label: "M" },
        ],
      },
      {
        kind: "bool-select",
        id: "centimetro-cm",
        key: "unit_split",
        label: "Centímetro",
        hint: "Aplicada junto com a separação número/unidade no processamento atual.",
        options: [
          { value: "padrao", label: "CM" },
          { value: "manter", label: "CM sem padronização" },
        ],
      },
      {
        kind: "bool-select",
        key: "unit_percent_join",
        label: "Percentual",
        options: [
          { value: "padrao", label: "Manter junto ao número (70%)" },
          { value: "manter", label: "Separar (70 %)" },
        ],
      },
      {
        kind: "bool-select",
        key: "spec_thousand_dots",
        label: "Milhar",
        options: [
          { value: "padrao", label: "Padronizar com ponto (12.000)" },
          { value: "manter", label: "Manter formatos variados" },
        ],
      },
    ],
  },
  {
    title: "Passo 04 — Especificações técnicas",
    objective: "Preservar informações funcionais.",
    choices: [
      {
        kind: "bool-select",
        key: "spec_join_sigla",
        keys: ["spec_join_sigla", "spec_join_thousands"],
        label: "BTUS, AH, V, W, HP etc.",
        options: [
          { value: "padrao", label: "Preservar como atributo técnico" },
          { value: "manter", label: "Remover por simplificação" },
        ],
      },
      {
        kind: "bool-select",
        key: "spec_mt_s",
        label: "Sequência técnica",
        options: [
          { value: "padrao", label: "Manter após o produto" },
          { value: "manter", label: "Reordenar livremente" },
        ],
      },
    ],
  },
  {
    title: "Passo 05 — Dimensões e multiplicadores",
    objective: "Tornar dimensões comparáveis.",
    choices: [
      {
        kind: "bool-select",
        key: "dimensions_x",
        label: "Medidas",
        options: [
          { value: "padrao", label: "Padronizar com X (20 X 3,6)" },
          { value: "manter", label: "Misturar X, x, ×" },
        ],
      },
      {
        kind: "bool-select",
        key: "dimensions_order",
        label: "Ordem das dimensões",
        options: [
          { value: "padrao", label: "Preservar ordem original" },
          { value: "manter", label: "Reordenar automaticamente" },
        ],
      },
      {
        kind: "bool-select",
        key: "dimensions_decimals",
        label: "Casas decimais",
        options: [
          { value: "padrao", label: "Manter somente quando necessárias" },
          { value: "manter", label: "Arredondar valores" },
        ],
      },
    ],
  },
  {
    title: "Passo 06 — Embalagem e logística",
    objective: "Diferenciar produto da embalagem.",
    choices: [
      {
        kind: "bool-select",
        key: "packaging_dash",
        label: "Embalagem logística",
        options: [
          { value: "padrao", label: "Manter separada do produto" },
          { value: "manter", label: "Misturar embalagem na descrição" },
        ],
      },
      {
        kind: "bool-select",
        id: "caixa-master",
        key: "packaging_dash",
        label: "Caixa master",
        hint: "Aplicada junto com a separação logística no processamento atual.",
        options: [
          { value: "padrao", label: "Utilizar MC" },
          { value: "manter", label: "Escrever CAIXA MASTER" },
        ],
      },
      {
        kind: "bool-select",
        id: "unidade-logistica",
        key: "packaging_dash",
        label: "Unidade logística",
        hint: "Aplicada junto com a separação logística no processamento atual.",
        options: [
          { value: "padrao", label: "Preservar CX, FD, PC, SC etc." },
          { value: "manter", label: "Remover informações logísticas" },
        ],
      },
    ],
  },
  {
    title: "Passo 07 — Abreviações com barra",
    objective: "Padronizar abreviações funcionais.",
    choices: [
      {
        kind: "bool-select",
        key: "abbr_c",
        label: "C/",
        options: [
          { value: "padrao", label: "Sempre com espaço (C/ GAS)" },
          { value: "manter", label: "C/GAS" },
        ],
      },
      {
        kind: "bool-select",
        key: "abbr_s",
        label: "S/",
        options: [
          { value: "padrao", label: "Sempre com espaço (S/ GAS)" },
          { value: "manter", label: "S/GAS" },
        ],
      },
      {
        kind: "bool-select",
        key: "abbr_p",
        label: "P/",
        options: [
          { value: "padrao", label: "Sempre com espaço (P/ ETHERNET)" },
          { value: "manter", label: "P/ETHERNET" },
        ],
      },
    ],
  },
  {
    title: "Passo 08A — Tamanhos de uniforme/EPI",
    objective: "Manter um padrão único para vestuário.",
    choices: [
      {
        kind: "bool-select",
        key: "size_strip_tam",
        keys: ["size_strip_tam", "size_unico"],
        label: "Tamanho por letra",
        options: [
          { value: "padrao", label: "P, M, G, GG padronizados" },
          { value: "manter", label: "Formatos variados" },
        ],
      },
      {
        kind: "bool-select",
        key: "size_tam_n",
        keys: ["size_tam_n", "size_n_ordinal"],
        label: "Tamanho numérico",
        options: [
          { value: "padrao", label: "Preservar (36, 38, 40...)" },
          { value: "manter", label: "Converter para texto" },
        ],
      },
      {
        kind: "bool-select",
        id: "ordem-uniforme",
        key: "colors_reposition",
        label: "Ordem",
        hint: "Reposiciona cor para depois do tamanho em uniformes/EPI.",
        options: [
          { value: "padrao", label: "Produto → Tamanho → Cor" },
          { value: "manter", label: "Cor antes do tamanho" },
        ],
      },
    ],
  },
  {
    title: "Passo 08B — Pontuação",
    objective: "Reduzir ruído visual.",
    choices: [
      {
        kind: "bool-select",
        key: "punct_decorative_hyphens",
        label: "Hífens decorativos",
        options: [
          { value: "padrao", label: "Remover" },
          { value: "manter", label: "Preservar" },
        ],
      },
      {
        kind: "bool-select",
        key: "punct_repeat",
        label: "Separadores duplicados",
        options: [
          { value: "padrao", label: "Eliminar" },
          { value: "manter", label: "Manter" },
        ],
      },
      {
        kind: "bool-select",
        key: "structure_parens",
        label: "Parênteses",
        options: [
          { value: "padrao", label: "Preservar apenas quando agregam significado" },
          { value: "manter", label: "Remover todos" },
        ],
      },
    ],
  },
  {
    title: "Passo 08C — Caracteres especiais",
    objective: "Deixar apenas caracteres úteis.",
    choices: [
      {
        kind: "bool-select",
        key: "special_ordinal_symbols",
        keys: ["special_ordinal_symbols", "special_n_ordinal", "special_quotes"],
        label: "Símbolos redundantes",
        options: [
          { value: "padrao", label: "Remover" },
          { value: "manter", label: "Manter" },
        ],
      },
      {
        kind: "bool-select",
        key: "special_slash_preserve",
        label: "Barra técnica",
        options: [
          { value: "padrao", label: "Preservar quando funcional" },
          { value: "manter", label: "Remover indiscriminadamente" },
        ],
      },
      {
        kind: "bool-select",
        key: "special_control",
        label: "Caracteres inválidos",
        options: [
          { value: "padrao", label: "Eliminar" },
          { value: "manter", label: "Manter" },
        ],
      },
    ],
  },
  {
    title: "Passo 09 — Posição de cores",
    objective: "Facilitar comparação entre produtos.",
    choices: [
      {
        kind: "bool-select",
        key: "colors_reposition",
        label: "Cor",
        options: [
          { value: "padrao", label: "Sempre no final da descrição" },
          { value: "manter", label: "Cor em posição variável" },
        ],
      },
      {
        kind: "bool-select",
        key: "colors_simple",
        keys: ["colors_simple", "colors_compound"],
        label: "Múltiplas cores",
        options: [
          { value: "padrao", label: "Preservar integralmente" },
          { value: "manter", label: "Simplificar para uma cor" },
        ],
      },
    ],
  },
  {
    title: "Passo 10 — Reposicionar marcas",
    objective: "Separar identidade comercial da descrição técnica.",
    choices: [
      {
        kind: "bool-select",
        key: "brand_marca",
        keys: ["brand_marca", "brand_linha", "brand_legado"],
        label: "Marca",
        options: [
          { value: "padrao", label: "Sempre ao final" },
          { value: "manter", label: "Marca no início" },
        ],
      },
      {
        kind: "bool-select",
        key: "brand_interna",
        label: "Marcas internas (FILIAL, COSTA OESTE etc.)",
        options: [
          { value: "padrao", label: "Tratar como marca" },
          { value: "manter", label: "Manter misturado ao produto" },
        ],
      },
    ],
  },
  {
    title: "Passo 11 — Estrutura segura",
    objective: "Garantir que nenhuma regra altere a identidade do produto.",
    choices: [
      {
        kind: "bool-select",
        key: "structure_complements",
        label: "Reordenação",
        options: [
          { value: "padrao", label: "Apenas quando 100% segura" },
          { value: "manter", label: "Reordenar agressivamente" },
        ],
      },
      {
        kind: "bool-select",
        key: "structure_no_invent",
        label: "Informação ausente",
        options: [
          { value: "padrao", label: "Nunca inventar" },
          { value: "manter", label: "Completar automaticamente" },
        ],
      },
      {
        kind: "bool-select",
        key: "structure_priority_meaning",
        label: "Prioridade",
        options: [
          { value: "padrao", label: "Preservar significado do cadastro" },
          { value: "manter", label: "Maximizar padronização" },
        ],
      },
    ],
  },
  {
    title: "Passo 12 — Semântica segura",
    objective: "Enriquecer descrições sem criar interpretações incorretas.",
    choices: [
      {
        kind: "bool-select",
        key: "semantics_aco",
        keys: [
          "semantics_aco",
          "semantics_cola",
          "semantics_concentrado",
          "semantics_corrente",
          "semantics_balde",
        ],
        label: "Substituições semânticas",
        options: [
          { value: "padrao", label: "Apenas equivalências universais" },
          { value: "manter", label: "Correções por contexto" },
        ],
      },
      {
        kind: "bool-select",
        id: "exemplo-semantica",
        key: "semantics_aco",
        label: "Exemplo",
        hint: "Ilustra a equivalência universal homologada para ACO.",
        options: [
          { value: "padrao", label: "ARMARIO ACO → ARMARIO DE ACO" },
          { value: "manter", label: "Alterar qualquer frase semelhante" },
        ],
      },
      {
        kind: "bool-select",
        key: "semantics_limit",
        label: "Limite",
        options: [
          { value: "padrao", label: "Não alterar atributos técnicos ou comerciais" },
          { value: "manter", label: "Reescrever descrições livremente" },
        ],
      },
    ],
  },
];

export const DEFAULT_FASE1_OPTIONS: Fase1Options = {
  spaces: "padrao",
  uppercase: true,
  accents: true,
  identifiers: true,
  unit_aliases: true,
  unit_split: true,
  unit_l_to_lt: true,
  unit_m_to_mt: true,
  unit_percent_join: true,
  spec_mt_s: true,
  spec_join_thousands: true,
  spec_join_sigla: true,
  spec_thousand_dots: true,
  dimensions_x: true,
  dimensions_order: true,
  dimensions_decimals: true,
  packaging_dash: true,
  packaging_c_slash: true,
  abbr_c: true,
  abbr_s: true,
  abbr_p: true,
  size_tam_n: true,
  size_n_ordinal: true,
  size_strip_tam: true,
  size_unico: true,
  punct_before: true,
  punct_after: true,
  punct_repeat: true,
  punct_decorative_hyphens: true,
  special_n_ordinal: true,
  special_ordinal_symbols: true,
  special_quotes: true,
  special_control: true,
  special_slash_preserve: true,
  colors_simple: true,
  colors_compound: true,
  colors_reposition: true,
  brand_marca: true,
  brand_linha: true,
  brand_interna: true,
  brand_legado: true,
  structure_parens: true,
  structure_complements: true,
  structure_no_invent: true,
  structure_priority_meaning: true,
  semantics_aco: true,
  semantics_cola: true,
  semantics_concentrado: true,
  semantics_corrente: true,
  semantics_balde: true,
  semantics_limit: true,
};

export type NormalizationRunPayload = {
  description_mode?: DescriptionSanitizeMode;
  description_steps?: string[] | null;
  fase1?: Fase1Options | null;
};

export function payloadFromOptions(fase1: Fase1Options): NormalizationRunPayload {
  return { description_mode: "custom", fase1 };
}
