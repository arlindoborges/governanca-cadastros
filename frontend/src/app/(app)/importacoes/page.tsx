import { BatchList } from "@/features/imports/BatchList";
import { UploadForm } from "@/features/imports/UploadForm";
import { apiGet } from "@/lib/api/client";
import type { components } from "@/generated/openapi";

type ImportBatchListResponse = components["schemas"]["ImportBatchListResponse"];

export default async function ImportacoesPage() {
  const batchesResult = await apiGet<ImportBatchListResponse>(
    "/api/v1/imports/batches?page=1&page_size=20",
  );

  if (!batchesResult.ok) {
    return (
      <>
        <header className="page-header">
          <h1>Importações</h1>
        </header>
        <p role="alert">{batchesResult.error.message}</p>
      </>
    );
  }

  const batches = batchesResult.data.data.items;

  return (
    <>
      <header className="page-header">
        <h1>Importações</h1>
        <p className="page-intro">
          Envie uma planilha XLSX, mapeie código, descrição e unidade e acompanhe as linhas
          inválidas. O arquivo original não fica armazenado após o processamento.
        </p>
      </header>

      <section className="section" aria-labelledby="novo-envio-titulo">
        <div className="section-header">
          <h2 id="novo-envio-titulo">Novo envio</h2>
          <p>Anexe a planilha para iniciar o mapeamento.</p>
        </div>
        <UploadForm />
      </section>

      <section className="section" aria-labelledby="historico-titulo">
        <div className="section-header section-header--inline">
          <div>
            <h2 id="historico-titulo">Histórico de lotes</h2>
            <p>Acompanhe status, validação e detalhes de cada importação.</p>
          </div>
          <p className="section-meta" aria-label="Total de lotes listados">
            {batches.length} lote{batches.length === 1 ? "" : "s"}
          </p>
        </div>
        <BatchList batches={batches} />
      </section>
    </>
  );
}
