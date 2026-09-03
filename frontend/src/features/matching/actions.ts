"use server";

import { revalidatePath } from "next/cache";

import { apiSend, type ApiResult } from "@/lib/api/client";
import type { components } from "@/generated/openapi";

type MatchingSummaryResponse = components["schemas"]["MatchingBatchSummaryResponse"];

export type ActionState = ApiResult<unknown> | null;

export async function runMatching(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const batchId = String(formData.get("batch_id") ?? "");
  const result = await apiSend<MatchingSummaryResponse>(
    `/api/v1/matching/batches/${batchId}/run`,
    { method: "POST", body: JSON.stringify({}) },
  );
  if (result.ok) {
    revalidatePath("/analises");
  }
  return result;
}
