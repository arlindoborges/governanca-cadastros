import { MatchingPanel } from "@/features/matching/MatchingPanel";
import { MatchingResultsTable } from "@/features/matching/MatchingResultsTable";
import { NormalizationIssuesTable } from "@/features/normalization/NormalizationIssuesTable";
import { NormalizationPanel } from "@/features/normalization/NormalizationPanel";
import { NormalizationRecordsTable } from "@/features/normalization/NormalizationRecordsTable";
import { apiGet } from "@/lib/api/client";
import type { components } from "@/generated/openapi";

type NormalizationEligibleResponse = components["schemas"]["NormalizationEligibleBatchListResponse"];
type MatchingEligibleResponse = components["schemas"]["MatchingEligibleBatchListResponse"];
type NormalizationSummaryResponse = components["schemas"]["NormalizationBatchSummaryResponse"];
type MatchingSummaryResponse = components["schemas"]["MatchingBatchSummaryResponse"];
type RecordsResponse = components["schemas"]["NormalizationRecordListResponse"];
type IssuesResponse = components["schemas"]["ReviewIssueListResponse"];
type MatchingResultsResponse = components["schemas"]["MatchingResultListResponse"];

export default async function AnalisesPage() {
  const [normalizationBatchesResult, matchingBatchesResult] = await Promise.all([
    apiGet<NormalizationEligibleResponse>("/api/v1/normalization/batches"),
    apiGet<MatchingEligibleResponse>("/api/v1/matching/batches"),
  ]);

  if (!normalizationBatchesResult.ok) {
    return (
      <>
        <header className="page-header">
          <h1>Análises</h1>
        </header>
        <p role="alert">{normalizationBatchesResult.error.message}</p>
      </>
    );
  }
  if (!matchingBatchesResult.ok) {
    return (
      <>
        <header className="page-header">
          <h1>Análises</h1>
        </header>
        <p role="alert">{matchingBatchesResult.error.message}</p>
      </>
    );
  }

  const normalizationBatches = normalizationBatchesResult.data.data.items;
  const matchingBatches = matchingBatchesResult.data.data.items;
  const firstNormalizationBatch = normalizationBatches[0];
  const firstMatchingBatch = matchingBatches[0];

  const normalizationSummaryResult = firstNormalizationBatch
    ? await apiGet<NormalizationSummaryResponse>(
        `/api/v1/normalization/batches/${firstNormalizationBatch.id}/summary`,
      )
    : null;
  const normalizationSummary =
    normalizationSummaryResult?.ok ? normalizationSummaryResult.data.data : null;
  const hasNormalized =
    normalizationSummary !== null && normalizationSummary.processed_records > 0;

  const matchingSummaryResult = firstMatchingBatch
    ? await apiGet<MatchingSummaryResponse>(
        `/api/v1/matching/batches/${firstMatchingBatch.id}/summary`,
      )
    : null;
  const matchingSummary = matchingSummaryResult?.ok ? matchingSummaryResult.data.data : null;
  const hasMatching = matchingSummary !== null && matchingSummary.processed_records > 0;

  const recordsResult =
    firstNormalizationBatch && hasNormalized
      ? await apiGet<RecordsResponse>(
          `/api/v1/normalization/batches/${firstNormalizationBatch.id}/records?page=1&page_size=20`,
        )
      : null;
  const issuesResult =
    firstNormalizationBatch && hasNormalized
      ? await apiGet<IssuesResponse>(
          `/api/v1/normalization/batches/${firstNormalizationBatch.id}/issues?page=1&page_size=20`,
        )
      : null;
  const matchingResults =
    firstMatchingBatch && hasMatching
      ? await apiGet<MatchingResultsResponse>(
          `/api/v1/matching/batches/${firstMatchingBatch.id}/results?page=1&page_size=20`,
        )
      : null;

  return (
    <>
      <header className="page-header">
        <h1>Análises</h1>
        <p className="page-intro">
          Normalização determinística e matching lexical sobre lotes importados. Extraia atributos,
          identifique pendências e encontre candidatos equivalentes ou similares.
        </p>
      </header>

      <section className="section" aria-labelledby="normalizar-titulo">
        <div className="section-header">
          <h2 id="normalizar-titulo">Normalização</h2>
          <p>Aplique o perfil de governança local e extraia atributos do lote.</p>
        </div>
        <NormalizationPanel
          batches={normalizationBatches}
          selectedBatchId={firstNormalizationBatch?.id}
        />
      </section>

      {normalizationSummary && hasNormalized ? (
        <section className="section" aria-labelledby="resumo-normalizacao-titulo">
          <div className="section-header section-header--inline">
            <div>
              <h2 id="resumo-normalizacao-titulo">Resumo da normalização</h2>
              <p>{normalizationSummary.file_name}</p>
            </div>
          </div>
          <div className="stat-cards">
            <div className="stat-card">
              <span className="stat-card__label">Processados</span>
              <strong className="stat-card__value">{normalizationSummary.processed_records}</strong>
            </div>
            <div className="stat-card stat-card--ok">
              <span className="stat-card__label">Normalizados</span>
              <strong className="stat-card__value">{normalizationSummary.normalized_records}</strong>
            </div>
            <div className="stat-card stat-card--bad">
              <span className="stat-card__label">Com pendência</span>
              <strong className="stat-card__value">
                {normalizationSummary.pending_information_records}
              </strong>
            </div>
            <div className="stat-card">
              <span className="stat-card__label">Atributos</span>
              <strong className="stat-card__value">{normalizationSummary.attributes_created}</strong>
            </div>
          </div>
        </section>
      ) : null}

      <section className="section" aria-labelledby="matching-titulo">
        <div className="section-header">
          <h2 id="matching-titulo">Matching</h2>
          <p>Compare registros normalizados e gere candidatos com evidências lexicais e por atributo.</p>
        </div>
        <MatchingPanel batches={matchingBatches} selectedBatchId={firstMatchingBatch?.id} />
      </section>

      {matchingSummary && hasMatching ? (
        <section className="section" aria-labelledby="resumo-matching-titulo">
          <div className="section-header section-header--inline">
            <div>
              <h2 id="resumo-matching-titulo">Resumo do matching</h2>
              <p>{matchingSummary.file_name}</p>
            </div>
          </div>
          <div className="stat-cards">
            <div className="stat-card">
              <span className="stat-card__label">Processados</span>
              <strong className="stat-card__value">{matchingSummary.processed_records}</strong>
            </div>
            <div className="stat-card stat-card--ok">
              <span className="stat-card__label">Equivalentes</span>
              <strong className="stat-card__value">{matchingSummary.equivalent_records}</strong>
            </div>
            <div className="stat-card stat-card--pending">
              <span className="stat-card__label">Similares</span>
              <strong className="stat-card__value">{matchingSummary.similar_records}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-card__label">Diferentes</span>
              <strong className="stat-card__value">{matchingSummary.different_records}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-card__label">Candidatos</span>
              <strong className="stat-card__value">{matchingSummary.candidates_created}</strong>
            </div>
            <div className="stat-card stat-card--bad">
              <span className="stat-card__label">Revisão</span>
              <strong className="stat-card__value">{matchingSummary.requires_review_records}</strong>
            </div>
          </div>
        </section>
      ) : null}

      {matchingResults?.ok ? (
        <section className="section" aria-labelledby="resultados-matching-titulo">
          <div className="section-header">
            <h2 id="resultados-matching-titulo">Resultados de matching</h2>
            <p>Conclusão global por registro e melhor candidato encontrado.</p>
          </div>
          <MatchingResultsTable
            items={matchingResults.data.data.items}
            total={matchingResults.data.data.total}
          />
        </section>
      ) : null}

      {recordsResult?.ok ? (
        <section className="section" aria-labelledby="registros-titulo">
          <div className="section-header">
            <h2 id="registros-titulo">Registros normalizados</h2>
            <p>Descrição normalizada, status e atributos extraídos por linha.</p>
          </div>
          <NormalizationRecordsTable
            items={recordsResult.data.data.items}
            total={recordsResult.data.data.total}
          />
        </section>
      ) : null}

      {issuesResult?.ok ? (
        <section className="section" aria-labelledby="pendencias-titulo">
          <div className="section-header">
            <h2 id="pendencias-titulo">Pendências de informação</h2>
            <p>Atributos obrigatórios ausentes que impedem conclusão automática.</p>
          </div>
          <NormalizationIssuesTable
            items={issuesResult.data.data.items}
            total={issuesResult.data.data.total}
          />
        </section>
      ) : null}
    </>
  );
}
