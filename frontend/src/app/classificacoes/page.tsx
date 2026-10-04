"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  createProductClassificationNode,
  deleteProductClassificationNode,
  getProductClassifications,
  ProductClassificationNode,
  setProductClassificationDepth,
  updateProductClassificationNode,
} from "@/lib/api";

function findNode(nodes: ProductClassificationNode[], id: string): ProductClassificationNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findNode(node.children, id);
    if (child) return child;
  }
  return null;
}

function collectPaths(nodes: ProductClassificationNode[]): ProductClassificationNode[][] {
  const paths: ProductClassificationNode[][] = [];

  function walk(node: ProductClassificationNode, prefix: ProductClassificationNode[]) {
    const path = [...prefix, node];
    if (node.children.length === 0) {
      paths.push(path);
      return;
    }
    for (const child of node.children) {
      walk(child, path);
    }
  }

  for (const root of nodes) {
    walk(root, []);
  }

  return paths;
}

function pathToNode(tree: ProductClassificationNode[], nodeId: string): ProductClassificationNode[] {
  function walk(nodes: ProductClassificationNode[], trail: ProductClassificationNode[]): ProductClassificationNode[] | null {
    for (const node of nodes) {
      const next = [...trail, node];
      if (node.id === nodeId) return next;
      const found = walk(node.children, next);
      if (found) return found;
    }
    return null;
  }
  return walk(tree, []) ?? [];
}

function nodesAvailableAtLevel(
  tree: ProductClassificationNode[],
  ancestorPath: ProductClassificationNode[],
  level: number,
): ProductClassificationNode[] {
  if (level === 1) return tree;
  const parent = ancestorPath[level - 2];
  if (!parent) return [];
  return parent.children.filter((child) => child.level === level);
}

type LevelFlowIndicatorProps = {
  depthLevels: number;
  variant: "static" | "interactive";
  targetLevel?: number;
  ancestorPath?: ProductClassificationNode[];
  pickLevel?: number | null;
  onSelectTargetLevel?: (level: number) => void;
  onPickAncestorLevel?: (level: number) => void;
};

