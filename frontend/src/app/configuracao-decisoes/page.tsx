"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProcessingDialog } from "@/components/ProcessingDialog";
import { useProcessing } from "@/hooks/use-processing";
import {
  getSanitizationConfig,
  saveSanitizationConfig,
  type SanitizationConfigPayload,
  type SanitizationDecision,
} from "@/lib/api";

type DecisionChoice = SanitizationDecision["choice"];

export default function ConfiguracaoDecisoesPage() {
  const { progress, isRunning, run } = useProcessing();
  const [config, setConfig] = useState<SanitizationConfigPayload | null>(null);
  const [configured, setConfigured] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSanitizationConfig()
      .then((data) => {
        setConfig(normalizeConfig(data.config));
        setConfigured(data.configured);
        setUpdatedAt(data.updated_at ?? null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar"));
  }, []);

  function setDecisionChoice(stepCode: string, decisionKey: string, choice: DecisionChoice) {
    if (!config) return;
    setConfig({
      ...config,
      steps: config.steps.map((step) =>
        step.code === stepCode
          ? {
              ...step,
              decisions: step.decisions.map((decision) =>
                decision.key === decisionKey ? { ...decision, choice } : decision,
              ),
            }
          : step,
      ),
    });
  }

  async function onSave() {
    if (!config) return;
    setError(null);
    setMessage(null);
    try {
      const saved = await run(
        {
          title: configured ? "Salvando configuração" : "Confirmando configuração",
          message: "Gravando decisões de saneamento...",
        },
        async () => saveSanitizationConfig(config),
      );
      setConfigured(saved.configured);
      setUpdatedAt(saved.updated_at ?? null);
      setConfig(normalizeConfig(saved.config));
      setMessage("Configuração salva. O saneamento usará estas escolhas.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    }
  }

  if (!config) {
    return (
      <section className="stack">
        <h1>Decisões de Saneamento</h1>
        {error ? <div className="panel">{error}</div> : <p className="muted">Carregando...</p>}
      </section>
    );
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
        <h1>Decisões de Saneamento</h1>
        <p className="muted">
          Para cada regra, escolha a opção adotada ou a alternativa. O saneamento aplicará somente as escolhas
          selecionadas.
        </p>
      </div>

      <div className="panel row">
        <span className={`badge ${configured ? "badge--ok" : "badge--warn"}`}>
          {configured ? "Configurado" : "Pendente de confirmação"}
        </span>
        {updatedAt ? <span className="muted">Última atualização: {new Date(updatedAt).toLocaleString("pt-BR")}</span> : null}
        <button type="button" onClick={onSave} disabled={isRunning}>
          {configured ? "Salvar alterações" : "Confirmar configuração"}
        </button>
      </div>

      {message ? <div className="panel">{message}</div> : null}
      {error ? <div className="panel">{error}</div> : null}

      <div className="panel stack">
        <h2>Princípios gerais</h2>
        <ul className="principles">
          {config.principles.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="panel decision-matrix">
        {config.steps.map((step) => (
          <div key={step.code} className="decision-step-row">
            <div className="decision-matrix__step">
              <span className="decision-matrix__code">Passo {step.code}</span>
              <strong>{step.title}</strong>
              <span className="muted decision-matrix__objective">{step.objective}</span>
            </div>
            <div className="decision-matrix__decisions">
              {step.decisions.map((decision) => (
                <div key={decision.key} className="decision-matrix__cell">
                  <label className="decision-matrix__label" htmlFor={`${step.code}-${decision.key}`}>
                    {decision.label}
                  </label>
                  <select
                    id={`${step.code}-${decision.key}`}
                    className="decision-select"
                    value={decision.choice ?? "adopted"}
                    disabled={isRunning}
                    onChange={(e) =>
                      setDecisionChoice(step.code, decision.key, e.target.value as DecisionChoice)
                    }
                  >
                    <option value="adopted">{decision.adopted}</option>
                    <option value="alternative">{decision.alternative}</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {!configured ? (
        <div className="panel">
          <p>
            Após confirmar, você poderá criar projetos em{" "}
            <Link href="/projetos">Projetos de Saneamento</Link>.
          </p>
        </div>
      ) : null}
    </section>
  );
}

function normalizeConfig(config: SanitizationConfigPayload): SanitizationConfigPayload {
  return {
    ...config,
    steps: config.steps.map((step) => ({
      ...step,
      decisions: step.decisions.map((decision) => ({
        ...decision,
        choice: decision.choice ?? "adopted",
      })),
    })),
  };
}
