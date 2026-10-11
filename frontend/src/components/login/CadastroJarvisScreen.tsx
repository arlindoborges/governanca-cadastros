"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef } from "react";
import { JarvisRingGraphic } from "@/components/login/JarvisRingGraphic";

type Props = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  error: string | null;
  submitting: boolean;
  onFullNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
};

export function CadastroJarvisScreen({
  fullName,
  email,
  password,
  confirmPassword,
  error,
  submitting,
  onFullNameChange,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
}: Props) {
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => nameRef.current?.focus(), 80);
    return () => window.clearTimeout(t);
  }, []);

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
          <p className="jarvis-login__status">Cadastro · novo usuário</p>
        </div>
      </header>

      <div className="jarvis-login__stage">
        <div className="jarvis-hud" data-phase="ready">
          <div className="jarvis-hud__ring" aria-hidden="true">
            <JarvisRingGraphic />
            <div className="jarvis-hud__ring-center">
              <p className="jarvis-hud__ring-brand">G·C</p>
              <p className="jarvis-hud__ring-active">Novo acesso</p>
            </div>
          </div>

          <div className="jarvis-hud__lane">
            <div className="jarvis-hud__stem" aria-hidden="true">
              <span className="jarvis-hud__stem-line" />
            </div>

            <div className="jarvis-hud__window">
              <svg
                className="jarvis-hud__outline"
                viewBox="0 0 225 210"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  className="jarvis-hud__trace jarvis-hud__trace--upper"
                  pathLength={1}
                  d="M 0 105 L 0 3 L 222 3"
                />
                <path
                  className="jarvis-hud__trace jarvis-hud__trace--lower"
                  pathLength={1}
                  d="M 0 105 L 0 207 L 222 207 L 222 3"
                />
              </svg>
              <div className="jarvis-hud__window-frame">
                <div className="jarvis-hud__window-header">
                  <span className="jarvis-hud__window-tag">Criar conta</span>
                  <button
                    type="button"
                    className="jarvis-hud__back"
                    onClick={() => router.push("/login")}
                    disabled={submitting}
                    aria-label="Voltar ao login"
                  >
                    Voltar
                  </button>
                </div>

                <div className="jarvis-hud__window-body">
                  <form className="jarvis-login__form" onSubmit={onSubmit}>
                    <label className="jarvis-field">
                      <span className="jarvis-field__label">Nome (opcional)</span>
                      <input
                        ref={nameRef}
                        type="text"
                        autoComplete="name"
                        value={fullName}
                        onChange={(e) => onFullNameChange(e.target.value)}
                        disabled={submitting}
                        className="jarvis-field__input"
                        placeholder="Seu nome"
                      />
                    </label>
                    <label className="jarvis-field">
                      <span className="jarvis-field__label">E-mail</span>
                      <input
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
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => onPasswordChange(e.target.value)}
                        minLength={8}
                        required
                        disabled={submitting}
                        className="jarvis-field__input"
                        placeholder="Mínimo 8 caracteres"
                      />
                    </label>
                    <label className="jarvis-field">
                      <span className="jarvis-field__label">Confirmar senha</span>
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => onConfirmPasswordChange(e.target.value)}
                        minLength={8}
                        required
                        disabled={submitting}
                        className="jarvis-field__input"
                        placeholder="Repita a senha"
                      />
                    </label>
                    {error ? <p className="jarvis-login__error" role="alert">{error}</p> : null}
                    <button type="submit" className="jarvis-login__submit" disabled={submitting}>
                      {submitting ? "Cadastrando..." : "Criar usuário"}
                    </button>
                  </form>

                  <p className="jarvis-login__signup">
                    Já tem conta? <Link href="/login">Entrar</Link>
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
