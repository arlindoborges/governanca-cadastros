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
      const t = window.setTimeout(() => emailRef.current?.focus(), 680);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  function handlePortalKeyDown(event: React.KeyboardEvent) {
    if (open || submitting) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
    }
  }

  function closePortal() {
    if (submitting) return;
    setOpen(false);
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
          className={`jarvis-portal${open ? " jarvis-portal--open" : ""}`}
          role={open ? undefined : "button"}
          tabIndex={open ? undefined : 0}
          aria-label={open ? undefined : "Iniciar sessão: toque no anel"}
          onClick={!open && !submitting ? () => setOpen(true) : undefined}
          onKeyDown={handlePortalKeyDown}
        >
          <div className="jarvis-portal__rings" aria-hidden={open}>
            <svg className="jarvis-portal__ring-svg" viewBox="0 0 320 320">
              <circle className="jarvis-portal__ring-outer" cx="160" cy="160" r="148" />
              <circle className="jarvis-portal__ring-mid" cx="160" cy="160" r="118" />
              <circle className="jarvis-portal__ring-inner" cx="160" cy="160" r="88" />
              <path
                className="jarvis-portal__ring-ticks"
                d="M160 12 L160 28 M160 292 L160 308 M12 160 L28 160 M292 160 L308 160"
              />
            </svg>
          </div>

          <div className="jarvis-portal__surface">
            {!open ? (
              <div className="jarvis-portal__idle">
                <p className="jarvis-portal__idle-title">Iniciar sessão</p>
                <p className="jarvis-portal__idle-hint">Toque no anel para continuar</p>
              </div>
            ) : (
              <div className="jarvis-portal__form-wrap">
                <div className="jarvis-portal__form-header">
                  <span className="jarvis-portal__form-tag">Acesso ao sistema</span>
                  <button
                    type="button"
                    className="jarvis-portal__back"
                    onClick={closePortal}
                    disabled={submitting}
                    aria-label="Voltar ao anel inicial"
                  >
                    Voltar
                  </button>
                </div>

                <form
                  className="jarvis-login__form"
                  onSubmit={onSubmit}
                  onClick={(e) => e.stopPropagation()}
                >
                  <label className="jarvis-field">
                    <span className="jarvis-field__label">E-mail</span>
                    <input
                      ref={emailRef}
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => onEmailChange(e.target.value)}
                      required
                      disabled={submitting}
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
                      disabled={submitting}
                      className="jarvis-field__input"
                      placeholder="••••••••"
                    />
                  </label>
                  {error ? (
                    <p className="jarvis-login__error" role="alert">{error}</p>
                  ) : null}
                  <button type="submit" className="jarvis-login__submit" disabled={submitting}>
                    {submitting ? "Validando credenciais..." : "Entrar no sistema"}
                  </button>
                </form>

                <p className="jarvis-login__signup">
                  Não tem conta? <Link href="/cadastro">Criar cadastro</Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
