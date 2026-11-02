import { test as setup, expect } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

const authFile = path.join(__dirname, "../../playwright/.auth/user.json");

setup("authenticate as e2e user", async ({ page }) => {
  const email = process.env.E2E_EMAIL || "e2e+vocab@gmail.com";
  const password = process.env.E2E_PASSWORD;

  if (!email || !password) {
    throw new Error("E2E_EMAIL or E2E_PASSWORD not set in environment");
  }

  // Ensure storage state directory exists
  const authDir = path.dirname(authFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  // Wait for redirect to home page
  await page.waitForURL("/", { timeout: 30000 });
  await expect(page.locator("body")).toBeVisible();

  // Save authenticated state
  await page.context().storageState({ path: authFile });
});
