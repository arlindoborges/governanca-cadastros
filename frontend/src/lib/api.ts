const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...init?.headers,
      },
      cache: "no-store",
    });
  } catch {
    throw new Error("Não foi possível conectar à API. Verifique se o backend está rodando.");
  }

  const raw = await response.text();
  let payload: { data?: T; error?: { message?: string } } = {};
  if (raw) {
    try {
      payload = JSON.parse(raw) as typeof payload;
    } catch {
      throw new Error(raw || `Erro na API (${response.status})`);
    }
  }

  if (!response.ok) {
    const message = payload?.error?.message ?? `Erro na API (${response.status})`;
    throw new Error(message);
  }
  return payload.data as T;
}

export function getDashboard() {
  return request<{
    projects: number;
    batches: number;
    master_products: number;
    mappings: number;
    pending_review: number;
    sanitization_configured: boolean;
  }>("/dashboard");
}

export type SanitizationDecision = {
  key: string;
  label: string;
  adopted: string;
  alternative: string;
  choice: "adopted" | "alternative";
};

export type SanitizationStep = {
  code: string;
  title: string;
  objective: string;
  enabled?: boolean;
  decisions: SanitizationDecision[];
};

export type SanitizationConfigPayload = {
  version: number;
  principles: string[];
  steps: SanitizationStep[];
};

export type SanitizationConfigResponse = {
  configured: boolean;
  updated_at?: string;
  config: SanitizationConfigPayload;
};

export function getSanitizationConfig() {
  return request<SanitizationConfigResponse>("/sanitization-config");
}

export function saveSanitizationConfig(config: SanitizationConfigPayload) {
  return request<SanitizationConfigResponse>("/sanitization-config", {
    method: "PUT",
    body: JSON.stringify(config),
  });
}

export function listProjects() {
  return request<{ items: Array<{ id: string; name: string; description: string | null; status: string }> }>(
    "/projects",
  );
}

export function createProject(name: string, description?: string) {
  return request<{ id: string; name: string }>("/projects", {
    method: "POST",
    body: JSON.stringify({ name, description }),
  });
}

