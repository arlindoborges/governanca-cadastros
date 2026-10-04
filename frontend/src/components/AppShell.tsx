"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";

const links = [
  { href: "/", label: "Dashboard", shortLabel: "Início", icon: "grid" },
  { href: "/configuracao-decisoes", label: "Decisões de Saneamento", shortLabel: "Decisões", icon: "sliders" },
  { href: "/projetos", label: "Projetos", shortLabel: "Projetos", icon: "folder" },
  { href: "/importacoes", label: "Importações", shortLabel: "Importar", icon: "tray" },
  { href: "/analises", label: "Análises", shortLabel: "Análises", icon: "chart" },
  { href: "/de-para", label: "DE/PARA", shortLabel: "DE/PARA", icon: "arrow" },
  { href: "/base-mestre", label: "Base Mestre", shortLabel: "Mestre", icon: "cube" },
] as const;

function NavIcon({ name }: { name: (typeof links)[number]["icon"] }) {
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true as const };
  switch (name) {
    case "grid":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.75" />
          <rect x="13" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.75" />
          <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.75" />
          <rect x="13" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.75" />
        </svg>
      );
    case "sliders":
      return (
        <svg {...common}>
          <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          <circle cx="4" cy="14" r="2" stroke="currentColor" strokeWidth="1.75" />
          <circle cx="12" cy="11" r="2" stroke="currentColor" strokeWidth="1.75" />
          <circle cx="20" cy="16" r="2" stroke="currentColor" strokeWidth="1.75" />
        </svg>
      );
    case "folder":
      return (
        <svg {...common}>
          <path
            d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "tray":
      return (
        <svg {...common}>
          <path d="M4 7h16l-2 11H6L4 7z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.75" />
        </svg>
      );
    case "chart":
      return (
        <svg {...common}>
          <path d="M4 19V5M4 19h16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          <path d="M8 16v-4M12 16V9M16 16v-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      );
    case "arrow":
      return (
        <svg {...common}>
          <path d="M7 7h10v10M7 17 17 7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "cube":
      return (
        <svg {...common}>
          <path
            d="M12 3 20 7.5v9L12 21 4 16.5v-9L12 3z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path d="M12 12 20 7.5M12 12 4 7.5M12 12v9" stroke="currentColor" strokeWidth="1.75" />
        </svg>
      );
    default:
      return null;
  }
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="app">
      <div className="app__backdrop" aria-hidden="true" />
      <aside className="sidebar glass">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">GC</span>
          <div className="brand__text">
            <span className="brand__title">Governança</span>
            <span className="brand__subtitle">Cadastros</span>
          </div>
        </div>
        <nav className="sidebar__nav" aria-label="Principal">
          {links.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-item${active ? " nav-item--active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <span className="nav-item__icon">
                  <NavIcon name={link.icon} />
                </span>
                <span className="nav-item__label">{link.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar__footer">
          {user ? (
            <>
              <p className="sidebar__user muted" title={user.email}>
                {user.full_name ?? user.email}
              </p>
              <button type="button" className="secondary sidebar__logout" onClick={() => logout()}>
                Sair
              </button>
            </>
          ) : null}
        </div>
      </aside>

      <nav className="tab-bar glass" aria-label="Principal (mobile)">
        {links.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`tab-item${active ? " tab-item--active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <NavIcon name={link.icon} />
              <span>{link.shortLabel}</span>
            </Link>
          );
        })}
      </nav>

      <main className="content">
        <div className="content__inner">{children}</div>
      </main>
    </div>
  );
}
