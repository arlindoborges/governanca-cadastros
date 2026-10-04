"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
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

type NodeBlockProps = {
  node: ProductClassificationNode;
  depthLevels: number;
  onChanged: () => Promise<void>;
};

function NodeBlock({ node, depthLevels, onChanged }: NodeBlockProps) {
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
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  const childLevel = node.level + 1;
  const canHaveChildren = childLevel <= depthLevels;

  return (
    <article className={`classification-node classification-node--l${node.level}`}>
      <div className="classification-node__head">
        <span className="classification-node__badge">Nível {node.level}</span>
        <h3>{node.name}</h3>
      </div>
      <div className="stack">
        <label>
          Nome
          <input value={name} onChange={(e) => setName(e.target.value)} disabled={busy} />
        </label>
        <label>
          Descrição
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} disabled={busy} />
        </label>
        <div className="row">
          <button type="button" onClick={saveNode} disabled={busy}>Salvar</button>
          <button type="button" className="secondary" onClick={removeNode} disabled={busy}>Excluir</button>
        </div>
      </div>

      {canHaveChildren ? (
        <div className="classification-node__children stack">
          {node.children.map((child) => (
            <NodeBlock key={child.id} node={child} depthLevels={depthLevels} onChanged={onChanged} />
          ))}
          <NodeForm
            title={`Novo nível ${childLevel}`}
            parentId={node.id}
            onSaved={onChanged}
          />
        </div>
      ) : null}
    </article>
  );
}

export default function ClassificacoesPage() {
  const [depthLevels, setDepthLevels] = useState(3);
  const [draftDepth, setDraftDepth] = useState(3);
  const [tree, setTree] = useState<ProductClassificationNode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const data = await getProductClassifications();
    setDepthLevels(data.depth_levels);
    setDraftDepth(data.depth_levels);
    setTree(data.tree);
  }, []);

  useEffect(() => {
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar classificações"))
      .finally(() => setLoading(false));
  }, [reload]);

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
          Defina quantos níveis a hierarquia terá. No nível 1 cadastre as classificações principais (ex.: Frios,
          Secos). Nos níveis abaixo, adicione quantos itens precisar para cada pai.
        </p>
      </div>

      <form className="panel stack" onSubmit={saveDepth}>
        <h2>Configuração de níveis</h2>
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

      <div className="panel stack">
        <h2>Classificações (nível 1)</h2>
        <p className="muted">
          Exemplo: Frios → Congelado → Bovino. Cada nível 2 e 3 pode ter vários cadastros sob o mesmo pai.
        </p>
        <NodeForm title="Nova classificação de nível 1" onSaved={onChanged} />
      </div>

      <div className="classification-tree stack">
        {tree.map((root) => (
          <div key={root.id} className="panel">
            <NodeBlock node={root} depthLevels={depthLevels} onChanged={onChanged} />
          </div>
        ))}
        {tree.length === 0 ? <p className="muted">Nenhuma classificação cadastrada ainda.</p> : null}
      </div>

      {error ? <p className="auth-error">{error}</p> : null}
    </section>
  );
}
