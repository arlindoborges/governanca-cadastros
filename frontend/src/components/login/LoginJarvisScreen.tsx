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

/** Deslocamento do anel antes de desenhar linha/painel (sincronizado com CSS) */
const RING_MOVE_MS = 550;

/** Tempo até o contorno do painel fechar (ms), para foco no campo e-mail */
const FORM_REVEAL_MS = RING_MOVE_MS + 1850;

export function LoginJarvisScreen({
  email,
  password,
  error,
  submitting,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: Props) {
  const [open, setOpen] = useState(false);
  const [drawReady, setDrawReady] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setDrawReady(false);
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ringMs = reduceMotion ? 0 : RING_MOVE_MS;
    const drawTimer = window.setTimeout(() => setDrawReady(true), ringMs);
    return () => window.clearTimeout(drawTimer);
  }, [open]);

  useEffect(() => {
    if (!drawReady) return;
    const t = window.setTimeout(() => emailRef.current?.focus(), FORM_REVEAL_MS - RING_MOVE_MS);
    return () => window.clearTimeout(t);
  }, [drawReady]);

  function handleRingKeyDown(event: React.KeyboardEvent) {
    if (open || submitting) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
    }
  }

  function closeHud() {
    if (submitting) return;
    setDrawReady(false);
    setOpen(false);
  }

  function startSession() {
    if (submitting || open) return;
    setOpen(true);
  }

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
            {open ? "Autenticação · canal seguro" : "Sistema pronto · aguardando início"}
          </p>
        </div>
      </header>

      <div className="jarvis-login__stage">
        <div
          className={`jarvis-hud${open ? " jarvis-hud--open" : ""}${drawReady ? " jarvis-hud--draw" : ""}`}
        >
          <div
            className="jarvis-hud__ring"
            role={open ? undefined : "button"}
            tabIndex={open ? undefined : 0}
            aria-label={open ? undefined : "Iniciar sessão"}
            onClick={startSession}
            onKeyDown={handleRingKeyDown}
          >
            <JarvisRingGraphic />
            <div className="jarvis-hud__ring-center">
              <p className="jarvis-hud__ring-brand">G·C</p>
              {!open ? (
                <>
                  <p className="jarvis-hud__ring-title">Iniciar sessão</p>
                  <p className="jarvis-hud__ring-hint">Toque para continuar</p>
                </>
              ) : (
                <p className="jarvis-hud__ring-active">Canal ativo</p>
              )}
            </div>
          </div>

          <div className="jarvis-hud__lane" aria-hidden={!open}>
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
                    disabled={submitting}
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
                        disabled={submitting || !open}
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
                        disabled={submitting || !open}
                        className="jarvis-field__input"
                        placeholder="••••••••"
                      />
                    </label>
                    {error ? <p className="jarvis-login__error" role="alert">{error}</p> : null}
                    <button type="submit" className="jarvis-login__submit" disabled={submitting || !open}>
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
