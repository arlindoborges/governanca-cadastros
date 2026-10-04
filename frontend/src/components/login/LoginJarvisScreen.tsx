"use client";

import Link from "next/link";
import { FormEvent, useEffect, useId, useRef, useState } from "react";

type Props = {
  email: string;
  password: string;
  error: string | null;
  submitting: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
};

export function LoginJarvisScreen({
  email,
  password,
  error,
  submitting,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: Props) {
  const [panelOpen, setPanelOpen] = useState(false);
  const panelId = useId();
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (panelOpen) {
      const t = window.setTimeout(() => emailRef.current?.focus(), 320);
      return () => window.clearTimeout(t);
    }
  }, [panelOpen]);

  function openPanel() {
    setPanelOpen(true);
  }

  function closePanel() {
    if (submitting) return;
    setPanelOpen(false);
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
          <p className="jarvis-login__system">GOVERNANÇA · CADASTROS</p>
          <p className="jarvis-login__status">CANAL SEGURO · ESTÁTICO</p>
        </div>
      </header>

      <div className={`jarvis-login__stage${panelOpen ? " jarvis-login__stage--open" : ""}`}>
        <div className="jarvis-login__ring-wrap" aria-hidden="true">
          <svg className="jarvis-login__ring" viewBox="0 0 320 320">
            <circle className="jarvis-login__ring-outer" cx="160" cy="160" r="148" />
            <circle className="jarvis-login__ring-mid" cx="160" cy="160" r="118" />
            <circle className="jarvis-login__ring-inner" cx="160" cy="160" r="88" />
            <path className="jarvis-login__ring-ticks" d="M160 12 L160 28 M160 292 L160 308 M12 160 L28 160 M292 160 L308 160" />
          </svg>
          <div className="jarvis-login__ring-core">
            {!panelOpen ? (
              <button type="button" className="jarvis-login__activate" onClick={openPanel}>
                Entrar
              </button>
            ) : (
              <p className="jarvis-login__core-label">AUTENTICAÇÃO</p>
            )}
          </div>
        </div>

        <div
          id={panelId}
          className={`jarvis-login__panel${panelOpen ? " jarvis-login__panel--open" : ""}`}
          aria-hidden={!panelOpen}
        >
          <div className="jarvis-login__panel-inner">
            <div className="jarvis-login__panel-header">
              <span className="jarvis-login__panel-tag">ACESSO</span>
              <button
                type="button"
                className="jarvis-login__panel-close"
                onClick={closePanel}
                disabled={submitting}
                aria-label="Fechar painel de login"
              >
                ×
              </button>
            </div>

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
                  disabled={submitting || !panelOpen}
                  className="jarvis-field__input"
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
                  disabled={submitting || !panelOpen}
                  className="jarvis-field__input"
                />
              </label>
              {error ? <p className="jarvis-login__error" role="alert">{error}</p> : null}
              <button type="submit" className="jarvis-login__submit" disabled={submitting || !panelOpen}>
                {submitting ? "Validando..." : "Confirmar login"}
              </button>
            </form>

            <p className="jarvis-login__signup">
              Novo usuário? <Link href="/cadastro">Cadastre-se</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
