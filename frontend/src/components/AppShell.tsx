import Link from "next/link";
import type { ReactNode } from "react";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/configuracao-decisoes", label: "Decisões de Saneamento" },
  { href: "/projetos", label: "Projetos" },
  { href: "/importacoes", label: "Importações" },
  { href: "/analises", label: "Análises" },
  { href: "/de-para", label: "DE/PARA" },
  { href: "/base-mestre", label: "Base Mestre" },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">Governança de Cadastros</div>
        <nav>
          {links.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
