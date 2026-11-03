import { test, expect } from "@playwright/test";

test.describe("Money (IOUs) E2E", () => {
  test.beforeEach(async ({ request }) => {
    // Delete all people (which cascades entries)
    const res = await request.get("/api/money");
    if (res.ok()) {
      const data = await res.json();
      for (const p of data.people || []) {
        await request.delete(`/api/money/people/${p.id}`);
      }
    }
  });

  test("desktop: adds entries, checks balances and totals, and settles person", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Desktop test");

    await page.goto("/money?tab=ious");
    await page.waitForLoadState("networkidle");

    // 1. Add entry "Rahim · I lent · 500"
    await page.getByRole("button", { name: "Add entry" }).first().click();
    await expect(page.getByRole("heading", { name: "Add IOU entry" })).toBeVisible();

    await page.locator("#person-name-input").fill("Rahim");
    await page.getByRole("button", { name: "I lent" }).click();
    await page.locator("#iou-amount-input").fill("500");
    await page.getByRole("dialog").getByRole("button", { name: "Add entry" }).click();

    // Verify Rahim owes you ৳500
    await expect(page.locator(".person .t b")).toContainText("Rahim");
    await expect(page.locator(".person .amt")).toContainText("৳500");
    await expect(page.locator(".person .amt")).toContainText("owes you");

    // 2. Add entry "Rahim · They paid me · 200"
    await page.getByRole("button", { name: "Add entry" }).first().click();
    await expect(page.getByRole("heading", { name: "Add IOU entry" })).toBeVisible();

    await page.locator("#person-name-input").fill("Rahim");
    await page.getByRole("button", { name: "They paid me" }).click();
    await page.locator("#iou-amount-input").fill("200");
    await page.getByRole("dialog").getByRole("button", { name: "Add entry" }).click();

    // Verify Rahim owes you ৳300
    await expect(page.locator(".person .amt")).toContainText("৳300");
    await expect(page.locator(".person .amt")).toContainText("owes you");

    // Verify totals
    await expect(page.locator(".tiles")).toContainText("৳300");

    // 3. Settle Rahim
    await page.locator(".person").getByRole("button", { name: "Settle" }).click();
    await expect(page.getByRole("heading", { name: "Mark as settled?" })).toBeVisible();
    await page.locator(".dialog").getByRole("button", { name: "Settle" }).click();

    // Verify Rahim is now under Settled (1)
    await expect(page.getByText("Settled (1)")).toBeVisible();
    await expect(page.locator(".person .amt")).toContainText("settled");
  });

  test("mobile: adds entry and checks settled", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile test");

    await page.goto("/money?tab=ious");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Add entry" }).first().click();
    await expect(page.getByRole("heading", { name: "Add IOU entry" })).toBeVisible();

    await page.locator("#person-name-input").fill("Karim");
    await page.getByRole("button", { name: "I borrowed" }).click();
    await page.locator("#iou-amount-input").fill("600");
    await page.locator("#iou-amount-input").press("Enter");

    await expect(page.locator(".person .amt")).toContainText("৳600");
    await expect(page.locator(".person .amt")).toContainText("you owe");
  });
});
