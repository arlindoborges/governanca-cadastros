"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";

type Props = {
  email: string;
  password: string;
  error: string | null;
  submitting: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
};

/** Tempo até o contorno do painel fechar (ms), para foco no e-mail */
const FORM_REVEAL_MS = 1450;

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
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => emailRef.current?.focus(), FORM_REVEAL_MS);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  function handleRingKeyDown(event: React.KeyboardEvent) {
    if (open || submitting) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
    }
  }

  function closeHud() {
    if (submitting) return;
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
        <div className={`jarvis-hud${open ? " jarvis-hud--open" : ""}`}>
          <div
            className="jarvis-hud__ring"
            role={open ? undefined : "button"}
            tabIndex={open ? undefined : 0}
            aria-label={open ? undefined : "Iniciar sessão"}
            onClick={startSession}
            onKeyDown={handleRingKeyDown}
          >
            <svg className="jarvis-hud__ring-svg" viewBox="0 0 320 320" aria-hidden="true">
              <circle className="jarvis-hud__ring-outer" cx="160" cy="160" r="148" />
              <circle className="jarvis-hud__ring-mid" cx="160" cy="160" r="118" />
              <circle className="jarvis-hud__ring-inner" cx="160" cy="160" r="88" />
              <path
                className="jarvis-hud__ring-ticks"
                d="M160 12 L160 28 M160 292 L160 308 M12 160 L28 160 M292 160 L308 160"
              />
            </svg>
            <div className="jarvis-hud__ring-center">
              {!open ? (
                <>
                  <p className="jarvis-hud__ring-title">Iniciar sessão</p>
                  <p className="jarvis-hud__ring-hint">Toque para continuar</p>
                </>
              ) : (
                <p className="jarvis-hud__ring-active">GC</p>
              )}
            </div>
          </div>

          <div className="jarvis-hud__assembly" aria-hidden={!open}>
            <svg
              className="jarvis-hud__outline"
              viewBox="0 0 290 210"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {/* Linha horizontal saindo do círculo (65 = 6,5rem no viewBox) */}
              <path
                className="jarvis-hud__trace jarvis-hud__trace--stem"
                pathLength={1}
                d="M 0 105 L 65 105"
              />
              {/* Ramo superior: sobe e percorre o topo */}
              <path
                className="jarvis-hud__trace jarvis-hud__trace--upper"
                pathLength={1}
                d="M 65 105 L 65 14 L 276 14"
              />
              {/* Ramo inferior: desce, base e sobe pela direita para fechar */}
              <path
                className="jarvis-hud__trace jarvis-hud__trace--lower"
                pathLength={1}
                d="M 65 105 L 65 196 L 276 196 L 276 14"
              />
            </svg>

            <div className="jarvis-hud__window">
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