function LevelFlowIndicator({
  depthLevels,
  variant,
  targetLevel = 1,
  ancestorPath = [],
  pickLevel = null,
  onSelectTargetLevel,
  onPickAncestorLevel,
}: LevelFlowIndicatorProps) {
  return (
    <div
      className={`classification-flow__legend${variant === "interactive" ? " classification-flow__legend--interactive" : ""}`}
      role={variant === "interactive" ? "group" : undefined}
      aria-label={variant === "interactive" ? "Nível para cadastro" : undefined}
    >
      {Array.from({ length: depthLevels }, (_, index) => {
        const level = index + 1;
        const ancestor = ancestorPath[level - 1];
        const isTarget = variant === "interactive" && level === targetLevel;
        const isAncestor = variant === "interactive" && level < targetLevel;
        const isFuture = variant === "interactive" && level > targetLevel;
        const isPicking = variant === "interactive" && pickLevel === level;

        const label = isAncestor && ancestor ? ancestor.name : `Nível ${level}`;

        if (variant === "static") {
          return (
            <span key={level} className="classification-flow__legend-item">
              {index > 0 ? <span className="classification-flow__arrow" aria-hidden>→</span> : null}
              <span className="classification-flow__legend-pill">Nível {level}</span>
            </span>
          );
        }

        return (
          <span key={level} className="classification-flow__legend-item">
            {index > 0 ? <span className="classification-flow__arrow" aria-hidden>→</span> : null}
            <button
              type="button"
              className={[
                "classification-flow__legend-btn",
                isTarget ? "is-target" : "",
                isAncestor ? "is-ancestor" : "",
                isFuture ? "is-future" : "",
                isPicking ? "is-picking" : "",
                isAncestor && !ancestor ? "is-missing" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => {
                if (level === targetLevel) return;
                if (level < targetLevel) {
                  onPickAncestorLevel?.(level);
                } else {
                  onSelectTargetLevel?.(level);
                }
              }}
              aria-pressed={isTarget || isPicking}
            >
              <span className="classification-flow__legend-btn-level">Nível {level}</span>
              <span className="classification-flow__legend-btn-label">{label}</span>
            </button>
          </span>
        );
      })}
    </div>
  );
}

type CreateNodeFormProps = {
  targetLevel: number;
  ancestorPath: ProductClassificationNode[];
  parentId?: string;
  canSubmit: boolean;
  onSaved: () => Promise<void>;
};

function CreateNodeForm({ targetLevel, ancestorPath, parentId, canSubmit, onSaved }: CreateNodeFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    try {
      await createProductClassificationNode(name, description || undefined, parentId);
      setName("");
      setDescription("");
      await onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="classification-form stack" onSubmit={onSubmit}>
      {targetLevel > 1 && ancestorPath.length > 0 ? (
        <div className="classification-create__breadcrumb" aria-label="Caminho dos níveis superiores">
          {ancestorPath.map((node, index) => (
            <span key={node.id} className="classification-create__breadcrumb-segment">
              {index > 0 ? <span className="classification-flow__arrow" aria-hidden>→</span> : null}
              <span className="classification-create__breadcrumb-step">
                <span className="classification-flow__step-level">Nível {node.level}</span>
                <span className="classification-flow__step-name">{node.name}</span>
              </span>
            </span>
          ))}
        </div>
      ) : null}

      <h4>Nova classificação de nível {targetLevel}</h4>

      {!canSubmit && targetLevel > 1 ? (
        <p className="muted classification-create__hint">
          Selecione os níveis acima no indicador para definir onde este cadastro será inserido.
        </p>
      ) : null}

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome"
        required
        disabled={busy || !canSubmit}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descrição (opcional)"
        rows={2}
        disabled={busy || !canSubmit}
      />
      <button type="submit" disabled={busy || !canSubmit}>Adicionar</button>
    </form>
  );
}

type CreateClassificationPanelProps = {
  tree: ProductClassificationNode[];
  depthLevels: number;
  onSaved: () => Promise<void>;
  syncFromNodeId: string | null;
};

function CreateClassificationPanel({ tree, depthLevels, onSaved, syncFromNodeId }: CreateClassificationPanelProps) {
  const [targetLevel, setTargetLevel] = useState(1);
  const [ancestorPath, setAncestorPath] = useState<ProductClassificationNode[]>([]);
  const [pickLevel, setPickLevel] = useState<number | null>(null);

  useEffect(() => {
    if (targetLevel > depthLevels) {
      setTargetLevel(depthLevels);
      setAncestorPath((path) => path.slice(0, depthLevels - 1));
    }
  }, [depthLevels, targetLevel]);

  useEffect(() => {
    setAncestorPath((path) => path.slice(0, targetLevel - 1));
    setPickLevel(targetLevel > 1 ? 1 : null);
  }, [targetLevel]);

  useEffect(() => {
    if (!syncFromNodeId) return;
    const path = pathToNode(tree, syncFromNodeId);
    const node = path[path.length - 1];
    if (!node || node.level >= depthLevels) return;
    setTargetLevel(node.level + 1);
    setAncestorPath(path);
    setPickLevel(null);
  }, [syncFromNodeId, tree, depthLevels]);

  const requiredAncestors = targetLevel - 1;
  const ancestorsComplete = ancestorPath.length >= requiredAncestors && ancestorPath.every((n, i) => n.level === i + 1);
  const parentId = ancestorsComplete && targetLevel > 1 ? ancestorPath[targetLevel - 2]?.id : undefined;
  const canSubmit = targetLevel === 1 || ancestorsComplete;

  const firstMissingLevel = useMemo(() => {
    for (let level = 1; level < targetLevel; level += 1) {
      const node = ancestorPath[level - 1];
      if (!node || node.level !== level) return level;
    }
    return null;
  }, [ancestorPath, targetLevel]);

  const activePickLevel = pickLevel ?? firstMissingLevel;

  const pickOptions = useMemo(() => {
    if (!activePickLevel || activePickLevel >= targetLevel) return [];
    const prefix = ancestorPath.slice(0, activePickLevel - 1);
    return nodesAvailableAtLevel(tree, prefix, activePickLevel);
  }, [activePickLevel, ancestorPath, targetLevel, tree]);

  function selectTargetLevel(level: number) {
    setTargetLevel(level);
  }

  function startPickAncestor(level: number) {
    setPickLevel(level);
    setAncestorPath((path) => path.slice(0, level - 1));
  }

  function chooseAncestor(node: ProductClassificationNode) {
    setAncestorPath((path) => {
      const next = path.slice(0, node.level - 1);
      next[node.level - 1] = node;
      return next;
    });
    if (node.level < targetLevel - 1) {
      setPickLevel(node.level + 1);
    } else {
      setPickLevel(null);
    }
  }

  return (
    <div className="classification-workspace__create stack">
      <h3 className="classification-workspace__subhead">Nova classificação</h3>
      <p className="muted">Escolha em qual nível deseja cadastrar. Nos níveis 2 em diante, defina os pais no fluxo abaixo.</p>

      <LevelFlowIndicator
        depthLevels={depthLevels}
        variant="interactive"
        targetLevel={targetLevel}
        ancestorPath={ancestorPath}
        pickLevel={activePickLevel}
        onSelectTargetLevel={selectTargetLevel}
        onPickAncestorLevel={startPickAncestor}
      />

      {targetLevel > 1 && activePickLevel !== null && activePickLevel < targetLevel ? (
        <div className="classification-create__picker stack">
          <p className="classification-create__picker-label">
            Escolha o item do <strong>nível {activePickLevel}</strong>
            {activePickLevel > 1 && ancestorPath[activePickLevel - 2]
              ? ` (abaixo de “${ancestorPath[activePickLevel - 2].name}”)`
              : ""}
            :
          </p>
          {pickOptions.length > 0 ? (
            <div className="classification-create__picker-options">
              {pickOptions.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  className={`classification-create__picker-option${
                    ancestorPath[activePickLevel - 1]?.id === node.id ? " is-selected" : ""
                  }`}
                  onClick={() => chooseAncestor(node)}
                >
                  {node.name}
                </button>
              ))}
            </div>
          ) : (
            <p className="muted">Nenhum cadastro neste nível ainda. Cadastre o nível anterior primeiro.</p>
          )}
        </div>
      ) : null}

      <CreateNodeForm
        targetLevel={targetLevel}
        ancestorPath={ancestorPath.slice(0, targetLevel - 1)}
        parentId={parentId}
        canSubmit={canSubmit}
        onSaved={onSaved}
      />
    </div>
  );
}

