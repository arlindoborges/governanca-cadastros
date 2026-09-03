"use client";

import { useCallback, useState } from "react";

import {
  getImportBatchMappingStatus,
  getImportBatchUploadStatus,
  startColumnMapping,
  startImportBatchUpload,
  type ImportBatchProcessingStatus,
} from "@/features/imports/actions";

const POLL_INTERVAL_MS = 400;

type MappingPayload = {
  source_code: string;
  original_description: string;
  original_unit: string;
};

type RunResult = { ok: true; batchId: string } | { ok: false; message: string };

async function pollUntilComplete(
  batchId: string,
  scope: "upload" | "mapping",
  onProgress: (status: ImportBatchProcessingStatus) => void,
): Promise<RunResult> {
  const getStatus =
    scope === "upload" ? getImportBatchUploadStatus : getImportBatchMappingStatus;

  while (true) {
    const status = await getStatus(batchId);
    if (!status.ok) {
      return { ok: false, message: status.error.message };
    }

    const current = status.data.data;
    onProgress(current);

    if (current.status === "COMPLETED") {
      return { ok: true, batchId };
    }
    if (current.status === "FAILED") {
      return { ok: false, message: current.message };
    }

    await new Promise((resolve) => {
      window.setTimeout(resolve, POLL_INTERVAL_MS);
    });
  }
}

export function useImportBatchProcessing() {
  const [progress, setProgress] = useState<ImportBatchProcessingStatus | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runUpload = useCallback(async (formData: FormData): Promise<RunResult> => {
    setIsRunning(true);
    setProgress({
      status: "RUNNING",
      processed: 0,
      total: 0,
      percent: 0,
      message: "Iniciando upload...",
    });

    const started = await startImportBatchUpload(formData);
    if (!started.ok) {
      setIsRunning(false);
      setProgress(null);
      return { ok: false, message: started.error.message };
    }

    setProgress(started.data.data);

    const batchId = started.data.data.batch_id;
    if (!batchId) {
      setIsRunning(false);
      setProgress(null);
      return { ok: false, message: "Resposta da API sem identificador do lote." };
    }

    const result = await pollUntilComplete(String(batchId), "upload", setProgress);
    setIsRunning(false);
    if (!result.ok) {
      setProgress(null);
    }
    return result;
  }, []);

  const runMapping = useCallback(
    async (batchId: string, payload: MappingPayload): Promise<RunResult> => {
      setIsRunning(true);
      setProgress({
        status: "RUNNING",
        processed: 0,
        total: 0,
        percent: 0,
        message: "Iniciando mapeamento...",
        batch_id: batchId,
      });

      const started = await startColumnMapping(batchId, payload);
      if (!started.ok) {
        setIsRunning(false);
        setProgress(null);
        return { ok: false, message: started.error.message };
      }

      setProgress(started.data.data);

      const result = await pollUntilComplete(batchId, "mapping", setProgress);
      setIsRunning(false);
      if (!result.ok) {
        setProgress(null);
      }
      return result;
    },
    [],
  );

  return {
    progress,
    isRunning,
    runUpload,
    runMapping,
  };
}
