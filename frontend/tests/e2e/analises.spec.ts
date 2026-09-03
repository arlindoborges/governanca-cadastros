import { expect, test } from "@playwright/test";
import path from "node:path";

test("normaliza lote importado em Analises", async ({ page }) => {
  const systemName = `ERP Norm ${Date.now()}`;
  const xlsxPath = path.join(__dirname, "..", "..", "..", "docs", "testes", "cadastro-origem-amostra.xlsx");

  await page.goto("/importacoes");
  await page.getByLabel("Nome").fill(systemName);
  await page.getByRole("button", { name: "Cadastrar sistema" }).click();
  await page.getByLabel("Sistema de origem").selectOption({ label: systemName });
  await page.getByLabel("Arquivo XLSX").setInputFiles(xlsxPath);
  await page.getByRole("button", { name: "Enviar para mapeamento" }).click();
  await page.getByRole("button", { name: "Confirmar mapeamento" }).click();
  await expect(page.getByText("Concluído")).toBeVisible();

  await page.goto("/analises");
  await expect(page.getByRole("heading", { name: "Análises" })).toBeVisible();
  await page.getByRole("button", { name: "Executar normalização" }).click();
  await expect(page.getByRole("status")).toContainText("normalizados");
  await expect(page.getByRole("heading", { name: "Registros normalizados" })).toBeVisible();

  await page.getByRole("button", { name: "Executar matching" }).click();
  await expect(page.getByRole("status")).toContainText("equivalentes");
  await expect(page.getByRole("heading", { name: "Resultados de matching" })).toBeVisible();
});
