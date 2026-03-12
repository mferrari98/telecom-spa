import { test, expect } from "@playwright/test";

test.describe("Theme Toggle", () => {
  test("login page starts in dark mode by default", async ({ page }) => {
    await page.goto("/login/");
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("login page theme toggle switches to light mode", async ({ page }) => {
    await page.goto("/login/");
    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.getByRole("button", { name: /cambiar entre tema/i }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });

  test("theme persists across page reload", async ({ page }) => {
    await page.goto("/login/");

    // Switch to light
    await page.getByRole("button", { name: /cambiar entre tema/i }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);

    // Reload
    await page.reload();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });
});
