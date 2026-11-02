import { test, expect } from "@playwright/test";

test.describe("Authentication Flows", () => {
  // Use empty storage state for logged-out checks
  test.use({ storageState: { cookies: [], origins: [] } });

  test("unauthenticated user on / is redirected to /login", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { name: "LIFE DASHBOARD" })
    ).toBeVisible();
  });

  test("wrong password displays danger banner", async ({ page }) => {
    const email = process.env.E2E_EMAIL || "e2e+vocab@gmail.com";
    await page.goto("/login");

    await page.locator("#email").fill(email);
    await page.locator("#password").fill("wrong-password-12345");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(
      page.getByText("Incorrect password. Try again.")
    ).toBeVisible();
  });

  test("loads login page with expired flag correctly", async ({ page }) => {
    await page.goto("/login?expired=1");
    await expect(
      page.getByText("You were signed out. Sign in again to continue.")
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("correct credentials logs in to Today and can log out", async ({
    page,
  }) => {
    const email = process.env.E2E_EMAIL || "e2e+vocab@gmail.com";
    const password = process.env.E2E_PASSWORD;

    if (!password) {
      throw new Error("E2E_PASSWORD is missing in test environment");
    }

    await page.goto("/login");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();

    await page.waitForURL("/", { timeout: 15000 });
    await expect(page).toHaveURL("http://localhost:3000/");
    await expect(
      page.locator("main").getByRole("heading", { name: "TODAY" })
    ).toBeVisible();

    // Log out via avatar menu on desktop
    const avatar = page.locator("button.avatar");
    if (await avatar.isVisible()) {
      await avatar.click();
      const logoutItem = page.getByText("Log out");
      await logoutItem.click();

      await page.waitForURL(/\/login/, { timeout: 15000 });
      await expect(page).toHaveURL(/\/login/);
    }
  });
});
