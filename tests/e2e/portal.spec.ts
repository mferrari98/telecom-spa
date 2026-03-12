import { test, expect, type Page } from "@playwright/test";

async function loginAs(page: Page, role: string, password: string) {
  await page.goto("/login/");

  if (role === "admin") {
    await page.getByText("Acceso administrador").click();
  } else {
    await page.getByRole("button", { name: new RegExp(role, "i") }).click();
  }

  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL("/", { timeout: 15_000 });
}

test.describe("Portal Home", () => {
  const password = process.env.TEST_OPERADOR_PASSWORD;

  test.skip(!password, "Set TEST_OPERADOR_PASSWORD env var to run portal tests");

  test.beforeEach(async ({ page }) => {
    await loginAs(page, "operador", password!);
  });

  test("displays portal header and service sections", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Portal de Servicios" })).toBeVisible();
    await expect(page.getByText("Apps locales")).toBeVisible();
    await expect(page.getByText("Apps externas")).toBeVisible();
  });

  test("displays all local service cards", async ({ page }) => {
    const services = ["Guardias", "Reportes de Agua", "Monitor", "Pedidos", "Deudores"];
    for (const name of services) {
      await expect(page.getByRole("link", { name: new RegExp(`abrir ${name}`, "i") })).toBeVisible();
    }
  });

  test("displays external service cards", async ({ page }) => {
    await expect(page.getByRole("link", { name: /abrir gis/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /abrir dashboard exemys/i })).toBeVisible();
  });

  test("service card navigates to guardias", async ({ page }) => {
    await page.getByRole("link", { name: /abrir guardias/i }).click();
    await expect(page).toHaveURL(/\/guardias\//);
  });

  test("topbar shows brand name", async ({ page }) => {
    await expect(page.getByText("Telecomunicaciones y Automatismos")).toBeVisible();
  });

  test("breadcrumb shows Portal > Inicio", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Portal" })).toBeVisible();
    await expect(page.getByText("Inicio", { exact: true })).toBeVisible();
  });
});

test.describe("Portal - Servicoop role restrictions", () => {
  const password = process.env.TEST_SERVICOOP_PASSWORD;

  test.skip(!password, "Set TEST_SERVICOOP_PASSWORD env var to run servicoop tests");

  test("servicoop only sees guardias and reportes", async ({ page }) => {
    await loginAs(page, "servicoop", password!);

    await expect(page.getByRole("link", { name: /abrir guardias/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /abrir reportes/i })).toBeVisible();

    await expect(page.getByRole("link", { name: /abrir monitor/i })).not.toBeVisible();
    await expect(page.getByRole("link", { name: /abrir pedidos/i })).not.toBeVisible();
    await expect(page.getByRole("link", { name: /abrir deudores/i })).not.toBeVisible();
  });
});
