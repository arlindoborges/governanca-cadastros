import type { ReactNode } from "react";

export function LoginLayoutBento({ children }: { children: ReactNode }) {
  return (
    <div className="auth-screen login-layout login-layout--bento">
      <div className="login-layout__bento glass">
        <div className="login-layout__bento-aside">
          <span className="brand__mark">GC</span>
          <h2>Entrar</h2>
          <p className="muted">MVP de saneamento e governança cadastral para sua operação.</p>
          <div className="login-layout__bento-chips">
            <span className="badge">Fase 1</span>
            <span className="badge badge--ok">Fase 2</span>
            <span className="badge">Base Mestre</span>
          </div>
        </div>
        <div className="login-layout__bento-form">{children}</div>
      </div>
    </div>
  );
}
