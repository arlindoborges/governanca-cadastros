"use client";

import "../login/jarvis.css";

import { FormEvent, useState } from "react";
import { CadastroJarvisScreen } from "@/components/login/CadastroJarvisScreen";
import { useAuth } from "@/contexts/AuthContext";
import { registerUser } from "@/lib/api";

export default function CadastroPage() {
  const { register, user, loading } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setSubmitting(true);
    try {
      if (user) {
        await registerUser(email, password, fullName.trim() || undefined);
        setSuccess("Usuário cadastrado com sucesso.");
        setFullName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
      } else {
        await register(email, password, fullName.trim() || undefined);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível cadastrar");
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
    <CadastroJarvisScreen
      fullName={fullName}
      email={email}
      password={password}
      confirmPassword={confirmPassword}
      error={error}
      success={success}
      submitting={submitting}
        onFullNameChange={setFullName}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onConfirmPasswordChange={setConfirmPassword}
      onSubmit={onSubmit}
    />
  );
}
