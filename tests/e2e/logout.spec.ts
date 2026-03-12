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

test.describe("Logout", () => {
  const password = process.env.TEST_OPERADOR_PASSWORD;

  test.skip(!password, "Set TEST_OPERADOR_PASSWORD env var to run logout tests");

  test("user can logout via popover menu", async ({ page }) => {
    await loginAs(page, "operador", password!);

    // Open user popover (avatar button with role initial)
    await page.getByRole("button", { name: /opciones de usuario/i }).click();
    await expect(page.getByText("Usuario Operador")).toBeVisible();

    // Click logout
    await page.getByRole("button", { name: /cerrar sesion/i }).click();

    // Confirm dialog
    await expect(page.getByText("Vas a salir de la sesion actual")).toBeVisible();
    await page.getByRole("button", { name: /cerrar sesion/i }).click();

    // Should redirect to login
    await expect(page).toHaveURL(/\/login\//i, { timeout: 10_000 });
  });

  test("cancel logout stays on portal", async ({ page }) => {
    await loginAs(page, "operador", password!);

    await page.getByRole("button", { name: /opciones de usuario/i }).click();
    await page.getByRole("button", { name: /cerrar sesion/i }).click();

    // Cancel
    await page.getByRole("button", { name: "Cancelar" }).click();

    // Should stay on portal
    await expect(page.getByRole("heading", { name: "Portal de Servicios" })).toBeVisible();
  });
});
