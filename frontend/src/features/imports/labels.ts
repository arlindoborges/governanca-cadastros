import type { components } from "@/generated/openapi";

const BATCH_STATUS: Record<string, string> = {
  AWAITING_MAPPING: "Aguardando mapeamento",
  PROCESSING: "Processando",
  COMPLETED: "Concluído",
  FAILED: "Falhou",
};

const ROW_ISSUE: Record<string, string> = {
  MISSING_SOURCE_CODE: "Código ausente",
  MISSING_DESCRIPTION: "Descrição ausente",
  MISSING_UNIT: "Unidade ausente",
};

export function batchStatusLabel(status: string): string {
  return BATCH_STATUS[status] ?? status;
}

const BATCH_STATUS_CLASS: Record<string, string> = {
  AWAITING_MAPPING: "status-badge--pending",
  PROCESSING: "status-badge--progress",
  COMPLETED: "status-badge--success",
  FAILED: "status-badge--danger",
};

export function batchStatusClass(status: string): string {
  return BATCH_STATUS_CLASS[status] ?? "status-badge--neutral";
}

export function rowIssueLabel(code: string): string {
  return ROW_ISSUE[code] ?? code;
}

export type ImportBatch = components["schemas"]["ImportBatchRead"];
export type ImportRowError = components["schemas"]["ImportRowError"];
