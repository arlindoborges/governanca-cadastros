"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ProcessingDialog } from "@/components/shared/ProcessingDialog";
import { refreshImportsPages } from "@/features/imports/actions";
import { useImportBatchProcessing } from "@/features/imports/use-import-batch-processing";

type Props = {
  batchId: string;
  headers: string[];
  sampleRows: Record<string, string>[];
};

function guessHeader(headers: string[], candidates: string[]): string {
  const normalized = headers.map((header) => header.toLowerCase());
  for (const candidate of candidates) {
    const index = normalized.indexOf(candidate);
    if (index >= 0) {
      return headers[index];
    }
  }
  return headers[0] ?? "";
}

export function MappingForm({ batchId, headers, sampleRows }: Props) {
  const router = useRouter();
  const { progress, isRunning, runMapping } = useImportBatchProcessing();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <>
      <ProcessingDialog
        open={isRunning}
        title="Processando mapeamento"
        message={progress?.message ?? "Aplicando colunas e validando registros..."}
        processed={progress?.processed}
        total={progress?.total}
        percent={progress?.percent}
      />
      <form
        className="stack-form panel"
        onSubmit={async (event) => {
          event.preventDefault();
          setErrorMessage(null);

          const formData = new FormData(event.currentTarget);
          const result = await runMapping(batchId, {
            source_code: String(formData.get("source_code") ?? ""),
            original_description: String(formData.get("original_description") ?? ""),
            original_unit: String(formData.get("original_unit") ?? ""),
          });
          if (!result.ok) {
            setErrorMessage(result.message);
            return;
          }

          await refreshImportsPages(batchId);
          router.push(`/importacoes/${batchId}`);
          router.refresh();
        }}
      >
        <input type="hidden" name="batch_id" value={batchId} />
        <h2>Mapear colunas</h2>
        <p className="panel-intro">
          Código, descrição e unidade são obrigatórios para a validade cadastral.
        </p>
        <div className="field-grid field-grid--3">
          <div className="field">
            <label htmlFor="source-code">Coluna de código</label>
            <select
              id="source-code"
              name="source_code"
              required
              disabled={isRunning}
              defaultValue={guessHeader(headers, ["codigo", "código", "code", "sku"])}
            >
              {headers.map((header) => (
                <option key={`code-${header}`} value={header}>
                  {header}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="original-description">Coluna de descrição</label>
            <select
              id="original-description"
              name="original_description"
              required
              disabled={isRunning}
              defaultValue={guessHeader(headers, [
                "descricao",
                "descrição",
                "description",
                "item",
                "descr",
                "descricao_original",
              ])}
            >
              {headers.map((header) => (
                <option key={`desc-${header}`} value={header}>
                  {header}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="original-unit">Coluna de unidade</label>
            <select
              id="original-unit"
              name="original_unit"
              required
              disabled={isRunning}
              defaultValue={guessHeader(headers, ["unidade", "unit", "un", "und.", "und"])}
            >
              {headers.map((header) => (
                <option key={`unit-${header}`} value={header}>
                  {header}
                </option>
              ))}
            </select>
          </div>
        </div>
        {sampleRows.length > 0 ? (
          <div>
            <h3>Amostra</h3>
            <div className="table-wrap">
              <table>
                <caption>Primeiras linhas do arquivo</caption>
                <thead>
                  <tr>
                    {headers.map((header) => (
                      <th key={header} scope="col">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sampleRows.map((row, index) => (
                    <tr key={`sample-${index}`}>
                      {headers.map((header) => (
                        <td key={`${index}-${header}`}>{row[header] || "—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
        {errorMessage ? <p role="alert">{errorMessage}</p> : null}
        <button type="submit" disabled={isRunning}>
          {isRunning ? "Processando..." : "Confirmar mapeamento"}
        </button>
      </form>
    </>
  );
}
