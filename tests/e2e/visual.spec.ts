import { test, expect } from "@playwright/test";

test.describe("Visual Regression Baselines", () => {
  const routes = [
    { name: "today", path: "/" },
    { name: "canvas", path: "/canvas" },
    { name: "trackers", path: "/trackers" },
    { name: "spending", path: "/money" },
    { name: "ious", path: "/money?tab=ious" },
    { name: "topay", path: "/money?tab=topay" },
    { name: "renewals", path: "/renewals" },
    { name: "settings", path: "/settings" },
  ];

  for (const r of routes) {
    test(`Visual capture for ${r.name}`, async ({ page }) => {
      await page.goto(r.path);
      await page.waitForLoadState("networkidle");

      // Verify page container is loaded and renders cleanly
      const main = page.locator("main, [role='main'], body").first();
      await expect(main).toBeVisible();

      // Mask dates and volatile timestamps
      const maskLocators = [
        page.locator(".date-string"),
        page.locator(".time-string"),
        page.locator("time"),
      ];

      await expect(page).toHaveScreenshot(`${r.name}.png`, {
        mask: maskLocators,
        maxDiffPixelRatio: 0.05,
      });
    });
  }
});
