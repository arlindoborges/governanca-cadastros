export const IMPORT_TEMPLATE_PATH = "/modelos/importacao-cadastro.xlsx";
export const IMPORT_TEMPLATE_FILE_NAME = "modelo-importacao-cadastro.xlsx";

export const IMPORT_REQUIRED_COLUMNS = ["código", "descrição", "unidade"] as const;

/** Espelha o padrão de `import_max_rows` no backend. */
export const IMPORT_MAX_ROWS = 300_000;
