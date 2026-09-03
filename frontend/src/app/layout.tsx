import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Governança de Cadastros",
  description: "MVP de saneamento e governança de cadastros de produtos",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
