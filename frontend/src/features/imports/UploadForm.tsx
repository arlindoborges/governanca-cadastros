"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ProcessingDialog } from "@/components/shared/ProcessingDialog";
import { refreshImportsPages } from "@/features/imports/actions";
import {
  IMPORT_MAX_ROWS,
  IMPORT_REQUIRED_COLUMNS,
  IMPORT_TEMPLATE_FILE_NAME,
  IMPORT_TEMPLATE_PATH,
} from "@/features/imports/template";
import { useImportBatchProcessing } from "@/features/imports/use-import-batch-processing";
import { isXlsxFileName, XLSX_ACCEPT } from "@/features/imports/validation";

export function UploadForm() {
  const router = useRouter();
  const { progress, isRunning, runUpload } = useImportBatchProcessing();
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <>
      <ProcessingDialog
        open={isRunning}
        title="Processando importação"
        message={progress?.message ?? "Lendo planilha e validando linhas..."}
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
          const result = await runUpload(formData);
          if (!result.ok) {
            setErrorMessage(result.message);
            return;
          }

          await refreshImportsPages(result.batchId);
          router.push(`/importacoes/${result.batchId}`);
          router.refresh();
        }}
      >
        <h2>Enviar arquivo</h2>
        <p className="panel-intro">
          Anexe a planilha XLSX. A primeira linha deve conter as colunas de{" "}
          {IMPORT_REQUIRED_COLUMNS.join(", ")}.
        </p>
        <p className="field-hint">
          <a className="text-link" download={IMPORT_TEMPLATE_FILE_NAME} href={IMPORT_TEMPLATE_PATH}>
            Baixar modelo de importação (.xlsx)
          </a>
          {" · "}
          Limite de {IMPORT_MAX_ROWS.toLocaleString("pt-BR")} linhas por envio.
        </p>
        <div className="field">
          <label htmlFor="import-file">Arquivo XLSX</label>
          <input
            id="import-file"
            name="file"
            type="file"
            accept={XLSX_ACCEPT}
            required
            disabled={isRunning}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) {
                setSelectedFileName(null);
                setLocalError(null);
                return;
              }
              setSelectedFileName(file.name);
              setLocalError(
                isXlsxFileName(file.name) ? null : "Selecione um arquivo Excel (.xlsx).",
              );
            }}
          />
          <p className="field-hint">Formato aceito: planilha Excel .xlsx</p>
          {selectedFileName ? <p className="field-hint">Selecionado: {selectedFileName}</p> : null}
        </div>
        {localError ? <p role="alert">{localError}</p> : null}
        {errorMessage ? <p role="alert">{errorMessage}</p> : null}
        <button type="submit" disabled={isRunning || Boolean(localError)}>
          {isRunning ? "Enviando..." : "Enviar para mapeamento"}
        </button>
      </form>
    </>
  );
}