type ClassificationFlowProps = {
  paths: ProductClassificationNode[][];
  depthLevels: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

function ClassificationFlow({ paths, depthLevels, selectedId, onSelect }: ClassificationFlowProps) {
  if (paths.length === 0) {
    return (
      <div className="classification-flow classification-flow--empty">
        <p className="muted">Nenhuma classificação cadastrada. Use o painel à esquerda para começar no nível 1.</p>
        <LevelFlowIndicator depthLevels={depthLevels} variant="static" />
      </div>
    );
  }

  return (
    <div className="classification-flow">
      <LevelFlowIndicator depthLevels={depthLevels} variant="static" />
      <ul className="classification-flow__paths">
        {paths.map((path, pathIndex) => (
          <li key={path.map((n) => n.id).join("-") || pathIndex} className="classification-flow__path">
            {path.map((node, index) => (
              <span key={node.id} className="classification-flow__segment">
                {index > 0 ? <span className="classification-flow__arrow" aria-hidden>→</span> : null}
                <button
                  type="button"
                  className={`classification-flow__step${selectedId === node.id ? " is-selected" : ""}`}
                  onClick={() => onSelect(node.id)}
                  aria-pressed={selectedId === node.id}
                >
                  <span className="classification-flow__step-level">Nível {node.level}</span>
                  <span className="classification-flow__step-name">{node.name}</span>
                </button>
              </span>
            ))}
          </li>
        ))}
      </ul>
      {selectedId ? (
        <button type="button" className="classification-flow__clear secondary" onClick={() => onSelect(null)}>
          Limpar seleção
        </button>
      ) : null}
    </div>
  );
}

type NodeEditorProps = {
  node: ProductClassificationNode;
  onChanged: () => Promise<void>;
  onDeleted: () => Promise<void>;
};

function NodeEditor({ node, onChanged, onDeleted }: NodeEditorProps) {
  const [name, setName] = useState(node.name);
  const [description, setDescription] = useState(node.description ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(node.name);
    setDescription(node.description ?? "");
  }, [node.id, node.name, node.description]);

  async function saveNode() {
    setBusy(true);
    try {
      await updateProductClassificationNode(node.id, name, description || undefined);
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function removeNode() {
    const confirmed = window.confirm(`Excluir "${node.name}" e todos os níveis abaixo?`);
    if (!confirmed) return;
    setBusy(true);
    try {
      await deleteProductClassificationNode(node.id);
      await onDeleted();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="classification-editor stack">
      <h3>Editar — nível {node.level}</h3>
      <label>
        Nome
        <input value={name} onChange={(e) => setName(e.target.value)} disabled={busy} />
      </label>
      <label>
        Descrição
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} disabled={busy} />
      </label>
      <div className="row">
        <button type="button" onClick={saveNode} disabled={busy}>Salvar alterações</button>
        <button type="button" className="secondary" onClick={removeNode} disabled={busy}>Excluir</button>
      </div>
    </div>
  );
}

export default function ClassificacoesPage() {
  const [depthLevels, setDepthLevels] = useState(3);
  const [draftDepth, setDraftDepth] = useState(3);
  const [tree, setTree] = useState<ProductClassificationNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const data = await getProductClassifications();
    setDepthLevels(data.depth_levels);
    setDraftDepth(data.depth_levels);
    setTree(data.tree);
    setSelectedNodeId((id) => (id && !findNode(data.tree, id) ? null : id));
  }, []);

  useEffect(() => {
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar classificações"))
      .finally(() => setLoading(false));
  }, [reload]);

  const paths = useMemo(() => collectPaths(tree), [tree]);
  const selectedNode = useMemo(
    () => (selectedNodeId ? findNode(tree, selectedNodeId) : null),
    [tree, selectedNodeId],
  );

  async function saveDepth(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await setProductClassificationDepth(draftDepth);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar a configuração de níveis");
    }
  }

  const onChanged = useCallback(async () => {
    setError(null);
    try {
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar");
    }
  }, [reload]);

  async function onDeleted() {
    setSelectedNodeId(null);
    await onChanged();
  }

  if (loading) {
    return (
      <section className="stack">
        <h1>Classificações de Produtos</h1>
        <p className="muted">Carregando...</p>
      </section>
    );
  }

  return (
    <section className="stack">
      <div>
        <h1>Classificações de Produtos</h1>
        <p className="muted">
          À esquerda configure a hierarquia e cadastre novos itens. À direita, acompanhe o fluxo partindo do nível 1
          até os demais níveis.
        </p>
      </div>

      <div className="classification-workspace">
        <div className="panel stack classification-workspace__form">
          <h2>Cadastro</h2>

          <form className="stack" onSubmit={saveDepth}>
            <h3 className="classification-workspace__subhead">Configuração de níveis</h3>
            <label className="classification-depth-row">
              <span className="classification-depth-row__label">Quantidade de níveis</span>
              <div className="classification-depth-row__controls">
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={draftDepth}
                  onChange={(e) => setDraftDepth(Number(e.target.value))}
                  required
                  inputMode="numeric"
                  className="classification-depth-row__input"
                />
                <button type="submit" className="classification-depth-row__submit">
                  Salvar quantidade de níveis
                </button>
              </div>
            </label>
            <p className="muted">Atual: {depthLevels} nível{depthLevels === 1 ? "" : "is"}.</p>
          </form>

          {selectedNode ? (
            <NodeEditor node={selectedNode} onChanged={onChanged} onDeleted={onDeleted} />
          ) : null}

          <CreateClassificationPanel
            tree={tree}
            depthLevels={depthLevels}
            onSaved={onChanged}
            syncFromNodeId={selectedNodeId}
          />
        </div>

        <div className="panel stack classification-workspace__flow-panel">
          <h2>Fluxo da hierarquia</h2>
          <p className="muted">Cada linha mostra um caminho do nível 1 em diante. Clique em um nome para editar.</p>
          <ClassificationFlow
            paths={paths}
            depthLevels={depthLevels}
            selectedId={selectedNodeId}
            onSelect={setSelectedNodeId}
          />
        </div>
      </div>

      {error ? <p className="auth-error">{error}</p> : null}
    </section>
  );
}
