"use client";

import "./jarvis.css";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { LoginJarvisScreen } from "@/components/login/LoginJarvisScreen";
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

  if (loading) {
    return (
      <div className="jarvis-login">
        <p className="jarvis-login__status" style={{ padding: "2rem" }}>Carregando...</p>
      </div>
    );
  }

  return (
    <LoginJarvisScreen
      email={email}
      password={password}
      error={error}
      submitting={submitting}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onSubmit={onSubmit}
    />
  );
}
