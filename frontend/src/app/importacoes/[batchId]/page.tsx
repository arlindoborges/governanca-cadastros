"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { listBatchRecords, type RecordPayload } from "@/lib/api";
import { batchStatusLabel, processingStatusLabel } from "@/lib/labels";

type SortKey =
  | "row_number"
  | "source_code"
  | "original_description"
  | "sanitized_description"
  | "original_unit"
  | "processing_status";

const SORT_COLUMNS: Array<{ key: SortKey; label: string }> = [
  { key: "row_number", label: "Linha" },
  { key: "source_code", label: "Codigo" },
  { key: "original_description", label: "Item" },
  { key: "sanitized_description", label: "Descrição saneada" },
  { key: "original_unit", label: "Und." },
  { key: "processing_status", label: "Status" },
];

const PAGE_SIZE = 50;

export default function ImportacaoDetalhePage() {
  const params = useParams<{ batchId: string }>();
  const batchId = params.batchId;

  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("row_number");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<RecordPayload[]>([]);
  const [total, setTotal] = useState(0);
  const [batchName, setBatchName] = useState("");
  const [batchStatus, setBatchStatus] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listBatchRecords(batchId, { q: query || undefined, sort, order, page, page_size: PAGE_SIZE })
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
        setBatchName(data.batch.file_name);
        setBatchStatus(data.batch.status);
        setMessage(null);
      })
      .catch((err) => setMessage(err instanceof Error ? err.message : "Erro ao carregar registros"))
      .finally(() => setLoading(false));
  }, [batchId, query, sort, order, page]);

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
    setOrder("asc");
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section className="stack">
      <div>
        <Link href="/importacoes" className="back-link">
          ← Voltar para importações
        </Link>
        <h1>{batchName || "Importação"}</h1>
        <p className="muted">
          {batchStatus ? `Status: ${batchStatusLabel(batchStatus)}` : "Carregando..."} · {total.toLocaleString("pt-BR")}{" "}
          registro(s)
        </p>
      </div>

      <form className="panel row batch-toolbar" onSubmit={onSearch}>
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Buscar por código, descrição ou unidade..."
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

      {message ? <div className="panel">{message}</div> : null}

      {!loading && items.length > 0 && items.every((item) => !item.original_description && !item.source_code) ? (
        <div className="panel">
          <strong>Importação sem dados nas colunas mapeadas.</strong>
          <p className="muted">
            O lote foi criado, mas código/descrição/unidade não foram lidos. Exclua esta importação e reimporte
            selecionando as colunas corretas.
          </p>
        </div>
      ) : null}

      <div className="panel table-wrap table-wrap--sticky">
        <table>
          <thead>
            <tr>
              {SORT_COLUMNS.map((column) => (
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
                <td colSpan={SORT_COLUMNS.length}>Carregando...</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={SORT_COLUMNS.length}>Nenhum registro encontrado.</td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td>{item.row_number}</td>
                  <td>{item.source_code ?? "—"}</td>
                  <td>{item.original_description ?? "—"}</td>
                  <td>{item.sanitized_description ?? "—"}</td>
                  <td>{item.original_unit ?? "—"}</td>
                  <td>{processingStatusLabel(item.processing_status ?? "IMPORTED")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="panel row batch-pagination">
        <span className="muted">
          Página {page} de {totalPages}
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