export function updateProject(projectId: string, name: string, description?: string) {
  return request<{ id: string; name: string; description: string | null; status: string }>(
    `/projects/${projectId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ name, description }),
    },
  );
}

export function deleteProject(projectId: string) {
  return request<{ deleted: boolean }>(`/projects/${projectId}`, { method: "DELETE" });
}

export function listBatches(projectId: string) {
  return request<{ items: Array<{ id: string; file_name: string; status: string; total_rows: number }> }>(
    `/projects/${projectId}/batches`,
  );
}

export function previewImport(file: File) {
  const form = new FormData();
  form.append("file", file);
  return request<{
    headers: string[];
    suggested_mapping: {
      source_code?: string;
      original_description?: string;
      original_unit?: string;
    };
    importable_rows: number;
  }>("/imports/preview", { method: "POST", body: form });
}

export function importBatch(
  projectId: string,
  file: File,
  mapping: { source_code?: string; original_description: string; original_unit?: string },
) {
  const form = new FormData();
  form.append("file", file);
  if (mapping.source_code) form.append("source_code", mapping.source_code);
  form.append("original_description", mapping.original_description);
  if (mapping.original_unit) form.append("original_unit", mapping.original_unit);
  return request<{ batch_id: string; total_rows: number }>(`/projects/${projectId}/imports`, {
    method: "POST",
    body: form,
  });
}

export function sanitizeBatch(batchId: string) {
  return request<{ processed: number; total: number; records?: number; equivalents?: number }>(
    `/batches/${batchId}/sanitize`,
    { method: "POST" },
  );
}

export function deleteImportBatch(batchId: string) {
  return request<{ deleted: boolean }>(`/batches/${batchId}`, { method: "DELETE" });
}

export type BatchDetail = {
  id: string;
  project_id: string;
  project_name: string | null;
  file_name: string;
  source_name: string | null;
  status: string;
  total_rows: number;
  created_at: string;
};

export function getBatch(batchId: string) {
  return request<BatchDetail>(`/batches/${batchId}`);
}

export function listBatchRecords(
  batchId: string,
  params?: {
    q?: string;
    sort?: string;
    order?: "asc" | "desc";
    page?: number;
    page_size?: number;
  },
) {
  const query = new URLSearchParams();
  if (params?.q) query.set("q", params.q);
  if (params?.sort) query.set("sort", params.sort);
  if (params?.order) query.set("order", params.order);
  if (params?.page) query.set("page", String(params.page));
  if (params?.page_size) query.set("page_size", String(params.page_size));
  const suffix = query.size ? `?${query.toString()}` : "";
  return request<{
    batch: BatchDetail;
    items: RecordPayload[];
    page: number;
    page_size: number;
    total: number;
  }>(`/batches/${batchId}/records${suffix}`);
}

export function listDiagnostics(
  batchId: string,
  params?: {
    identification?: string;
    q?: string;
    sort?: string;
    order?: "asc" | "desc";
    page?: number;
    page_size?: number;
  },
) {
  const query = new URLSearchParams();
  if (params?.identification) query.set("identification", params.identification);
  if (params?.q) query.set("q", params.q);
  if (params?.sort) query.set("sort", params.sort);
  if (params?.order) query.set("order", params.order);
  if (params?.page) query.set("page", String(params.page));
  if (params?.page_size) query.set("page_size", String(params.page_size));
  const suffix = query.size ? `?${query.toString()}` : "";
  return request<{
    batch: BatchDetail;
    items: DiagnosticItem[];
    page: number;
    page_size: number;
    total: number;
    summary: {
      total: number;
      unicos: number;
      duplicados: number;
      grupos_duplicidade: number;
      tratados: number;
    };
  }>(`/batches/${batchId}/diagnostics${suffix}`);
}

export function applyDiagnosticTreatment(batchId: string) {
  return request<{
    mantidos: number;
    inativados: number;
    masters_created: number;
    total: number;
  }>(`/batches/${batchId}/diagnostics/apply`, { method: "POST" });
}

export type DiagnosticItem = {
  id: string;
  row_number: number;
  original_description: string | null;
  sanitized_description: string | null;
  identification: "UNICO" | "DUPLICADO";
  duplicate_reference: string | null;
  disposition: "MANTER" | "INATIVAR";
  disposition_editable: boolean;
  treated_code: string | null;
  treated_description: string | null;
  governance_status: string | null;
  record_status: "ATIVO" | "INATIVADO" | null;
};

export function saveDiagnosticDisposition(
  batchId: string,
  body: { source_record_id: string; disposition: "MANTER" | "INATIVAR" },
) {
  return request<{
    source_record_id: string;
    disposition: "MANTER" | "INATIVAR";
    duplicate_reference: string | null;
    updated: Array<{ id: string; disposition: "MANTER" | "INATIVAR" }>;
  }>(`/batches/${batchId}/diagnostics/dispositions`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function matchBatch(batchId: string) {
  return request<{ records: number; equivalents: number }>(`/batches/${batchId}/match`, { method: "POST" });
}

export function reviewQueue(
  batchId: string,
  params?: {
    relationship?: string;
    q?: string;
    sort?: string;
    order?: "asc" | "desc";
    page?: number;
    page_size?: number;
  },
) {
  const query = new URLSearchParams();
  if (params?.relationship) query.set("relationship", params.relationship);
  if (params?.q) query.set("q", params.q);
  if (params?.sort) query.set("sort", params.sort);
  if (params?.order) query.set("order", params.order);
  if (params?.page) query.set("page", String(params.page));
  if (params?.page_size) query.set("page_size", String(params.page_size));
  const suffix = query.size ? `?${query.toString()}` : "";
  return request<{
    items: ReviewItem[];
    page: number;
    page_size: number;
    total: number;
    summary: { EQUIVALENT: number; SIMILAR: number; DIFFERENT: number };
  }>(`/batches/${batchId}/queue${suffix}`);
}

export type ReviewItem = {
  candidate_id: string;
  relationship_class: string;
  score: number;
  treatable: boolean;
  governance_group_code: string | null;
  governance_group_size: number | null;
  source: RecordPayload;
  candidate: RecordPayload;
};

export type RecordPayload = {
  id: string;
  row_number: number;
  source_code: string | null;
  original_description: string | null;
  sanitized_description: string | null;
  original_unit: string | null;
  processing_status?: string;
};

export function applyDecision(
  batchId: string,
  body: {
    decision: string;
    source_record_id?: string;
    candidate_id?: string;
    governance_group_code?: string;
    excluded_source_record_ids?: string[];
    reason?: string;
  },
) {
  return request<{ applied: Array<{ source_record_id: string; master_product_id: string | null }> }>(
    `/batches/${batchId}/decisions`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export function listMasters(params?: {
  q?: string;
  status?: string;
  sort?: string;
  order?: "asc" | "desc";
  page?: number;
  page_size?: number;
}) {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.status) search.set("status", params.status);
  if (params?.sort) search.set("sort", params.sort);
  if (params?.order) search.set("order", params.order);
  if (params?.page) search.set("page", String(params.page));
  if (params?.page_size) search.set("page_size", String(params.page_size));
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return request<{
    items: Array<{
      id: string;
      master_code: string;
      original_description: string | null;
      sanitized_description: string | null;
      description: string;
      unit: string;
      status: string;
      inactive_count: number;
    }>;
    page: number;
    page_size: number;
    total: number;
  }>(`/master-products${suffix}`);
}

export function listMasterInactiveRecords(masterId: string) {
  return request<{
    items: Array<{
      id: string;
      row_number: number;
      source_code: string | null;
      original_description: string | null;
      sanitized_description: string | null;
      unit: string | null;
      conversion_factor: number;
    }>;
  }>(`/master-products/${masterId}/inactive-records`);
}

export function unifyMasters(body: {
  selected_master_ids: string[];
  target_master_id: string;
  conversion_factors?: Array<{ master_id: string; factor: number }>;
}) {
  return request<{
    target_master_id: string;
    target_master_code: string;
    unified_masters: number;
    unified_mappings: number;
  }>("/master-products/unify", { method: "POST", body: JSON.stringify(body) });
}

export function listMappings() {
  return request<{
    items: Array<{
      id: string;
      mapping_type: string;
      master_code: string;
      master_description: string;
      source_code: string | null;
      original_description: string | null;
      conversion_factor: number;
    }>;
  }>("/mappings");
}
