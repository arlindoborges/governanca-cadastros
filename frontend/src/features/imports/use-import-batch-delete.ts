"use client";

import { useCallback, useState } from "react";

import {
  getImportBatchDeleteStatus,
  startImportBatchDelete,
  type ImportBatchDeleteStatus,
} from "@/features/imports/actions";

const POLL_INTERVAL_MS = 400;

type RunResult = { ok: true } | { ok: false; message: string };

export function useImportBatchDelete() {
  const [progress, setProgress] = useState<ImportBatchDeleteStatus | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const run = useCallback(async (batchId: string): Promise<RunResult> => {
    setIsRunning(true);
    setProgress({
      status: "RUNNING",
      processed: 0,
      total: 0,
      percent: 0,
      message: "Iniciando exclusão...",
      batch_id: batchId,
    });

    const started = await startImportBatchDelete(batchId);
    if (!started.ok) {
      setIsRunning(false);
      setProgress(null);
      return { ok: false, message: started.error.message };
    }

    setProgress(started.data.data);

    while (true) {
      const status = await getImportBatchDeleteStatus(batchId);
      if (!status.ok) {
        setIsRunning(false);
        setProgress(null);
        return { ok: false, message: status.error.message };
      }

      const current = status.data.data;
      setProgress(current);

      if (current.status === "COMPLETED") {
        setIsRunning(false);
        return { ok: true };
      }

      if (current.status === "FAILED") {
        setIsRunning(false);
        return { ok: false, message: current.message };
      }

      await new Promise((resolve) => {
        window.setTimeout(resolve, POLL_INTERVAL_MS);
      });
    }
  }, []);

  const clearProgress = useCallback(() => {
    setProgress(null);
  }, []);

  return {
    progress,
    isRunning,
    run,
    clearProgress,
  };
}
