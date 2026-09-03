"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ProcessingDialog } from "@/components/ProcessingDialog";
import { useProcessing } from "@/hooks/use-processing";
import {
  applyDiagnosticTreatment,
  listBatches,
  listDiagnostics,
  listProjects,
  saveDiagnosticDisposition,
} from "@/lib/api";

type SortKey =
  | "row_number"
  | "original_description"
  | "sanitized_description"
  | "identification"
  | "duplicate_reference"
  | "disposition"
  | "treated_code"
  | "treated_description"
  | "record_status";

const BASE_COLUMNS: Array<{ key: SortKey; label: string }> = [
  { key: "row_number", label: "Linha" },
  { key: "original_description", label: "Original" },
  { key: "sanitized_description", label: "Saneado" },
  { key: "identification", label: "Identificação" },
  { key: "duplicate_reference", label: "Referência da duplicidade" },
  { key: "disposition", label: "Decisão" },
];

const TREATED_COLUMNS: Array<{ key: SortKey; label: string }> = [
  { key: "treated_code", label: "Código tratado" },
  { key: "treated_description", label: "Descrição tratada" },
  { key: "record_status", label: "Status" },
];

const PAGE_SIZE = 50;

export default function AnalisesPage() {
  const { progress, isRunning, run } = useProcessing();
  const [projectId, setProjectId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [batches, setBatches] = useState<Array<{ id: string; file_name: string; status: string }>>([]);
  const [identification, setIdentification] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("row_number");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Awaited<ReturnType<typeof listDiagnostics>>["items"]>([]);
  const [total, setTotal] = useState(0);
  const [treatedCount, setTreatedCount] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const selectedBatch = batches.find((batch) => batch.id === batchId);
  const needsProcessing = selectedBatch && !["SANITIZED", "MATCHED", "COMPLETED"].includes(selectedBatch.status);
  const isTreated = (selectedBatch?.status === "COMPLETED" || treatedCount > 0) && !needsProcessing;

  const columns = useMemo(
    () => (isTreated ? [...BASE_COLUMNS, ...TREATED_COLUMNS] : BASE_COLUMNS),
    [isTreated],
  );

  useEffect(() => {
    listProjects()
      .then((data) => {
        if (data.items[0]) setProjectId(data.items[0].id);
      })
      .catch((err) => setMessage(err instanceof Error ? err.message : "Erro"));
  }, []);

  useEffect(() => {
    if (!projectId) return;
    listBatches(projectId)
      .then((data) => {
        setBatches(data.items);
        const processed =
          data.items.find((batch) => batch.status === "COMPLETED") ??
          data.items.find((batch) => batch.status === "MATCHED" || batch.status === "SANITIZED") ??
          data.items[0];
        if (processed) setBatchId(processed.id);
      })
      .catch((err) => setMessage(err instanceof Error ? err.message : "Erro"));
  }, [projectId]);

  async function loadDiagnostics() {
    if (!batchId) return;
    setLoading(true);
    try {
      const data = await listDiagnostics(batchId, {
        identification: identification || undefined,
        q: query || undefined,
        sort,
        order,
        page,
        page_size: PAGE_SIZE,
      });
      setItems(data.items);
      setTotal(data.total);
      setTreatedCount(data.summary.tratados);
      setMessage(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDiagnostics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId, identification, query, sort, order, page]);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setQuery(searchInput.trim());
  }

  function toggleSort(column: SortKey) {
    setPage(1);
    if (sort === column) {
      setOrder((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSort(column);
    setOrder(column === "row_number" ? "asc" : "desc");
  }

  async function onDispositionChange(recordId: string, disposition: "MANTER" | "INATIVAR") {
    if (!batchId || isTreated) return;
    setSavingId(recordId);
    setMessage(null);
    try {
      const result = await saveDiagnosticDisposition(batchId, {
        source_record_id: recordId,
        disposition,
      });
      const updates = new Map(result.updated.map((item) => [item.id, item.disposition]));
      setItems((current) =>
        current.map((item) =>
          updates.has(item.id) ? { ...item, disposition: updates.get(item.id)! } : item,
        ),
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Não foi possível salvar a decisão");
    } finally {
      setSavingId(null);
    }
  }

  async function onApplyTreatment() {
    if (!batchId || !projectId) return;
    setMessage(null);
    try {
      const result = await run(
        {
          title: "Gerando base tratada",
          message: "Aplicando inativações e criando códigos tratados...",
        },
        async () => applyDiagnosticTreatment(batchId),
      );
      setMessage(
        `Base tratada gerada: ${result.mantidos} mantidos, ${result.inativados} inativados, ${result.masters_created} códigos criados.`,
      );
      const batchData = await listBatches(projectId);
      setBatches(batchData.items);
      await loadDiagnostics();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Falha ao gerar base tratada");
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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
        <h1>Diagnóstico / Análises</h1>
        <p className="muted">
          Defina Manter/Inativar nas duplicidades e gere a base tratada com códigos e DE/PARA.
        </p>
      </div>

      <div className="panel row">
        <label>
          Lote
          <select
            value={batchId}
            onChange={(e) => {
              setBatchId(e.target.value);
              setPage(1);
            }}
          >
            {batches.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.file_name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Identificação
          <select
            value={identification}
            onChange={(e) => {
              setIdentification(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todas</option>
            <option value="UNICO">Único</option>
            <option value="DUPLICADO">Duplicado</option>
          </select>
        </label>
        {!needsProcessing ? (
          <button type="button" onClick={onApplyTreatment} disabled={isRunning || isTreated}>
            {isTreated ? "Base tratada gerada" : "Gerar base tratada"}
          </button>
        ) : null}
      </div>

      <form className="panel row batch-toolbar" onSubmit={onSearch}>
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Buscar por original, saneado ou referência..."
          className="batch-search"
        />
        <button type="submit">Buscar</button>
        {query ? (
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setSearchInput("");
              setQuery("");
              setPage(1);
            }}
          >
            Limpar
          </button>
        ) : null}
      </form>

      {needsProcessing ? (
        <div className="panel">
          <p>Este lote ainda não foi processado. Execute o processamento em Importações para gerar o diagnóstico.</p>
        </div>
      ) : null}

      {message ? <div className="panel">{message}</div> : null}

      <div className="panel table-wrap table-wrap--sticky table-wrap--compact">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>
                  <button type="button" className="sortable-header" onClick={() => toggleSort(column.key)}>
                    {column.label}
                    {sort === column.key ? (order === "asc" ? " ↑" : " ↓") : ""}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length}>Carregando...</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  {needsProcessing ? "Nenhum registro saneado disponível." : "Nenhum resultado encontrado."}
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td>{item.row_number}</td>
                  <td>{item.original_description ?? "—"}</td>
                  <td>{item.sanitized_description ?? "—"}</td>
                  <td>
                    <span
                      className={`badge ${item.identification === "DUPLICADO" ? "badge--warn" : "badge--ok"}`}
                    >
                      {item.identification === "DUPLICADO" ? "Duplicado" : "Único"}
                    </span>
                  </td>
                  <td>{item.duplicate_reference ?? "—"}</td>
                  <td>
                    {item.disposition_editable ? (
                      <select
                        value={item.disposition}
                        disabled={savingId === item.id || isRunning}
                        onChange={(e) =>
                          onDispositionChange(item.id, e.target.value as "MANTER" | "INATIVAR")
                        }
                        aria-label={`Decisão para linha ${item.row_number}`}
                      >
                        <option value="MANTER">Manter</option>
                        <option value="INATIVAR">Inativar</option>
                      </select>
                    ) : (
                      <span className="badge badge--ok">
                        {item.disposition === "INATIVAR" ? "Inativar" : "Manter"}
                      </span>
                    )}
                  </td>
                  {isTreated ? (
                    <>
                      <td>{item.treated_code ?? "—"}</td>
                      <td>{item.treated_description ?? "—"}</td>
                      <td>
                        {item.record_status ? (
                          <span
                            className={`badge ${item.record_status === "INATIVADO" ? "badge--warn" : "badge--ok"}`}
                          >
                            {item.record_status === "INATIVADO" ? "Inativado" : "Ativo"}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="panel row batch-pagination">
        <span className="muted">
          Página {page} de {totalPages} · {total.toLocaleString("pt-BR")} resultado(s)
        </span>
        <div className="row">
          <button type="button" className="secondary" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>
            Anterior
          </button>
          <button
            type="button"
            className="secondary"
            disabled={page >= totalPages || loading}
            onClick={() => setPage(page + 1)}
          >
            Próxima
          </button>
        </div>
      </div>
    </section>
  );
}
