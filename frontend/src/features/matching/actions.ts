"use server";

import { revalidatePath } from "next/cache";

import { apiGet, apiSend } from "@/lib/api/client";
import type { components } from "@/generated/openapi";

type MatchingRunStatusResponse = components["schemas"]["MatchingRunStatusResponse"];

export type MatchingRunStatus = components["schemas"]["MatchingRunStatus"];

export async function startMatching(batchId: string) {
  return apiSend<MatchingRunStatusResponse>(`/api/v1/matching/batches/${batchId}/run`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function getMatchingRunStatus(batchId: string) {
  return apiGet<MatchingRunStatusResponse>(`/api/v1/matching/batches/${batchId}/run/status`);
}

export async function refreshAnalysesPage() {
  revalidatePath("/analises");
}
