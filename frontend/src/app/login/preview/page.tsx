"use client";

import { LoginFormFields } from "@/components/login/LoginFormFields";
import { LoginLayoutBento } from "@/components/login/layouts/LoginLayoutBento";
import { LoginLayoutClassic } from "@/components/login/layouts/LoginLayoutClassic";
import { LoginLayoutHero } from "@/components/login/layouts/LoginLayoutHero";
import { LoginLayoutPreviewFrame } from "@/components/login/LoginLayoutPreviewFrame";
import { LoginLayoutSplit } from "@/components/login/layouts/LoginLayoutSplit";
import Link from "next/link";

function PreviewHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="auth-card__brand login-preview__inner-header">
      <span className="brand__mark" aria-hidden="true">GC</span>
      <div>
        <h1>{title}</h1>
        {subtitle ? <p className="muted">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function noopSubmit(e: React.FormEvent) {
  e.preventDefault();
}

export default function LoginLayoutPreviewPage() {
  const demoEmail = "usuario@empresa.com";
  const demoPassword = "••••••••";

  const formProps = {
    email: demoEmail,
    password: demoPassword,
    error: null as string | null,
    submitting: false,
    onEmailChange: () => {},
    onPasswordChange: () => {},
    onSubmit: noopSubmit,
    showSignupLink: true,
  };

  return (
    <div className="login-preview-page">
      <header className="login-preview-page__intro glass">
        <h1>Layouts de login — escolha uma opção</h1>
        <p className="muted">
          Quatro propostas no estilo iOS 27 (vidro e gradiente). Diga qual prefere (A, B, C ou D) para aplicarmos em{" "}
          <Link href="/login">/login</Link> e <Link href="/cadastro">/cadastro</Link>.
        </p>
      </header>

      <div className="login-preview-grid">
        <LoginLayoutPreviewFrame
          id="layout-a"
          title="A — Cartão central (atual)"
          description="Simples, foco no formulário. Bom para mobile e telas pequenas."
        >
          <LoginLayoutClassic>
            <PreviewHeader title="Entrar" subtitle="Acesse o Governança de Cadastros" />
            <LoginFormFields {...formProps} />
          </LoginLayoutClassic>
        </LoginLayoutPreviewFrame>

        <LoginLayoutPreviewFrame
          id="layout-b"
          title="B — Split marca + formulário"
          description="Painel esquerdo com proposta de valor; direita com login. Visual corporativo."
        >
          <LoginLayoutSplit>
            <PreviewHeader title="Entrar" subtitle="Use seu e-mail corporativo" />
            <LoginFormFields {...formProps} />
          </LoginLayoutSplit>
        </LoginLayoutPreviewFrame>

        <LoginLayoutPreviewFrame
          id="layout-c"
          title="C — Hero editorial"
          description="Título grande no topo; cartão de login flutuando à direita. Mais ‘app premium’."
        >
          <LoginLayoutHero>
            <PreviewHeader title="Sua sessão" subtitle="E-mail e senha" />
            <LoginFormFields {...formProps} showSignupLink={false} />
            <p className="muted auth-card__footer">
              <Link href="/cadastro">Criar conta</Link>
            </p>
          </LoginLayoutHero>
        </LoginLayoutPreviewFrame>

        <LoginLayoutPreviewFrame
          id="layout-d"
          title="D — Bento (duas colunas)"
          description="Cartão largo: marca e chips à esquerda, campos à direita. Equilibrado em desktop."
        >
          <LoginLayoutBento>
            <LoginFormFields {...formProps} />
          </LoginLayoutBento>
        </LoginLayoutPreviewFrame>
      </div>
    </div>
  );
}
