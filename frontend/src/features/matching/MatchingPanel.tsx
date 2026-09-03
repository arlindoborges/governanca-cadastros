"use client";

import { useActionState, useState } from "react";

import { ProcessingDialog } from "@/components/shared/ProcessingDialog";
import { runMatching, type ActionState } from "@/features/matching/actions";
import type { components } from "@/generated/openapi";

type Batch = components["schemas"]["MatchingEligibleBatch"];
type MatchingSummaryResponse = components["schemas"]["MatchingBatchSummaryResponse"];

type Props = {
  batches: Batch[];
  selectedBatchId?: string;
};

export function MatchingPanel({ batches, selectedBatchId }: Props) {
  const [state, action, pending] = useActionState(runMatching, null as ActionState);
  const initialBatch = batches.find((batch) => batch.id === selectedBatchId) ?? batches[0];
  const [batchId, setBatchId] = useState(initialBatch?.id ?? "");
  const summary = state?.ok ? (state.data as MatchingSummaryResponse).data : null;
  const showSummary = summary?.batch_id === batchId;

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

  return (
    <>
      <form action={action} className="stack-form panel">
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
          onChange={(event) => setBatchId(event.target.value)}
        >
          {batches.map((batch) => (
            <option key={batch.id} value={batch.id}>
              {batch.file_name} ({batch.valid_rows} válidas)
            </option>
          ))}
        </select>
      </div>
      {state && !state.ok ? <p role="alert">{state.error.message}</p> : null}
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
      <button type="submit" disabled={pending}>
        {pending ? "Analisando..." : "Executar matching"}
      </button>
    </form>
      <ProcessingDialog
        open={pending}
        title="Executando matching"
        message="Comparando registros e gerando candidatos..."
      />
    </>
  );
}
