import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <h1>Início</h1>
      <p>
        Este MVP abre direto no trabalho de saneamento. Não há tela de login, perfil
        nem senha.
      </p>
      <p>
        Use a barra lateral para ir às áreas operacionais. O fluxo principal é
        importar, analisar, revisar, consolidar na Base Mestre e exportar os
        resultados.
      </p>
      <p>
        <Link href="/importacoes">Começar por Importações</Link>
      </p>
    </>
  );
}
