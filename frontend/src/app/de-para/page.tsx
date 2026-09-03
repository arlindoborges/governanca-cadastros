"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { listMasters, unifyMasters } from "@/lib/api";

type SortKey = "master_code" | "original_description" | "sanitized_description" | "description" | "unit";

type SelectedMaster = {
  id: string;
  master_code: string;
  description: string;
};

const COLUMNS: Array<{ key: SortKey; label: string }> = [
  { key: "master_code", label: "Código" },
  { key: "description", label: "Descrição tratada" },
  { key: "unit", label: "Unidade" },
];

const TAIL_COLUMNS: Array<{ key: SortKey; label: string }> = [
  { key: "original_description", label: "Original" },
  { key: "sanitized_description", label: "Saneado" },
];

const PAGE_SIZE = 50;

function parseFactor(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export default function DeParaPage() {
  const [items, setItems] = useState<Awaited<ReturnType<typeof listMasters>>["items"]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("master_code");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, SelectedMaster>>({});
  const [paraId, setParaId] = useState<string | null>(null);
  const [conversionFactors, setConversionFactors] = useState<Record<string, string>>({});

  const selectedList = useMemo(() => Object.values(selected), [selected]);
  const paraMaster = paraId ? selected[paraId] : null;
  const deIds = useMemo(
    () => selectedList.map((item) => item.id).filter((id) => id !== paraId),
    [selectedList, paraId],
  );
  const canUnify = selectedList.length >= 2 && paraId !== null;

  async function loadData() {
    setLoading(true);
    try {
      const mastersData = await listMasters({
        q: query || undefined,
        status: "ACTIVE",
        sort,
        order,
        page,
        page_size: PAGE_SIZE,
      });
      setItems(mastersData.items);
      setTotal(mastersData.total);
      setMessage(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, sort, order, page]);

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

  function clearSelection() {
    setSelected({});
    setParaId(null);
    setConversionFactors({});
  }

  function toggleSelected(item: (typeof items)[number], checked: boolean) {
    if (!checked && paraId === item.id) {
      setParaId(null);
    }
    setSelected((current) => {
      const next = { ...current };
      if (checked) {
        next[item.id] = {
          id: item.id,
          master_code: item.master_code,
          description: item.description,
        };
      } else {
        delete next[item.id];
      }
      return next;
    });
    setConversionFactors((current) => {
      const next = { ...current };
      if (checked) {
        if (!next[item.id]) next[item.id] = "1";
      } else {
        delete next[item.id];
      }
      return next;
    });
  }

  async function onUnify() {
    if (!canUnify || !paraId) return;

    const factors = deIds.map((id) => ({
      master_id: id,
      factor: parseFactor(conversionFactors[id] ?? "1"),
    }));
    if (factors.some((item) => item.factor === null)) {
      setMessage("Informe um fator de conversão maior que zero para cada produto DE.");
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const result = await unifyMasters({
        selected_master_ids: selectedList.map((item) => item.id),
        target_master_id: paraId,
        conversion_factors: factors as Array<{ master_id: string; factor: number }>,
      });
      setMessage(
        `Unificação concluída: ${result.unified_masters} produto(s) redirecionado(s) para ${result.target_master_code}.`,
      );
      clearSelection();
      await loadData();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Não foi possível unificar os produtos");
    } finally {
      setSaving(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const columnCount = COLUMNS.length + TAIL_COLUMNS.length + 3;

  function renderConversionFactor(item: (typeof items)[number], isSelected: boolean) {
    const isDe = isSelected && paraId !== item.id;
    if (!isDe) return "—";
    return (
      <input
        type="text"
        inputMode="decimal"
        className="depara-factor-input"
        value={conversionFactors[item.id] ?? "1"}
        aria-label={`Fator de conversão para ${item.master_code}`}
        onChange={(e) =>
          setConversionFactors((current) => ({
            ...current,
            [item.id]: e.target.value,
          }))
        }
      />
    );
  }

  return (
    <section className="stack">
      <div>
        <h1>DE/PARA</h1>
        <p className="muted">
          Selecione produtos semelhantes, defina o fator de conversão dos DE, marque o PARA e unifique.
        </p>
      </div>

      {selectedList.length > 0 ? (
        <div className="panel depara-action-bar row">
          <div className="stack" style={{ gap: "0.35rem" }}>
            <strong>{selectedList.length} produto(s) selecionado(s)</strong>
            <span className="muted">
              {paraMaster
                ? `PARA: ${paraMaster.master_code} — ${paraMaster.description}`
                : "Marque um selecionado como PARA para continuar."}
            </span>
          </div>
          <div className="row">
            <button type="button" className="secondary" disabled={saving} onClick={clearSelection}>
              Limpar seleção
            </button>
            <button type="button" disabled={!canUnify || saving} onClick={onUnify}>
              {saving ? "Unificando..." : "Unificar selecionados"}
            </button>
          </div>
        </div>
      ) : null}

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
              <th aria-label="Selecionar" />
              <th aria-label="Destino PARA" />
              {COLUMNS.map((column) => (
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
                const isSelected = Boolean(selected[item.id]);
                return (
                  <tr key={item.id} className={isSelected ? "depara-row--selected" : undefined}>
                    <td>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        aria-label={`Selecionar ${item.master_code}`}
                        onChange={(e) => toggleSelected(item, e.target.checked)}
                      />
                    </td>
                    <td>
                      <input
                        type="radio"
                        name="para-master"
                        checked={paraId === item.id}
                        disabled={!isSelected}
                        aria-label={`Definir ${item.master_code} como PARA`}
                        onChange={() => setParaId(item.id)}
                      />
                    </td>
                    <td>{item.master_code}</td>
                    <td>{item.description}</td>
                    <td>{item.unit}</td>
                    <td>{renderConversionFactor(item, isSelected)}</td>
                    <td>{item.original_description ?? "—"}</td>
                    <td>{item.sanitized_description ?? "—"}</td>
                  </tr>
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
