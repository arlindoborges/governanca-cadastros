"use client";

import { useActionState, useState } from "react";

import { uploadImportBatch } from "@/features/imports/actions";
import type { ActionState } from "@/lib/forms/action-state";
import {
  IMPORT_MAX_ROWS,
  IMPORT_REQUIRED_COLUMNS,
  IMPORT_TEMPLATE_FILE_NAME,
  IMPORT_TEMPLATE_PATH,
} from "@/features/imports/template";
import { isXlsxFileName, XLSX_ACCEPT } from "@/features/imports/validation";
import { useActionRedirect } from "@/lib/forms/use-action-redirect";

export function UploadForm() {
  const [state, action, pending] = useActionState(uploadImportBatch, null as ActionState);
  useActionRedirect(state);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  return (
    <form action={action} className="stack-form panel">
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
      {state && !state.ok ? <p role="alert">{state.error.message}</p> : null}
      <button type="submit" disabled={pending || Boolean(localError)}>
        {pending ? "Enviando..." : "Enviar para mapeamento"}
      </button>
    </form>
  );
}
