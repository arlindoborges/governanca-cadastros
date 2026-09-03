"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ProcessingDialog } from "@/components/shared/ProcessingDialog";
import { refreshAnalysesPage } from "@/features/matching/actions";
import { useMatchingProcessing } from "@/features/matching/use-matching-processing";
import type { components } from "@/generated/openapi";

type Batch = components["schemas"]["MatchingEligibleBatch"];
type MatchingSummary = components["schemas"]["MatchingBatchSummary"];

type Props = {
  batches: Batch[];
  selectedBatchId?: string;
};

export function MatchingPanel({ batches, selectedBatchId }: Props) {
  const router = useRouter();
  const { progress, isRunning, run, clearProgress } = useMatchingProcessing();
  const initialBatch = batches.find((batch) => batch.id === selectedBatchId) ?? batches[0];
  const [batchId, setBatchId] = useState(initialBatch?.id ?? "");
  const [summary, setSummary] = useState<MatchingSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (batches.length === 0) {
    return (
      <div className="empty-state" role="status">
        <p className="empty-state__title">Nenhum lote pronto para matching</p>
        <p className="empty-state__text">
          Normalize um lote concluído antes de executar a análise de similaridade.
        </p>
      </div>
    );
  }

  const showSummary = summary?.batch_id === batchId;

  return (
    <>
      <ProcessingDialog
        open={isRunning}
        title="Executando matching"
        message={progress?.message ?? "Comparando registros e gerando candidatos..."}
        processed={progress?.processed}
        total={progress?.total}
        percent={progress?.percent}
      />
      <div className="stack-form panel">
        <h2>Executar matching</h2>
        <p className="panel-intro">
          Compara registros normalizados do lote com baseline lexical e por atributos, gerando
          candidatos e evidências.
        </p>
        <div className="field field--wide">
          <label htmlFor="matching-batch-id">Lote normalizado</label>
          <select
            id="matching-batch-id"
            name="batch_id"
            required
            value={batchId}
            disabled={isRunning}
            onChange={(event) => {
              setBatchId(event.target.value);
              setSummary(null);
              setErrorMessage(null);
              clearProgress();
            }}
          >
            {batches.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.file_name} ({batch.valid_rows} válidas)
              </option>
            ))}
          </select>
        </div>
        {errorMessage ? <p role="alert">{errorMessage}</p> : null}
        {showSummary ? (
          <div className="result-banner" role="status">
            <strong>{summary.file_name}</strong>
            <span>
              {summary.processed_records} processados · {summary.equivalent_records} equivalentes ·{" "}
              {summary.similar_records} similares · {summary.different_records} diferentes ·{" "}
              {summary.candidates_created} candidatos
            </span>
          </div>
        ) : null}
        <button
          type="button"
          disabled={isRunning || !batchId}
          onClick={async () => {
            setErrorMessage(null);
            setSummary(null);
            const result = await run(batchId);
            if (result.ok) {
              setSummary(result.summary);
              await refreshAnalysesPage();
              router.refresh();
              return;
            }
            setErrorMessage(result.message);
          }}
        >
          {isRunning ? "Analisando..." : "Executar matching"}
        </button>
      </div>
    </>
  );
}
