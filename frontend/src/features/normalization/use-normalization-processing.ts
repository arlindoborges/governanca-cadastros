"use client";

import { useCallback, useState } from "react";

import {
  getNormalizationRunStatus,
  startNormalization,
  type NormalizationRunStatus,
} from "@/features/normalization/actions";

const POLL_INTERVAL_MS = 400;

type RunResult =
  | { ok: true; summary: NonNullable<NormalizationRunStatus["summary"]> }
  | { ok: false; message: string };

export function useNormalizationProcessing() {
  const [progress, setProgress] = useState<NormalizationRunStatus | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const run = useCallback(async (batchId: string): Promise<RunResult> => {
    setIsRunning(true);
    setProgress({
      status: "RUNNING",
      processed: 0,
      total: 0,
      percent: 0,
      message: "Iniciando normalização...",
      summary: null,
    });

    const started = await startNormalization(batchId);
    if (!started.ok) {
      setIsRunning(false);
      setProgress(null);
      return { ok: false, message: started.error.message };
    }

    setProgress(started.data.data);

    while (true) {
      const status = await getNormalizationRunStatus(batchId);
      if (!status.ok) {
        setIsRunning(false);
        setProgress(null);
        return { ok: false, message: status.error.message };
      }

      const current = status.data.data;
      setProgress(current);

      if (current.status === "COMPLETED") {
        setIsRunning(false);
        if (!current.summary) {
          return { ok: false, message: "Processamento concluído sem resumo." };
        }
        return { ok: true, summary: current.summary };
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
