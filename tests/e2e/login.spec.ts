import { test, expect } from "@playwright/test";

const ROLES = ["servicoop", "operador"] as const;

test.describe("Login", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login/");
  });

  test("shows role selection on initial load", async ({ page }) => {
    await expect(page.getByText("Portal de Servicios")).toBeVisible();
    await expect(page.getByText("Seleccione su perfil para continuar")).toBeVisible();
    await expect(page.getByRole("button", { name: /servicoop/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /operador/i })).toBeVisible();
    await expect(page.getByText("Acceso administrador")).toBeVisible();
  });

  for (const role of ROLES) {
    test(`shows password form after selecting ${role}`, async ({ page }) => {
      await page.getByRole("button", { name: new RegExp(role, "i") }).click();
      await expect(page.locator("#password")).toBeVisible();
      await expect(page.getByRole("button", { name: "Volver" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Ingresar" })).toBeVisible();
    });
  }

  test("shows password form for admin via subtle link", async ({ page }) => {
    await page.getByText("Acceso administrador").click();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByText("Administrador")).toBeVisible();
  });

  test("back button returns to role selection", async ({ page }) => {
    await page.getByRole("button", { name: /servicoop/i }).click();
    await expect(page.locator("#password")).toBeVisible();

    await page.getByRole("button", { name: "Volver" }).click();
    await expect(page.getByText("Seleccione su perfil para continuar")).toBeVisible();
  });

  test("shows error on wrong password", async ({ page }) => {
    await page.getByRole("button", { name: /operador/i }).click();
    await page.locator("#password").fill("wrong-password-12345");
    await page.getByRole("button", { name: "Ingresar" }).click();

    await expect(page.getByText(/error|incorrecta|invalida/i)).toBeVisible({ timeout: 10_000 });
  });

  test("toggle password visibility", async ({ page }) => {
    await page.getByRole("button", { name: /operador/i }).click();
    const passwordInput = page.locator("#password");

    await expect(passwordInput).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: /mostrar contrase/i }).click();
    await expect(passwordInput).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: /ocultar contrase/i }).click();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("forgot password shows contact info", async ({ page }) => {
    await page.getByRole("button", { name: /servicoop/i }).click();
    await page.getByText(/olvid/i).click();
    await expect(page.getByText("interno 2234")).toBeVisible();
  });

  test("forgot password not shown for admin", async ({ page }) => {
    await page.getByText("Acceso administrador").click();
    await expect(page.getByText(/olvid/i)).not.toBeVisible();
  });
});
