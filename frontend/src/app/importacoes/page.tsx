"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ProcessingDialog } from "@/components/ProcessingDialog";
import { useProcessing } from "@/hooks/use-processing";
import { deleteImportBatch, getSanitizationConfig, importBatch, listBatches, listProjects, previewImport, sanitizeBatch } from "@/lib/api";
import { batchStatusLabel } from "@/lib/labels";

export default function ImportacoesPage() {
  const { progress, isRunning, run } = useProcessing();
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [projectId, setProjectId] = useState("");
  const [configReady, setConfigReady] = useState(true);
  const [batches, setBatches] = useState<Array<{ id: string; file_name: string; status: string; total_rows: number }>>(
    [],
  );
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState({
    source_code: "",
    original_description: "",
    original_unit: "",
  });
  const [importableRows, setImportableRows] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getSanitizationConfig()
      .then((data) => setConfigReady(data.configured))
      .catch(() => setConfigReady(false));
    listProjects()
      .then((data) => {
        setProjects(data.items);
        if (data.items[0]) setProjectId(data.items[0].id);
      })
      .catch((err) => setMessage(err instanceof Error ? err.message : "Erro"));
  }, []);

  useEffect(() => {
    if (!projectId) return;
    listBatches(projectId)
      .then((data) => setBatches(data.items))
      .catch((err) => setMessage(err instanceof Error ? err.message : "Erro"));
  }, [projectId, message]);

  async function onFileChange(selected: File | null) {
    setFile(selected);
    setHeaders([]);
    setMapping({ source_code: "", original_description: "", original_unit: "" });
    setImportableRows(null);
    if (!selected) return;

    try {
      const preview = await previewImport(selected);
      setHeaders(preview.headers);
      setImportableRows(preview.importable_rows);
      setMapping({
        source_code: preview.suggested_mapping.source_code ?? "",
        original_description: preview.suggested_mapping.original_description ?? "",
        original_unit: preview.suggested_mapping.original_unit ?? "",
      });
      if (!preview.suggested_mapping.original_description) {
        setMessage("Selecione manualmente a coluna de descrição antes de importar.");
      } else {
        setMessage(null);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Não foi possível ler os cabeçalhos da planilha");
    }
  }

  async function onImport(event: FormEvent) {
    event.preventDefault();
    if (!file || !projectId || !mapping.original_description) return;
    setMessage(null);
    try {
      const result = await run(
        {
          title: "Importando planilha",
          message: "Lendo arquivo e gravando registros...",
        },
        async () => importBatch(projectId, file, {
          source_code: mapping.source_code || undefined,
          original_description: mapping.original_description,
          original_unit: mapping.original_unit || undefined,
        }),
      );
      setMessage(`Importado lote ${result.batch_id} com ${result.total_rows} linhas.`);
      setFile(null);
      setHeaders([]);
      setMapping({ source_code: "", original_description: "", original_unit: "" });
      setImportableRows(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Falha na importação");
    }
  }

  async function onDeleteBatch(batch: { id: string; file_name: string }) {
    const confirmed = window.confirm(
      `Excluir a importação "${batch.file_name}"? Registros, análises e decisões vinculadas também serão removidos.`,
    );
    if (!confirmed) return;
    setMessage(null);
    try {
      await run(
        {
          title: "Excluindo importação",
          message: "Removendo lote e dados vinculados...",
        },
        async () => deleteImportBatch(batch.id),
      );
      setMessage(`Importação "${batch.file_name}" excluída.`);
      const data = await listBatches(projectId);
      setBatches(data.items);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Falha ao excluir importação");
    }
  }

  async function runSanitization(batchId: string) {
    const batch = batches.find((item) => item.id === batchId);
    setMessage(null);
    try {
      const result = await run(
        {
          title: "Processando base",
          message: "Saneamento e análise cadastral. Lotes grandes podem levar alguns minutos...",
          total: batch?.total_rows,
        },
        async (report) => {
          report(0, "Aplicando saneamento...");
          const data = await sanitizeBatch(batchId);
          report(data.processed, "Análise cadastral concluída");
          return data;
        },
      );
      const analyzed =
        "records" in result && typeof result.records === "number"
          ? ` ${result.records} registros analisados, ${result.equivalents ?? 0} equivalentes sugeridos.`
          : "";
      setMessage(`Processamento concluído: ${result.processed}/${result.total} saneados.${analyzed}`);
      const data = await listBatches(projectId);
      setBatches(data.items);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Falha no processamento");
    }
  }

  return (
    <section className="stack">
      <ProcessingDialog
        open={isRunning}
        title={progress?.title ?? "Processando"}
        message={progress?.message ?? "Aguarde..."}
        processed={progress?.processed}
        total={progress?.total}
        percent={progress?.percent}
      />

      <div>
        <h1>Importações</h1>
        <p className="muted">Envie a planilha e execute o processamento para saneamento e análise cadastral.</p>
      </div>

      {!configReady ? (
        <div className="panel">
          <p>
            Antes do saneamento, configure as decisões em{" "}
            <Link href="/configuracao-decisoes">Decisões de Saneamento</Link>.
          </p>
        </div>
      ) : null}

      <form className="panel stack" onSubmit={onImport}>
        <label>
          Projeto
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} disabled={isRunning}>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <input
          type="file"
          accept=".xlsx"
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          required
          disabled={isRunning}
        />
        {headers.length > 0 ? (
          <div className="stack mapping-fields">
            <label>
              Coluna de descrição *
              <select
                value={mapping.original_description}
                onChange={(e) => setMapping((current) => ({ ...current, original_description: e.target.value }))}
                required
                disabled={isRunning}
              >
                <option value="">Selecione...</option>
                {headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Coluna de código
              <select
                value={mapping.source_code}
                onChange={(e) => setMapping((current) => ({ ...current, source_code: e.target.value }))}
                disabled={isRunning}
              >
                <option value="">(opcional)</option>
                {headers.map((header) => (
                  <option key={`code-${header}`} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Coluna de unidade
              <select
                value={mapping.original_unit}
                onChange={(e) => setMapping((current) => ({ ...current, original_unit: e.target.value }))}
                disabled={isRunning}
              >
                <option value="">(opcional)</option>
                {headers.map((header) => (
                  <option key={`unit-${header}`} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : (
          <p className="muted">Após selecionar o arquivo, confirme o mapeamento das colunas.</p>
        )}
        {importableRows !== null ? (
          <p className="muted">
            {importableRows.toLocaleString("pt-BR")} linha(s) com descrição serão importadas (linhas vazias do Excel
            são ignoradas).
          </p>
        ) : null}
        <button type="submit" disabled={isRunning || !mapping.original_description}>
          Importar planilha
        </button>
      </form>

      {message ? <div className="panel">{message}</div> : null}

      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Arquivo</th>
              <th>Status</th>
              <th>Linhas</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((batch) => (
              <tr key={batch.id}>
                <td>
                  <Link href={`/importacoes/${batch.id}`}>{batch.file_name}</Link>
                </td>
                <td>{batchStatusLabel(batch.status)}</td>
                <td>{batch.total_rows}</td>
                <td className="row">
                  <Link href={`/importacoes/${batch.id}`} className="button secondary">
                    Abrir
                  </Link>
                  <button type="button" onClick={() => runSanitization(batch.id)} disabled={isRunning}>
                    Processar
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => onDeleteBatch(batch)}
                    disabled={isRunning}
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
