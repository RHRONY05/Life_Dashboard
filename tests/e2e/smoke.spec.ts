import { test, expect } from "@playwright/test";

test.describe("Shell & Page Smoke", () => {
  test("loads the shell and Today page on desktop and mobile", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/");
    // Check title
    await expect(page).toHaveTitle(/Life Dashboard/i);

    // Check main navigation and strict viewport separation
    if (isMobile) {
      await expect(page.locator("header.m-header")).toBeVisible();
      await expect(page.locator("nav.tabbar")).toBeVisible();
      await expect(page.locator("header.topbar")).not.toBeVisible();
      await expect(page.locator(".day-switcher")).toBeVisible();
    } else {
      await expect(page.locator("header.topbar")).toBeVisible();
      await expect(page.getByText("LIFE DASHBOARD")).toBeVisible();
      await expect(page.locator("header.m-header")).not.toBeVisible();
      await expect(page.locator("nav.tabbar")).not.toBeVisible();
      await expect(page.locator(".day-switcher")).not.toBeVisible();
    }

    // Check heading inside main / header
    if (isMobile) {
      await expect(page.locator("header.m-header h1")).toContainText(/Today/i);
    } else {
      const heading = page.locator("main").getByRole("heading", { name: "TODAY" });
      await expect(heading).toBeVisible();
    }
  });

  test("toggles theme between light and dark and defaults to light", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/");
    // By default, light mode: data-theme should not be dark
    const html = page.locator("html");
    await expect(html).not.toHaveAttribute("data-theme", "dark");

    // Click theme toggle
    const toggleBtn = isMobile
      ? page.locator("header.m-header button[aria-label*='mode']")
      : page.locator("header.topbar button[aria-label*='mode']");

    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();

    // Now dark mode
    await expect(html).toHaveAttribute("data-theme", "dark");

    // Click again to return to light mode
    await toggleBtn.click();
    await expect(html).not.toHaveAttribute("data-theme", "dark");
  });
});
