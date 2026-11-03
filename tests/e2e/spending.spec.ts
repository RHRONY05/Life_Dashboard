import { test, expect } from "@playwright/test";

test.describe("Spending E2E", () => {
  test.beforeEach(async ({ request }) => {
    // Reset budget to null
    await request.put("/api/settings/budget", {
      data: { monthlyBudget: null },
    });

    // Delete all expenses
    const res = await request.get("/api/spending");
    if (res.ok()) {
      const data = await res.json();
      for (const d of data.days || []) {
        for (const exp of d.expenses || []) {
          await request.delete(`/api/spending/${exp.id}`);
        }
      }
    }
  });

  test("desktop: sets budget, logs expenses via keyboard, edits, and deletes", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Desktop test");

    await page.goto("/money");
    await page.waitForLoadState("networkidle");

    // 1. Set budget ৳8,000
    await page.getByRole("button", { name: "Set a monthly budget" }).click();
    await expect(page.getByRole("heading", { name: "Monthly budget" })).toBeVisible();

    await page.locator("#monthly-budget-input").fill("8000");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("of ৳8,000 budget")).toBeVisible();
    await expect(page.getByText("৳8,000 left")).toBeVisible();

    // 2. Type 120, pick Food, press Enter
    const amountInput = page.locator(".quick input[type='number']");
    await amountInput.fill("120");
    await page.getByRole("button", { name: "Food" }).click();
    await amountInput.press("Enter");

    // Expect row under Today and tiles updated
    await expect(page.getByText("৳7,880 left")).toBeVisible();
    await expect(page.locator(".day-head b.num")).toContainText("৳120");

    // 3. Type 40, pick Transport, press Enter
    await amountInput.fill("40");
    await page.getByRole("button", { name: "Transport" }).click();
    await amountInput.press("Enter");

    // Total today becomes ৳160
    await expect(page.locator(".day-head b.num")).toContainText("৳160");
    await expect(page.getByText("৳7,840 left")).toBeVisible();

    // 4. Edit the first spend (most recently added: Transport ৳40) to 150
    // Click more button on first spend
    await page.locator(".spend button[aria-label='Edit or delete spend']").first().click();
    await expect(page.getByRole("heading", { name: "Edit spend" })).toBeVisible();

    const editAmount = page.locator(".dialog input[type='number']");
    await editAmount.fill("150");
    await page.getByRole("button", { name: "Save" }).click();

    // Verify updated today total ৳120 + ৳150 = ৳270
    await expect(page.locator(".day-head b.num")).toContainText("৳270");

    // 5. Delete an expense with confirm
    await page.locator(".spend button[aria-label='Edit or delete spend']").first().click();
    await expect(page.getByRole("heading", { name: "Edit spend" })).toBeVisible();

    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("heading", { name: "Delete expense?" })).toBeVisible();
    await page.getByRole("button", { name: "Delete" }).click();

    // Remaining spend ৳120
    await expect(page.locator(".day-head b.num")).toContainText("৳120");
  });

  test("mobile: adds and views spend", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile test");

    await page.goto("/money");
    await page.waitForLoadState("networkidle");

    const amountInput = page.locator(".quick input[type='number']");
    await amountInput.fill("80");
    await amountInput.press("Enter");

    await expect(page.locator(".day-head b.num")).toContainText("৳80");
  });
});
