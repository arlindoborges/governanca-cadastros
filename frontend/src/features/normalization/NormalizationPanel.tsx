"use client";

import { useRouter } from "next/navigation";
import { useState, type CSSProperties } from "react";

import { ProcessingDialog } from "@/components/shared/ProcessingDialog";
import { refreshAnalysesPage } from "@/features/normalization/actions";
import {
  applyChoiceAdoption,
  DEFAULT_FASE1_OPTIONS,
  DESCRIPTION_SANITIZE_STEPS,
  isChoiceAdopted,
  payloadFromOptions,
  type Fase1Options,
} from "@/features/normalization/description-sanitize";
import { useNormalizationProcessing } from "@/features/normalization/use-normalization-processing";
import type { components } from "@/generated/openapi";

type Batch = components["schemas"]["NormalizationEligibleBatch"];
type NormalizationSummary = components["schemas"]["NormalizationBatchSummary"];

type Props = {
  batches: Batch[];
  selectedBatchId?: string;
};

export function NormalizationPanel({ batches, selectedBatchId }: Props) {
  const router = useRouter();
  const { progress, isRunning, run, clearProgress } = useNormalizationProcessing();
  const initialBatch = batches.find((batch) => batch.id === selectedBatchId) ?? batches[0];
  const [batchId, setBatchId] = useState(initialBatch?.id ?? "");
  const [summary, setSummary] = useState<NormalizationSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fase1, setFase1] = useState<Fase1Options>(DEFAULT_FASE1_OPTIONS);

  if (batches.length === 0) {
    return (
      <div className="empty-state" role="status">
        <p className="empty-state__title">Nenhum lote disponível</p>
        <p className="empty-state__text">
          Conclua uma importação em Importações para habilitar a normalização.
        </p>
      </div>
    );
  }

  const showSummary = summary?.batch_id === batchId;

  return (
    <>
      <ProcessingDialog
        open={isRunning}
        title="Normalizando lote"
        message={progress?.message ?? "Processando registros..."}
        processed={progress?.processed}
        total={progress?.total}
        percent={progress?.percent}
      />
      <div className="stack-form panel">
        <h2>Normalizar lote</h2>
        <p className="panel-intro">
          Aplica regras determinísticas do perfil local, extrai atributos e registra pendências de
          informação ausente.
        </p>
        <div className="field field--wide">
          <label htmlFor="batch-id">Lote importado</label>
          <select
            id="batch-id"
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
        <fieldset className="option-group" disabled={isRunning}>
          <legend>Personalizada</legend>
          <p className="field-hint">
            Cada passo da Fase 1 tem as escolhas da regra. O padrão é o homologado.
          </p>
          <ol className="step-list">
            {DESCRIPTION_SANITIZE_STEPS.map((step) => (
              <li key={step.title}>
                <fieldset className="step-row">
                  <legend>{step.title}</legend>
                  {step.objective ? <p className="step-objective">{step.objective}</p> : null}
                  <div
                    className="step-choices"
                    style={{ "--step-cols": step.choices.length } as CSSProperties}
                  >
                    {step.choices.map((choice) => {
                      const choiceId = choice.id ?? choice.key;
                      const selectId = `fase1-${choiceId}`;
                      const currentValue = isChoiceAdopted(fase1, choice) ? "padrao" : "manter";
                      return (
                        <div key={choiceId} className="step-choice">
                          <label htmlFor={selectId}>{choice.label}</label>
                          {choice.hint ? <p className="step-choice__hint">{choice.hint}</p> : null}
                          <select
                            id={selectId}
                            value={currentValue}
                            onChange={(event) => {
                              const adopted = event.target.value === "padrao";
                              setFase1((current) => applyChoiceAdoption(current, choice, adopted));
                            }}
                          >
                            {choice.options.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </fieldset>
              </li>
            ))}
          </ol>
        </fieldset>
        {errorMessage ? <p role="alert">{errorMessage}</p> : null}
        {showSummary ? (
          <div className="result-banner" role="status">
            <strong>{summary.file_name}</strong>
            <span>
              {summary.processed_records} processados · {summary.normalized_records} normalizados ·{" "}
              {summary.pending_information_records} com pendência · {summary.attributes_created}{" "}
              atributos · {summary.issues_created} pendências abertas
            </span>
          </div>
        ) : null}
        <button
          type="button"
          disabled={isRunning || !batchId}
          onClick={async () => {
            setErrorMessage(null);
            setSummary(null);
            const result = await run(batchId, payloadFromOptions(fase1));
            if (result.ok) {
              setSummary(result.summary);
              await refreshAnalysesPage();
              router.refresh();
              return;
            }
            setErrorMessage(result.message);
          }}
        >
          {isRunning ? "Normalizando..." : "Executar normalização"}
        </button>
      </div>
    </>
  );
}
