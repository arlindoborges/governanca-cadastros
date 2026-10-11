import type { ReactNode } from "react";

export function LoginLayoutSplit({ children }: { children: ReactNode }) {
  return (
    <div className="login-layout login-layout--split">
      <aside className="login-layout__split-brand" aria-hidden="true">
        <div className="login-layout__split-brand-inner">
          <span className="brand__mark login-layout__hero-mark">GC</span>
          <h2>Governança de Cadastros</h2>
          <p>Saneamento, matching e base mestre em um só lugar.</p>
          <ul className="login-layout__bullets">
            <li>Importação guiada</li>
            <li>Decisões de saneamento</li>
            <li>DE/PARA e governança</li>
          </ul>
        </div>
      </aside>
      <main className="login-layout__split-form">
        <div className="auth-card glass stack login-layout__card">{children}</div>
      </main>
    </div>
  );
}
