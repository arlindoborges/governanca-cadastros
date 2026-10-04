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

type NodeFormProps = {
  title: string;
  parentId?: string;
  onSaved: () => Promise<void>;
};

function NodeForm({ title, parentId, onSaved }: NodeFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
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
      <h4>{title}</h4>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" required disabled={busy} />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descrição (opcional)"
        rows={2}
        disabled={busy}
      />
      <button type="submit" disabled={busy}>Adicionar</button>
    </form>
  );
}

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

type ClassificationFlowProps = {
  paths: ProductClassificationNode[][];
  depthLevels: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

function ClassificationFlow({ paths, depthLevels, selectedId, onSelect }: ClassificationFlowProps) {
  const levelLabels = useMemo(
    () => Array.from({ length: depthLevels }, (_, i) => `Nível ${i + 1}`),
    [depthLevels],
  );

  if (paths.length === 0) {
    return (
      <div className="classification-flow classification-flow--empty">
        <p className="muted">Nenhuma classificação cadastrada. Use o painel à esquerda para começar no nível 1.</p>
        <div className="classification-flow__legend" aria-hidden>
          {levelLabels.map((label, index) => (
            <span key={label} className="classification-flow__legend-item">
              {index > 0 ? <span className="classification-flow__arrow">→</span> : null}
              <span className="classification-flow__legend-pill">{label}</span>
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="classification-flow">
      <div className="classification-flow__legend" aria-hidden>
        {levelLabels.map((label, index) => (
          <span key={label} className="classification-flow__legend-item">
            {index > 0 ? <span className="classification-flow__arrow">→</span> : null}
            <span className="classification-flow__legend-pill">{label}</span>
          </span>
        ))}
      </div>
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

  const canAddChild = selectedNode !== null && selectedNode.level < depthLevels;
  const addChildLevel = selectedNode ? selectedNode.level + 1 : 1;

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
            <label>
              Quantidade de níveis
              <input
                type="number"
                min={1}
                max={5}
                value={draftDepth}
                onChange={(e) => setDraftDepth(Number(e.target.value))}
                required
              />
            </label>
            <button type="submit">Salvar quantidade de níveis</button>
            <p className="muted">Atual: {depthLevels} nível{depthLevels === 1 ? "" : "is"}.</p>
          </form>

          {selectedNode ? (
            <NodeEditor node={selectedNode} onChanged={onChanged} onDeleted={onDeleted} />
          ) : null}

          <div className="classification-workspace__create stack">
            <h3 className="classification-workspace__subhead">Nova classificação</h3>
            {canAddChild ? (
              <p className="muted">
                Será adicionada como nível {addChildLevel}, abaixo de <strong>{selectedNode.name}</strong>.
              </p>
            ) : (
              <p className="muted">Cadastre uma classificação principal (nível 1).</p>
            )}
            <NodeForm
              title={canAddChild ? `Nível ${addChildLevel} sob “${selectedNode!.name}”` : "Nova classificação de nível 1"}
              parentId={canAddChild ? selectedNode!.id : undefined}
              onSaved={onChanged}
            />
            {canAddChild ? (
              <NodeForm title="Outra classificação de nível 1" onSaved={onChanged} />
            ) : null}
          </div>
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
