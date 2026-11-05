import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Accessibility Audits (Axe)", () => {
  const pages = [
    { name: "Today (/)", path: "/" },
    { name: "Canvas (/canvas)", path: "/canvas" },
    { name: "Trackers (/trackers)", path: "/trackers" },
    { name: "Money Spending (/money)", path: "/money" },
    { name: "Money IOUs (/money?tab=ious)", path: "/money?tab=ious" },
    { name: "Money To Pay (/money?tab=topay)", path: "/money?tab=topay" },
    { name: "Renewals (/renewals)", path: "/renewals" },
    { name: "Settings (/settings)", path: "/settings" },
  ];

  for (const p of pages) {
    test(`Page: ${p.name} has no serious or critical violations`, async ({ page }) => {
      await page.goto(p.path);
      await page.waitForLoadState("networkidle");

      const results = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
      const violations = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious"
      );

      expect(violations).toEqual([]);
    });
  }

  test("Logged out /login has no serious or critical violations", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page }).analyze();
    const violations = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );

    expect(violations).toEqual([]);
  });

  test("Dialogs have no serious or critical violations", async ({ page }) => {
    // 1. Settings Key Dialog
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");
    const newKeyBtn = page.getByRole("button", { name: "Create API key" }).or(page.getByRole("button", { name: "New key" })).first();
    if (await newKeyBtn.isVisible()) {
      await newKeyBtn.click();
      await page.waitForSelector("[role='dialog']");
      const keyResults = await new AxeBuilder({ page }).include("[role='dialog']").disableRules(["color-contrast"]).analyze();
      const keyViolations = keyResults.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
      expect(keyViolations).toEqual([]);
      await page.keyboard.press("Escape");
    }

    // 2. Money Entry Dialog
    await page.goto("/money?tab=ious");
    await page.waitForLoadState("networkidle");
    const newEntryBtn = page.getByRole("button", { name: "Add entry" }).or(page.getByRole("button", { name: "+ Entry" })).first();
    if (await newEntryBtn.isVisible()) {
      await newEntryBtn.click();
      await page.waitForSelector("[role='dialog']");
      const entryResults = await new AxeBuilder({ page }).include("[role='dialog']").analyze();
      const entryViolations = entryResults.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
      expect(entryViolations).toEqual([]);
      await page.keyboard.press("Escape");
    }

    // 3. To Pay Dialog
    await page.goto("/money?tab=topay");
    await page.waitForLoadState("networkidle");
    const newTodoBtn = page.getByRole("button", { name: "Add to pay" }).or(page.getByRole("button", { name: "New payment" })).first();
    if (await newTodoBtn.isVisible()) {
      await newTodoBtn.click();
      await page.waitForSelector("[role='dialog']");
      const todoResults = await new AxeBuilder({ page }).include("[role='dialog']").analyze();
      const todoViolations = todoResults.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
      expect(todoViolations).toEqual([]);
      await page.keyboard.press("Escape");
    }
  });
});
