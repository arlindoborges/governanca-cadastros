import { AppSidebar } from "@/components/shared/AppSidebar";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#conteudo-principal">
        Ir para o conteúdo principal
      </a>
      <AppSidebar />
      <div className="app-content">
        <main id="conteudo-principal">{children}</main>
      </div>
    </div>
  );
}
