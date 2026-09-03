"use client";

import { useCallback, useState } from "react";

export type ProcessingState = {
  open: boolean;
  title: string;
  message: string;
  processed: number;
  total: number;
  percent: number;
};

type RunConfig = {
  title: string;
  message: string;
  total?: number;
};

type ProgressReporter = (processed: number, message?: string) => void;

export function useProcessing() {
  const [progress, setProgress] = useState<ProcessingState | null>(null);

  const run = useCallback(
    async <T>(config: RunConfig, task: (report: ProgressReporter) => Promise<T>): Promise<T> => {
      const total = config.total ?? 0;
      setProgress({
        open: true,
        title: config.title,
        message: config.message,
        processed: 0,
        total,
        percent: 0,
      });

      const report: ProgressReporter = (processed, message) => {
        const percent = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;
        setProgress((current) =>
          current
            ? {
                ...current,
                processed,
                total,
                percent,
                message: message ?? current.message,
              }
            : null,
        );
      };

      try {
        const result = await task(report);
        if (total > 0) {
          report(total, "Concluído");
          await new Promise((resolve) => window.setTimeout(resolve, 350));
        }
        return result;
      } finally {
        setProgress(null);
      }
    },
    [],
  );

  return {
    progress,
    isRunning: progress?.open ?? false,
    run,
  };
}
