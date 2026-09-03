"use server";

import { revalidatePath } from "next/cache";

import { isXlsxFileName } from "@/features/imports/validation";
import type { ActionState } from "@/lib/forms/action-state";
import { apiGet, apiSend } from "@/lib/api/client";
import type { components } from "@/generated/openapi";

type ImportBatchPreviewResponse = components["schemas"]["ImportBatchPreviewResponse"];
type ImportBatchDeleteStatusResponse = components["schemas"]["ImportBatchDeleteStatusResponse"];

export type ImportBatchDeleteStatus = components["schemas"]["ImportBatchDeleteStatus"];

export type { ActionRedirectState, ActionState } from "@/lib/forms/action-state";

export async function uploadImportBatch(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const file = formData.get("file");
  if (!(file instanceof Blob) || file.size === 0) {
    return {
      ok: false,
      status: 422,
      error: {
        code: "VALIDATION_ERROR",
        message: "Selecione um arquivo XLSX.",
        details: { field: "file" },
        request_id: crypto.randomUUID(),
      },
    };
  }

  const fileName = file instanceof File && file.name ? file.name : "arquivo.xlsx";
  if (!isXlsxFileName(fileName)) {
    return {
      ok: false,
      status: 422,
      error: {
        code: "VALIDATION_ERROR",
        message: "Envie um arquivo com extensão .xlsx.",
        details: { field: "file" },
        request_id: crypto.randomUUID(),
      },
    };
  }

  const body = new FormData();
  body.set("file", file, fileName);

  const result = await apiSend<ImportBatchPreviewResponse>("/api/v1/imports/batches", {
    method: "POST",
    body,
  });
  if (!result.ok) {
    return result;
  }
  revalidatePath("/importacoes");
  return { ok: true, redirectTo: `/importacoes/${result.data.data.batch.id}` };
}

export async function applyColumnMapping(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const batchId = String(formData.get("batch_id") ?? "");
  const result = await apiSend<ImportBatchPreviewResponse>(
    `/api/v1/imports/batches/${batchId}/mapping`,
    {
      method: "POST",
      body: JSON.stringify({
        source_code: String(formData.get("source_code") ?? ""),
        original_description: String(formData.get("original_description") ?? ""),
        original_unit: String(formData.get("original_unit") ?? ""),
      }),
    },
  );
  if (!result.ok) {
    return result;
  }
  revalidatePath("/importacoes");
  revalidatePath(`/importacoes/${batchId}`);
  return { ok: true, redirectTo: `/importacoes/${batchId}` };
}

export async function startImportBatchDelete(batchId: string) {
  return apiSend<ImportBatchDeleteStatusResponse>(`/api/v1/imports/batches/${batchId}`, {
    method: "DELETE",
  });
}

export async function getImportBatchDeleteStatus(batchId: string) {
  return apiGet<ImportBatchDeleteStatusResponse>(
    `/api/v1/imports/batches/${batchId}/delete/status`,
  );
}

export async function refreshImportsPages(batchId: string) {
  revalidatePath("/importacoes");
  revalidatePath("/analises");
  revalidatePath(`/importacoes/${batchId}`);
}
