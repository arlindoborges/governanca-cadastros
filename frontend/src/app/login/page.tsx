"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { LoginFormFields } from "@/components/login/LoginFormFields";
import { LoginLayoutClassic } from "@/components/login/layouts/LoginLayoutClassic";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LoginLayoutClassic>
      <div className="auth-card__brand">
        <span className="brand__mark" aria-hidden="true">GC</span>
        <div>
          <h1>Entrar</h1>
          <p className="muted">Acesse o Governança de Cadastros</p>
        </div>
      </div>
      <LoginFormFields
        email={email}
        password={password}
        error={error}
        submitting={submitting}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={onSubmit}
      />
    </LoginLayoutClassic>
  );
}
