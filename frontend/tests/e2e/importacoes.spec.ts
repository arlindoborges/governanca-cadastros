import { expect, test } from "@playwright/test";
import path from "node:path";

test("importa XLSX, mapeia colunas e mostra erros por linha", async ({ page }) => {
  await page.goto("/importacoes");
  await expect(page.getByRole("heading", { name: "Importações" })).toBeVisible();

  await page.getByLabel("Arquivo XLSX").setInputFiles(
    path.join(__dirname, "fixtures", "cadastro-origem.xlsx"),
  );
  await page.getByRole("button", { name: "Enviar para mapeamento" }).click();

  await expect(page.getByRole("heading", { name: "Mapear colunas" })).toBeVisible();
  await page.getByLabel("Coluna de código").selectOption("CODIGO");
  await page.getByLabel("Coluna de descrição").selectOption("DESCRICAO");
  await page.getByLabel("Coluna de unidade").selectOption("UNIDADE");
  await page.getByRole("button", { name: "Confirmar mapeamento" }).click();

  await expect(page.getByText("Concluído")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Erros por linha" })).toBeVisible();
  await expect(page.getByText("Código ausente")).toBeVisible();
  await expect(page.getByText("Unidade ausente")).toBeVisible();
});
