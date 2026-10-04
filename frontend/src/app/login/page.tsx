"use client";

import "./jarvis.css";

import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { LoginJarvisScreen } from "@/components/login/LoginJarvisScreen";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginReveal } from "@/contexts/LoginRevealContext";
import { loadRememberedEmail, persistRememberedEmail } from "@/lib/remember-login";

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading } = useAuth();
  const { startPostLoginReveal } = useLoginReveal();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberUser, setRememberUser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successExit, setSuccessExit] = useState(false);

  useEffect(() => {
    if (!loading && user && !successExit) {
      router.replace("/");
    }
  }, [loading, user, successExit, router]);

  useEffect(() => {
    const saved = loadRememberedEmail();
    setRememberUser(saved.remember);
    if (saved.email) setEmail(saved.email);
  }, []);

  const handleSuccessRingCentered = useCallback(() => {
    startPostLoginReveal();
    router.replace("/");
  }, [router, startPostLoginReveal]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      persistRememberedEmail(rememberUser, email);
      setSuccessExit(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="jarvis-login">
        <p className="jarvis-login__status" style={{ padding: "2rem" }}>Carregando sessão...</p>
      </div>
    );
  }

  return (
    <LoginJarvisScreen
      email={email}
      password={password}
      rememberUser={rememberUser}
      error={error}
      submitting={submitting}
      successExit={successExit}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onRememberUserChange={setRememberUser}
      onSubmit={onSubmit}
      onSuccessRingCentered={handleSuccessRingCentered}
    />
  );
}
