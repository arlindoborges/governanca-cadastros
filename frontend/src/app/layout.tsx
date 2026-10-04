import type { Metadata } from "next";
import { ShellRouter } from "@/components/ShellRouter";
import { AuthProvider } from "@/contexts/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Governança de Cadastros",
  description: "MVP de saneamento e governança cadastral",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          <ShellRouter>{children}</ShellRouter>
        </AuthProvider>
      </body>
    </html>
  );
}
