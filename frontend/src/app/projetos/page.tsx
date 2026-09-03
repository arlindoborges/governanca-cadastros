"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { createProject, deleteProject, listProjects, updateProject } from "@/lib/api";
import { projectStatusLabel } from "@/lib/labels";

type Project = { id: string; name: string; description: string | null; status: string };

export default function ProjetosPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await listProjects();
    setProjects(data.items);
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar"));
  }, []);

  function resetForm() {
    setName("");
    setDescription("");
    setEditingId(null);
  }

  function startEdit(project: Project) {
    setEditingId(project.id);
    setName(project.name);
    setDescription(project.description ?? "");
    setError(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      if (editingId) {
        await updateProject(editingId, name, description || undefined);
      } else {
        await createProject(name, description || undefined);
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : editingId ? "Erro ao salvar projeto" : "Erro ao criar projeto");
    }
  }

  async function onDelete(project: Project) {
    const confirmed = window.confirm(
      `Excluir o projeto "${project.name}"? Importações e análises vinculadas também serão removidas.`,
    );
    if (!confirmed) return;
    setError(null);
    try {
      await deleteProject(project.id);
      if (editingId === project.id) resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir projeto");
    }
  }

  return (
    <section className="stack">
      <div>
        <h1>Projetos de Saneamento</h1>
        <p className="muted">
          Crie, edite e acompanhe projetos. Antes disso, confirme as{" "}
          <Link href="/configuracao-decisoes">decisões de saneamento</Link>.
        </p>
      </div>

      <form className="panel stack" onSubmit={onSubmit}>
        <h2>{editingId ? "Editar projeto" : "Novo projeto"}</h2>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do projeto" required />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrição (opcional)"
          rows={3}
        />
        <div className="row">
          <button type="submit">{editingId ? "Salvar alterações" : "Criar projeto"}</button>
          {editingId ? (
            <button type="button" className="secondary" onClick={resetForm}>
              Cancelar
            </button>
          ) : null}
        </div>
        {error ? <p className="muted">{error}</p> : null}
      </form>

      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Status</th>
              <th>Descrição</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id}>
                <td>{project.name}</td>
                <td>{projectStatusLabel(project.status)}</td>
                <td>{project.description ?? "—"}</td>
                <td>
                  <div className="row">
                    <button type="button" className="secondary" onClick={() => startEdit(project)}>
                      Editar
                    </button>
                    <button type="button" className="danger" onClick={() => onDelete(project)}>
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
