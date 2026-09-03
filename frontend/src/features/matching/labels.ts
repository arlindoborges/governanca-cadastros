const MATCHING_RESULT: Record<string, string> = {
  EQUIVALENT: "Equivalente",
  SIMILAR: "Similar",
  DIFFERENT: "Diferente",
  PENDING_INFORMATION: "Pendência de informação",
};

const RELATIONSHIP_CLASS: Record<string, string> = {
  EQUIVALENT: "Equivalente",
  SIMILAR: "Similar",
  DIFFERENT: "Diferente",
  INDETERMINATE: "Indeterminado",
};

const CONFIDENCE_LEVEL: Record<string, string> = {
  HIGH: "Alta",
  MEDIUM: "Média",
  LOW: "Baixa",
};

const MATCHING_RESULT_CLASS: Record<string, string> = {
  EQUIVALENT: "status-badge--success",
  SIMILAR: "status-badge--pending",
  DIFFERENT: "status-badge--neutral",
  PENDING_INFORMATION: "status-badge--pending",
};

const RELATIONSHIP_CLASS_BADGE: Record<string, string> = {
  EQUIVALENT: "status-badge--success",
  SIMILAR: "status-badge--pending",
  DIFFERENT: "status-badge--neutral",
  INDETERMINATE: "status-badge--progress",
};

export function matchingResultLabel(result: string): string {
  return MATCHING_RESULT[result] ?? result;
}

export function relationshipClassLabel(value: string): string {
  return RELATIONSHIP_CLASS[value] ?? value;
}

export function confidenceLevelLabel(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  return CONFIDENCE_LEVEL[value] ?? value;
}

export function matchingResultClass(result: string): string {
  return MATCHING_RESULT_CLASS[result] ?? "status-badge--neutral";
}

export function relationshipClassBadge(value: string): string {
  return RELATIONSHIP_CLASS_BADGE[value] ?? "status-badge--neutral";
}

export function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }
  return value.toFixed(2);
}
