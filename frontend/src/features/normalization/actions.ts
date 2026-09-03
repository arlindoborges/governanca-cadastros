"use server";

import { revalidatePath } from "next/cache";

import { apiGet, apiSend, type ApiResult } from "@/lib/api/client";
import type { components } from "@/generated/openapi";

type NormalizationRunStatusResponse = components["schemas"]["NormalizationRunStatusResponse"];

export type NormalizationRunStatus = components["schemas"]["NormalizationRunStatus"];

export type ActionState = ApiResult<unknown> | null;

export async function startNormalization(batchId: string) {
  return apiSend<NormalizationRunStatusResponse>(
    `/api/v1/normalization/batches/${batchId}/run`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export async function getNormalizationRunStatus(batchId: string) {
  return apiGet<NormalizationRunStatusResponse>(
    `/api/v1/normalization/batches/${batchId}/run/status`,
  );
}

export async function refreshAnalysesPage() {
  revalidatePath("/analises");
}
