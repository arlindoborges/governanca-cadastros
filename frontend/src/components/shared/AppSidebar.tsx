"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS } from "@/lib/navigation";

function isCurrentPath(href: string, pathname: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="app-sidebar">
      <p className="app-sidebar-brand">Governança de Cadastros</p>
      <nav aria-label="Áreas do sistema">
        <ul>
          {NAV_ITEMS.map((item) => {
            const current = isCurrentPath(item.href, pathname);
            return (
              <li key={item.href}>
                <Link href={item.href} aria-current={current ? "page" : undefined}>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
