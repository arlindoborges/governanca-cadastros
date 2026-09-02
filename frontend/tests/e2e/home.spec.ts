import { expect, test } from "@playwright/test";

test("abre o inicio com a sidebar e sem login", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Início" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Áreas do sistema" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Importações", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Revisão" })).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
});

test("API responde health ready", async ({ request }) => {
  const api = process.env.PLAYWRIGHT_API_URL ?? "http://127.0.0.1:8000";
  const response = await request.get(`${api}/health/ready`);
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body).toEqual({ status: "ok", database: "ok" });
});
