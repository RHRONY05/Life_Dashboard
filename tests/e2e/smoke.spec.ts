import { test, expect } from "@playwright/test";

test.describe("Shell & Page Smoke", () => {
  test("loads the shell and Today page on desktop and mobile", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/");
    // Check title
    await expect(page).toHaveTitle(/Life Dashboard/i);

    // Check main navigation exists
    if (isMobile) {
      await expect(page.locator("header.m-header")).toBeVisible();
      await expect(page.locator("nav.tabbar")).toBeVisible();
    } else {
      await expect(page.locator("header.topbar")).toBeVisible();
      await expect(page.getByText("LIFE DASHBOARD")).toBeVisible();
    }

    // Check heading inside main
    const heading = page.locator("main").getByRole("heading", { name: "TODAY" });
    await expect(heading).toBeVisible();
  });

  test("loads login page with expired flag correctly", async ({ page }) => {
    await page.goto("/login?expired=1");
    await expect(
      page.getByText("You were signed out. Sign in again to continue.")
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });
});
