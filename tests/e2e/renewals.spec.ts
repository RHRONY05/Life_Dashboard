import { test, expect } from "@playwright/test";
import { addDays, todayIn } from "../../src/lib/domain/dates";

test.describe("Renewals E2E", () => {
  const today = todayIn(new Date(), "Asia/Dhaka");

  test.beforeEach(async ({ request }) => {
    // Delete all active renewals
    const res = await request.get("/api/renewals?status=active");
    if (res.ok()) {
      const data = await res.json();
      for (const r of data.renewals || []) {
        await request.delete(`/api/renewals/${r.id}`);
      }
    }
    // Delete all ended renewals
    const endedRes = await request.get("/api/renewals?status=ended");
    if (endedRes.ok()) {
      const data = await endedRes.json();
      for (const r of data.renewals || []) {
        await request.delete(`/api/renewals/${r.id}`);
      }
    }
  });

  test("desktop: adds renewal, shows under Next 30 days, tests Renewed + Undo, and adds overdue item", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Desktop test");

    await page.goto("/renewals");
    await page.waitForLoadState("networkidle");

    // 1. Initial empty state
    await expect(page.getByText("No renewals yet.")).toBeVisible();

    // 2. Add ChatGPT Plus
    await page.getByRole("button", { name: "Add renewal" }).first().click();
    const dialog = page.locator(".dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByPlaceholder(/e\.g\. ChatGPT Plus/i).fill("ChatGPT Plus");
    await dialog.getByPlaceholder("0.00").fill("20");
    await dialog.getByRole("tab", { name: "USD ($)" }).click();

    const in5Days = addDays(today, 5);
    await dialog.locator('input[type="date"]').fill(in5Days);

    // Switch auto renew on
    await dialog.getByRole("switch").click();
    await dialog.getByRole("button", { name: "Add renewal" }).click();
    await expect(dialog).not.toBeVisible();

    // 3. Verify under Next 30 days with In 5 days badge
    await expect(page.getByText("ChatGPT Plus", { exact: true })).toBeVisible();
    await expect(page.getByText("Next 30 days")).toBeVisible();
    await expect(page.getByText("In 5 days")).toBeVisible();
    await expect(page.locator(".rrow .cost", { hasText: "$20.00" })).toBeVisible();

    // 4. Test Renewed button + Undo
    await page.getByRole("button", { name: "Renewed" }).click();

    // Toast with Undo appears
    await expect(page.getByText(/Next:/)).toBeVisible();
    const undoBtn = page.getByRole("button", { name: "Undo" });
    await expect(undoBtn).toBeVisible();
    await undoBtn.click();

    // Reverted back to In 5 days
    await expect(page.getByText("In 5 days")).toBeVisible();

    // 5. Add an overdue item
    await page.getByRole("button", { name: "Add renewal" }).first().click();
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder(/e\.g\. ChatGPT Plus/i).fill("Expired Domain");
    await dialog.getByRole("tab", { name: "Domain" }).click();
    const overdueDate = addDays(today, -2);
    await dialog.locator('input[type="date"]').fill(overdueDate);
    await dialog.getByRole("button", { name: "Add renewal" }).click();
    await expect(dialog).not.toBeVisible();

    // Danger banner appears
    await expect(page.getByText(/1 overdue: mark them renewed or ended\./i)).toBeVisible();
    await expect(page.getByText("2 days overdue")).toBeVisible();

    // Nav badge shows in header
    const renewalsNav = page.locator('.nav a[href="/renewals"]');
    await expect(renewalsNav).toBeVisible();
  });

  test("mobile: adds renewal and displays on mobile screen", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "Mobile test");

    await page.goto("/renewals");
    await page.waitForLoadState("networkidle");

    // Click Add renewal button in mobile header
    await page.getByRole("button", { name: "Add renewal" }).first().click();
    const dialog = page.locator(".dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByPlaceholder(/e\.g\. ChatGPT Plus/i).fill("Mobile Pack");
    await dialog.getByPlaceholder("0.00").fill("499");
    await dialog.getByRole("tab", { name: "BDT (৳)" }).click();

    const in3Days = addDays(today, 3);
    await dialog.locator('input[type="date"]').fill(in3Days);
    await dialog.getByRole("button", { name: "Add renewal" }).click();
    await expect(dialog).not.toBeVisible();

    // Verify row visible on mobile
    await expect(page.getByText("Mobile Pack", { exact: true })).toBeVisible();
    await expect(page.getByText("In 3 days")).toBeVisible();
  });
});
