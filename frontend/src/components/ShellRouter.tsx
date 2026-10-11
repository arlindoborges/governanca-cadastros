"use client";

import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";

export function ShellRouter({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
