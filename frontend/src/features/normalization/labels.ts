const PROCESSING_STATUS: Record<string, string> = {
  IMPORTED: "Importado",
  NORMALIZED: "Normalizado",
  PENDING_INFORMATION: "Pendência de informação",
};

const ISSUE_TYPE: Record<string, string> = {
  MISSING_INFORMATION: "Informação ausente",
};

const ISSUE_STATUS: Record<string, string> = {
  OPEN: "Aberta",
  RESOLVED: "Resolvida",
  CLOSED: "Fechada",
};

const ATTRIBUTE_CODE: Record<string, string> = {
  BRAND: "Marca",
  CADASTRE_UNIT: "Unidade cadastral",
};

export function processingStatusLabel(status: string): string {
  return PROCESSING_STATUS[status] ?? status;
}

const PROCESSING_STATUS_CLASS: Record<string, string> = {
  IMPORTED: "status-badge--neutral",
  NORMALIZED: "status-badge--success",
  PENDING_INFORMATION: "status-badge--pending",
};

export function processingStatusClass(status: string): string {
  return PROCESSING_STATUS_CLASS[status] ?? "status-badge--neutral";
}

export function issueTypeLabel(type: string): string {
  return ISSUE_TYPE[type] ?? type;
}

export function issueStatusLabel(status: string): string {
  return ISSUE_STATUS[status] ?? status;
}

const ISSUE_STATUS_CLASS: Record<string, string> = {
  OPEN: "status-badge--pending",
  RESOLVED: "status-badge--success",
  CLOSED: "status-badge--neutral",
};

export function issueStatusClass(status: string): string {
  return ISSUE_STATUS_CLASS[status] ?? "status-badge--neutral";
}

export function attributeCodeLabel(code: string): string {
  return ATTRIBUTE_CODE[code] ?? code;
}

export function attributeDisplayLabel(code: string, name?: string | null): string {
  return name?.trim() || attributeCodeLabel(code);
}
