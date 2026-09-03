import Link from "next/link";
import { getDashboard } from "@/lib/api";

export default async function DashboardPage() {
  let summary = {
    projects: 0,
    batches: 0,
    master_products: 0,
    mappings: 0,
    pending_review: 0,
    sanitization_configured: false,
  };
  let error: string | null = null;

  try {
    summary = await getDashboard();
  } catch (err) {
    error = err instanceof Error ? err.message : "Falha ao carregar dashboard";
  }

  return (
    <section className="stack">
      <div>
        <h1>Dashboard</h1>
        <p className="muted">Visão resumida do saneamento e da base mestre.</p>
      </div>

      {error ? <div className="panel">{error}</div> : null}

      {!summary.sanitization_configured ? (
        <div className="panel">
          <p>
            Configure as decisões de saneamento em{" "}
            <Link href="/configuracao-decisoes">Decisões de Saneamento</Link> antes de importar e processar bases.
          </p>
        </div>
      ) : null}

      <div className="grid">
        <div className="metric">
          <span className="muted">Projetos</span>
          <strong>{summary.projects}</strong>
        </div>
        <div className="metric">
          <span className="muted">Importações</span>
          <strong>{summary.batches}</strong>
        </div>
        <div className="metric">
          <span className="muted">Base Mestre</span>
          <strong>{summary.master_products}</strong>
        </div>
        <div className="metric">
          <span className="muted">DE/PARA</span>
          <strong>{summary.mappings}</strong>
        </div>
        <div className="metric">
          <span className="muted">Pendências de revisão</span>
          <strong>{summary.pending_review}</strong>
        </div>
      </div>
    </section>
  );
}
