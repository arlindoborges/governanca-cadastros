const PROJECT_STATUS: Record<string, string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
  ARCHIVED: "Arquivado",
};

const BATCH_STATUS: Record<string, string> = {
  AWAITING_MAPPING: "Aguardando mapeamento",
  IMPORTED: "Importado",
  SANITIZED: "Saneado",
  MATCHED: "Analisado",
  PROCESSING: "Processando",
  COMPLETED: "Concluído",
};

const PROCESSING_STATUS: Record<string, string> = {
  IMPORTED: "Importado",
  SANITIZED: "Saneado",
  PENDING_INFORMATION: "Pendente de informação",
  NORMALIZED: "Normalizado",
};

const RELATIONSHIP_CLASS: Record<string, string> = {
  EQUIVALENT: "Equivalente",
  SIMILAR: "Similar",
  DIFFERENT: "Diferente",
};

const MAPPING_TYPE: Record<string, string> = {
  DE_PARA: "DE/PARA",
  EQUIVALENCE: "Equivalência",
};

const MASTER_STATUS: Record<string, string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
};

function translate(map: Record<string, string>, value: string): string {
  return map[value] ?? value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export function projectStatusLabel(value: string): string {
  return translate(PROJECT_STATUS, value);
}

export function batchStatusLabel(value: string): string {
  return translate(BATCH_STATUS, value);
}

export function processingStatusLabel(value: string): string {
  return translate(PROCESSING_STATUS, value);
}

export function relationshipClassLabel(value: string): string {
  return translate(RELATIONSHIP_CLASS, value);
}

export function mappingTypeLabel(value: string): string {
  return translate(MAPPING_TYPE, value);
}

export function masterStatusLabel(value: string): string {
  return translate(MASTER_STATUS, value);
}
