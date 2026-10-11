import type { ReactNode } from "react";

export function LoginLayoutHero({ children }: { children: ReactNode }) {
  return (
    <div className="login-layout login-layout--hero">
      <header className="login-layout__hero-header">
        <span className="brand__mark">GC</span>
        <div>
          <p className="login-layout__hero-eyebrow">Governança de Cadastros</p>
          <h2>Bem-vindo de volta</h2>
        </div>
      </header>
      <div className="login-layout__hero-card-wrap">
        <div className="auth-card glass stack login-layout__card login-layout__card--hero">{children}</div>
      </div>
    </div>
  );
}
