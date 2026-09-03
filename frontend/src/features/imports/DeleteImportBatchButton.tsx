"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ProcessingDialog } from "@/components/shared/ProcessingDialog";
import { refreshImportsPages } from "@/features/imports/actions";
import { useImportBatchDelete } from "@/features/imports/use-import-batch-delete";

type Props = {
  batchId: string;
  fileName: string;
  returnTo?: string;
  compact?: boolean;
};

export function DeleteImportBatchButton({
  batchId,
  fileName,
  returnTo = "/importacoes",
  compact = false,
}: Props) {
  const router = useRouter();
  const { progress, isRunning, run } = useImportBatchDelete();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <>
      <ProcessingDialog
        open={isRunning}
        title="Excluindo lote"
        message={progress?.message ?? "Removendo registros e dados derivados..."}
        processed={progress?.processed}
        total={progress?.total}
        percent={progress?.percent}
      />
      <div className={compact ? "inline-form" : "stack-form"}>
        {errorMessage ? (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <button
          type="button"
          className={compact ? "button-danger button-danger--compact" : "button-danger"}
          disabled={isRunning}
          onClick={async () => {
            if (
              !window.confirm(
                `Excluir o lote "${fileName}"? Todos os registros, normalizações e matchings derivados serão removidos.`,
              )
            ) {
              return;
            }

            const result = await run(batchId);
            if (!result.ok) {
              setErrorMessage(result.message);
              return;
            }

            await refreshImportsPages(batchId);
            router.push(returnTo);
            router.refresh();
          }}
        >
          {isRunning ? "Excluindo..." : "Excluir"}
        </button>
      </div>
    </>
  );
}
