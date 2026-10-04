"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { JarvisRingGraphic } from "@/components/login/JarvisRingGraphic";

type Props = {
  email: string;
  password: string;
  error: string | null;
  submitting: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
};

type HudPhase =
  | "idle"
  | "ring"
  | "line"
  | "square"
  | "ready"
  | "square-out"
  | "line-out"
  | "ring-out";

const RING_MS = 550;
const LINE_MS = 550;
const SQUARE_MS = 950;

function motionMs(base: number) {
  if (typeof window === "undefined") return base;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : base;
}

export function LoginJarvisScreen({
  email,
  password,
  error,
  submitting,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: Props) {
  const [phase, setPhase] = useState<HudPhase>("idle");
  const emailRef = useRef<HTMLInputElement>(null);

  const sessionActive = phase !== "idle";

  useEffect(() => {
    if (phase === "ring") {
      const t = window.setTimeout(() => setPhase("line"), motionMs(RING_MS));
      return () => window.clearTimeout(t);
    }
    if (phase === "line") {
      const t = window.setTimeout(() => setPhase("square"), motionMs(LINE_MS));
      return () => window.clearTimeout(t);
    }
    if (phase === "square") {
      const t = window.setTimeout(() => setPhase("ready"), motionMs(SQUARE_MS));
      return () => window.clearTimeout(t);
    }
    if (phase === "square-out") {
      const t = window.setTimeout(() => setPhase("line-out"), motionMs(SQUARE_MS));
      return () => window.clearTimeout(t);
    }
    if (phase === "line-out") {
      const t = window.setTimeout(() => setPhase("ring-out"), motionMs(LINE_MS));
      return () => window.clearTimeout(t);
    }
    if (phase === "ring-out") {
      const t = window.setTimeout(() => setPhase("idle"), motionMs(RING_MS));
      return () => window.clearTimeout(t);
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== "ready") return;
    const t = window.setTimeout(() => emailRef.current?.focus(), 80);
    return () => window.clearTimeout(t);
  }, [phase]);

  function handleRingKeyDown(event: React.KeyboardEvent) {
    if (sessionActive || submitting) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setPhase("ring");
    }
  }

  function closeHud() {
    if (submitting || phase !== "ready") return;
    setPhase("square-out");
  }

  function startSession() {
    if (submitting || phase !== "idle") return;
    setPhase("ring");
  }

  const closing = phase === "square-out" || phase === "line-out" || phase === "ring-out";

  return (
    <div className="jarvis-login">
      <div className="jarvis-login__backdrop" aria-hidden="true">
        <div className="jarvis-login__grid" />
        <div className="jarvis-login__vignette" />
      </div>

      <header className="jarvis-login__top">
        <span className="jarvis-login__logo">GC</span>
        <div>
          <p className="jarvis-login__system">Governança de Cadastros</p>
          <p className="jarvis-login__status">
            {sessionActive ? "Autenticação · canal seguro" : "Sistema pronto · aguardando início"}
          </p>
        </div>
      </header>

      <div className="jarvis-login__stage">
        <div className="jarvis-hud" data-phase={phase}>
          <div
            className="jarvis-hud__ring"
            role={sessionActive ? undefined : "button"}
            tabIndex={sessionActive ? undefined : 0}
            aria-label={sessionActive ? undefined : "Iniciar sessão"}
            onClick={startSession}
            onKeyDown={handleRingKeyDown}
          >
            <JarvisRingGraphic />
            <div className="jarvis-hud__ring-center">
              <p className="jarvis-hud__ring-brand">G·C</p>
              {!sessionActive ? (
                <>
                  <p className="jarvis-hud__ring-title">Iniciar sessão</p>
                  <p className="jarvis-hud__ring-hint">Toque para continuar</p>
                </>
              ) : (
                <p className="jarvis-hud__ring-active">Canal ativo</p>
              )}
            </div>
          </div>

          <div className="jarvis-hud__lane" aria-hidden={!sessionActive}>
            <div className="jarvis-hud__stem" aria-hidden="true">
              <span className="jarvis-hud__stem-line" />
            </div>

            <div className="jarvis-hud__window">
              <svg
                className="jarvis-hud__outline"
                viewBox="0 0 100 70"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  className="jarvis-hud__trace jarvis-hud__trace--upper"
                  pathLength={1}
                  d="M 0 35 L 0 6 L 98 6"
                />
                <path
                  className="jarvis-hud__trace jarvis-hud__trace--lower"
                  pathLength={1}
                  d="M 0 35 L 0 64 L 98 64 L 98 6"
                />
              </svg>
              <div className="jarvis-hud__window-frame">
                <div className="jarvis-hud__window-header">
                  <span className="jarvis-hud__window-tag">Acesso ao sistema</span>
                  <button
                    type="button"
                    className="jarvis-hud__back"
                    onClick={closeHud}
                    disabled={submitting || phase !== "ready"}
                    aria-label="Voltar ao início"
                  >
                    Voltar
                  </button>
                </div>

                <div className="jarvis-hud__window-body">
                  <form className="jarvis-login__form" onSubmit={onSubmit}>
                    <label className="jarvis-field">
                      <span className="jarvis-field__label">E-mail</span>
                      <input
                        ref={emailRef}
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => onEmailChange(e.target.value)}
                        required
                        disabled={submitting || phase !== "ready" || closing}
                        className="jarvis-field__input"
                        placeholder="seu@email.com"
                      />
                    </label>
                    <label className="jarvis-field">
                      <span className="jarvis-field__label">Senha</span>
                      <input
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => onPasswordChange(e.target.value)}
                        required
                        disabled={submitting || phase !== "ready" || closing}
                        className="jarvis-field__input"
                        placeholder="••••••••"
                      />
                    </label>
                    {error ? <p className="jarvis-login__error" role="alert">{error}</p> : null}
                    <button
                      type="submit"
                      className="jarvis-login__submit"
                      disabled={submitting || phase !== "ready" || closing}
                    >
                      {submitting ? "Validando credenciais..." : "Entrar no sistema"}
                    </button>
                  </form>

                  <p className="jarvis-login__signup">
                    Não tem conta? <Link href="/cadastro">Criar cadastro</Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
