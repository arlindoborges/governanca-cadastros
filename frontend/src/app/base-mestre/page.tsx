"use client";

import { FormEvent, Fragment, useEffect, useState } from "react";
import { listMasterInactiveRecords, listMasters } from "@/lib/api";

type SortKey = "master_code" | "original_description" | "sanitized_description" | "description" | "unit";

const HEAD_COLUMNS: Array<{ key: SortKey; label: string }> = [
  { key: "master_code", label: "Código" },
  { key: "description", label: "Descrição tratada" },
  { key: "unit", label: "Unidade" },
];

const TAIL_COLUMNS: Array<{ key: SortKey; label: string }> = [
  { key: "original_description", label: "Original" },
  { key: "sanitized_description", label: "Saneado" },
];

const PAGE_SIZE = 50;

type LinkedRecord = Awaited<ReturnType<typeof listMasterInactiveRecords>>["items"][number];

function formatFactor(value: number) {
  return Number.isInteger(value) ? String(value) : value.toLocaleString("pt-BR", { maximumFractionDigits: 6 });
}

export default function BaseMestrePage() {
  const [items, setItems] = useState<Awaited<ReturnType<typeof listMasters>>["items"]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("master_code");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [linkedByMaster, setLinkedByMaster] = useState<Record<string, LinkedRecord[]>>({});
  const [loadingLinkedId, setLoadingLinkedId] = useState<string | null>(null);

  async function loadMasters() {
    setLoading(true);
    try {
      const data = await listMasters({
        q: query || undefined,
        status: "ACTIVE",
        sort,
        order,
        page,
        page_size: PAGE_SIZE,
      });
      setItems(data.items);
      setTotal(data.total);
      setMessage(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setExpandedIds(new Set());
    setLinkedByMaster({});
    loadMasters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, sort, order, page]);

  async function toggleExpand(masterId: string) {
    const isExpanded = expandedIds.has(masterId);
    if (isExpanded) {
      setExpandedIds((current) => {
        const next = new Set(current);
        next.delete(masterId);
        return next;
      });
      return;
    }

    if (!linkedByMaster[masterId]) {
      setLoadingLinkedId(masterId);
      try {
        const data = await listMasterInactiveRecords(masterId);
        setLinkedByMaster((current) => ({ ...current, [masterId]: data.items }));
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Não foi possível carregar os vínculos");
        return;
      } finally {
        setLoadingLinkedId(null);
      }
    }

    setExpandedIds((current) => new Set(current).add(masterId));
  }

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
    setOrder(column === "master_code" ? "asc" : "desc");
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const columnCount = HEAD_COLUMNS.length + TAIL_COLUMNS.length + 2;

  return (
    <section className="stack">
      <div>
        <h1>Base Mestre</h1>
        <p className="muted">
          Resultado final após o DE/PARA: produtos ativos (PARA). Expanda para ver os cadastros vinculados com fator de
          conversão.
        </p>
      </div>

      <form className="panel row" onSubmit={onSearch}>
        <label className="grow">
          Buscar
          <input
            type="search"
            value={searchInput}
            placeholder="Código, original, saneado ou unidade"
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </label>
        <button type="submit" disabled={loading}>
          Buscar
        </button>
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

      <div className="panel table-wrap table-wrap--sticky table-wrap--compact">
        <table>
          <thead>
            <tr>
              <th aria-label="Expandir vínculos" />
              {HEAD_COLUMNS.map((column) => (
                <th key={column.key}>
                  <button type="button" className="sortable-header" onClick={() => toggleSort(column.key)}>
                    {column.label}
                    {sort === column.key ? (order === "asc" ? " ↑" : " ↓") : ""}
                  </button>
                </th>
              ))}
              <th>Fator de conversão</th>
              {TAIL_COLUMNS.map((column) => (
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
                <td colSpan={columnCount}>Carregando...</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={columnCount}>
                  {query ? "Nenhum resultado encontrado." : "Nenhum produto ativo na base mestre."}
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const isExpanded = expandedIds.has(item.id);
                const linkedItems = linkedByMaster[item.id] ?? [];
                const canExpand = item.inactive_count > 0;

                return (
                  <Fragment key={item.id}>
                    <tr>
                      <td>
                        <button
                          type="button"
                          className="master-expand-btn"
                          disabled={!canExpand || loadingLinkedId === item.id}
                          aria-expanded={isExpanded}
                          aria-label={
                            canExpand
                              ? `${isExpanded ? "Recolher" : "Expandir"} ${item.inactive_count} vínculo(s) de ${item.master_code}`
                              : "Sem vínculos"
                          }
                          onClick={() => toggleExpand(item.id)}
                        >
                          {loadingLinkedId === item.id ? "…" : isExpanded ? "▾" : canExpand ? "▸" : "·"}
                        </button>
                      </td>
                      <td>
                        {item.master_code}
                        {canExpand ? (
                          <div className="muted master-row__status">{item.inactive_count} vinculado(s)</div>
                        ) : null}
                      </td>
                      <td>{item.description}</td>
                      <td>{item.unit}</td>
                      <td>1</td>
                      <td>{item.original_description ?? "—"}</td>
                      <td>{item.sanitized_description ?? "—"}</td>
                    </tr>
                    {isExpanded
                      ? linkedItems.map((linked) => (
                          <tr key={linked.id} className="master-row--child">
                            <td />
                            <td className="master-row__indent">
                              <span className="badge badge--warn">Vinculado</span>
                              <div className="muted">Linha {linked.row_number}</div>
                            </td>
                            <td>{linked.sanitized_description ?? linked.original_description ?? "—"}</td>
                            <td>{linked.unit ?? "—"}</td>
                            <td>{formatFactor(linked.conversion_factor)}</td>
                            <td>{linked.original_description ?? "—"}</td>
                            <td>{linked.sanitized_description ?? "—"}</td>
                          </tr>
                        ))
                      : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="panel row batch-pagination">
        <span className="muted">
          Página {page} de {totalPages} · {total.toLocaleString("pt-BR")} produto(s) ativo(s)
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
