"use client";

import Link from "next/link";
import type { FormEvent } from "react";

type Props = {
  email: string;
  password: string;
  error: string | null;
  submitting: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  showSignupLink?: boolean;
  submitLabel?: string;
};

export function LoginFormFields({
  email,
  password,
  error,
  submitting,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  showSignupLink = true,
  submitLabel = "Entrar",
}: Props) {
  return (
    <form className="stack login-form" onSubmit={onSubmit}>
      <label>
        E-mail
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          required
          disabled={submitting}
        />
      </label>
      <label>
        Senha
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          required
          disabled={submitting}
        />
      </label>
      {error ? <p className="auth-error">{error}</p> : null}
      <button type="submit" disabled={submitting}>{submitting ? "Entrando..." : submitLabel}</button>
      {showSignupLink ? (
        <p className="muted auth-card__footer">
          Não tem conta? <Link href="/cadastro">Cadastre-se</Link>
        </p>
      ) : null}
    </form>
  );
}
