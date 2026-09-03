import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteImportBatchButton } from "@/features/imports/DeleteImportBatchButton";
import { ImportStatusBadge } from "@/features/imports/ImportStatusBadge";
import { MappingForm } from "@/features/imports/MappingForm";
import { RowErrorsTable } from "@/features/imports/RowErrorsTable";
import { apiGet } from "@/lib/api/client";
import { formatDateTime } from "@/lib/datetime";
import type { components } from "@/generated/openapi";

type ImportBatchPreviewResponse = components["schemas"]["ImportBatchPreviewResponse"];
type ImportRowErrorListResponse = components["schemas"]["ImportRowErrorListResponse"];

type Props = {
  params: Promise<{ batchId: string }>;
};

export default async function ImportacaoLotePage({ params }: Props) {
  const { batchId } = await params;
  if (!uuidLike(batchId)) {
    notFound();
  }

  const batchResult = await apiGet<ImportBatchPreviewResponse>(
    `/api/v1/imports/batches/${batchId}`,
  );
  if (!batchResult.ok) {
    if (batchResult.status === 404) {
      notFound();
    }
    return (
      <>
        <header className="page-header">
          <h1>Lote de importação</h1>
        </header>
        <p role="alert">{batchResult.error.message}</p>
      </>
    );
  }

  const preview = batchResult.data.data;
  const batch = preview.batch;
  const errorsResult =
    batch.status === "COMPLETED"
      ? await apiGet<ImportRowErrorListResponse>(
          `/api/v1/imports/batches/${batchId}/row-errors?page=1&page_size=50`,
        )
      : null;

  return (
    <>
      <nav className="breadcrumb" aria-label="Navegação">
        <Link href="/importacoes">Importações</Link>
        <span aria-hidden="true">/</span>
        <span>{batch.file_name}</span>
      </nav>

      <header className="page-header page-header--detail">
        <div className="page-header__main">
          <h1>{batch.file_name}</h1>
          <ImportStatusBadge status={batch.status} />
        </div>
        <div className="page-header__actions">
          <DeleteImportBatchButton batchId={batch.id} fileName={batch.file_name} />
        </div>
        <p className="page-intro">
          {batch.status === "AWAITING_MAPPING"
            ? "Revise o mapeamento das colunas e confirme para processar o lote."
            : batch.status === "COMPLETED"
              ? "Importação concluída. Revise abaixo as linhas que não passaram na validação."
              : "Acompanhe o processamento e o resultado da validação cadastral."}
        </p>
      </header>

      <div className="stat-cards" aria-label="Resumo do lote">
        <div className="stat-card">
          <span className="stat-card__label">Total de linhas</span>
          <strong className="stat-card__value">{batch.total_rows}</strong>
        </div>
        <div className="stat-card stat-card--ok">
          <span className="stat-card__label">Válidas</span>
          <strong className="stat-card__value">{batch.valid_rows}</strong>
        </div>
        <div className="stat-card stat-card--bad">
          <span className="stat-card__label">Inválidas</span>
          <strong className="stat-card__value">{batch.invalid_rows}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">Criado em</span>
          <strong className="stat-card__value stat-card__value--text">
            {formatDateTime(batch.created_at)}
          </strong>
        </div>
        {batch.imported_at ? (
          <div className="stat-card">
            <span className="stat-card__label">Processado em</span>
            <strong className="stat-card__value stat-card__value--text">
              {formatDateTime(batch.imported_at)}
            </strong>
          </div>
        ) : null}
      </div>

      {batch.status === "AWAITING_MAPPING" ? (
        preview.headers.length > 0 ? (
          <MappingForm
            batchId={batch.id}
            headers={preview.headers}
            sampleRows={preview.sample_rows}
          />
        ) : (
          <p role="alert">
            O arquivo temporário deste lote não está mais disponível. Envie a planilha novamente.
          </p>
        )
      ) : null}

      {errorsResult ? (
        errorsResult.ok ? (
          <section className="section" aria-labelledby="erros-titulo">
            <div className="section-header">
              <h2 id="erros-titulo">Erros por linha</h2>
              <p>Linhas rejeitadas na validação cadastral e o motivo de cada uma.</p>
            </div>
            <RowErrorsTable errors={errorsResult.data.data.items} total={errorsResult.data.data.total} />
          </section>
        ) : (
          <p role="alert">{errorsResult.error.message}</p>
        )
      ) : null}
    </>
  );
}

function uuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
