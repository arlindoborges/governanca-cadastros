"use server";

import { revalidatePath } from "next/cache";

import { isXlsxFileName } from "@/features/imports/validation";
import { apiGet, apiSend } from "@/lib/api/client";
import type { components } from "@/generated/openapi";

type ImportBatchProcessingStatusResponse =
  components["schemas"]["ImportBatchProcessingStatusResponse"];
type ImportBatchDeleteStatusResponse = components["schemas"]["ImportBatchDeleteStatusResponse"];

export type ImportBatchProcessingStatus = components["schemas"]["ImportBatchProcessingStatus"];
export type ImportBatchDeleteStatus = components["schemas"]["ImportBatchDeleteStatus"];

type ColumnMappingPayload = {
  source_code: string;
  original_description: string;
  original_unit: string;
};

export async function startImportBatchUpload(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof Blob) || file.size === 0) {
    return {
      ok: false as const,
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
      ok: false as const,
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

  return apiSend<ImportBatchProcessingStatusResponse>("/api/v1/imports/batches", {
    method: "POST",
    body,
  });
}

export async function startColumnMapping(batchId: string, payload: ColumnMappingPayload) {
  return apiSend<ImportBatchProcessingStatusResponse>(
    `/api/v1/imports/batches/${batchId}/mapping`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function getImportBatchUploadStatus(batchId: string) {
  return apiGet<ImportBatchProcessingStatusResponse>(
    `/api/v1/imports/batches/${batchId}/upload/status`,
  );
}

export async function getImportBatchMappingStatus(batchId: string) {
  return apiGet<ImportBatchProcessingStatusResponse>(
    `/api/v1/imports/batches/${batchId}/mapping/status`,
  );
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
