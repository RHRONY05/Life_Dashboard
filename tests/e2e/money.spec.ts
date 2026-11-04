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

  test("desktop: V5a IOU ledger (+ button, live calculation, edit entry, breakdown chips, import)", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Desktop test");

    await page.goto("/money?tab=ious");
    await page.waitForLoadState("networkidle");

    // 1. Initial entry: Humayen · I lent · 2200
    await page.getByRole("button", { name: "Add entry" }).first().click();
    await page.locator("#person-name-input").fill("Humayen");
    await page.getByRole("button", { name: "I lent" }).click();
    await page.locator("#iou-amount-input").fill("2200");
    await page.locator("#iou-note-input").fill("semester fee");
    await page.getByRole("dialog").getByRole("button", { name: "Add entry" }).click();

    await expect(page.locator(".person b").first()).toContainText("Humayen");
    await expect(page.locator(".person .amt").first()).toContainText("৳2,200");

    // 2. Click '+' on Humayen's row
    await page.locator(".person button[aria-label='Add to Humayen']").click();
    await expect(page.getByRole("heading", { name: "Add IOU entry" })).toBeVisible();
    // Person input should be filled and readOnly
    await expect(page.locator("#person-name-input")).toHaveValue("Humayen");
    await expect(page.getByText("change")).toBeVisible();

    // Select "They paid me" · 350
    await page.getByRole("button", { name: "They paid me" }).click();
    await page.locator("#iou-amount-input").fill("350");
    // Live calculation line should show "Humayen will owe you ৳1,850"
    await expect(page.getByText("Humayen will owe you ৳1,850")).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Add entry" }).click();

    // 3. Verify new balance ৳1,850 and breakdown chips +2,200 and −350
    await expect(page.locator(".person .amt").first()).toContainText("৳1,850");
    await expect(page.locator(".person .bk").first()).toContainText("+2,200");
    await expect(page.locator(".person .bk").first()).toContainText("−350");

    // 4. Verify Ledger right pane: shows .lrow2 with date, note and balanceAfter
    await expect(page.locator(".ledger-head .who b")).toContainText("Humayen");
    const lrows = page.locator(".entries-list .lrow2");
    await expect(lrows.first()).toContainText("Humayen paid you ৳350");
    await expect(lrows.first()).toContainText("bal ৳1,850");

    // 5. Edit entry: click entry menu -> Edit
    await lrows.first().locator("button[aria-label='Entry menu']").click();
    await page.getByRole("menuitem", { name: "Edit" }).click();
    await expect(page.getByRole("heading", { name: "Edit entry" })).toBeVisible();
    await page.locator("#iou-amount-input").fill("400");
    await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();

    // Verify updated balance ৳1,800
    await expect(page.locator(".person .amt").first()).toContainText("৳1,800");

    // 6. Test Import Dialog from page menu
    await page.getByRole("button", { name: "Money menu" }).click();
    await page.getByRole("menuitem", { name: "Import IOUs from notes" }).click();
    await expect(page.getByRole("heading", { name: "Import IOUs from notes" })).toBeVisible();

    // Paste sample notes text
    await page.locator("#import-textarea").fill("Saimun dibe = 570\nHumayen = 500");
    await page.getByRole("button", { name: "Preview" }).click();

    // Step 2 preview
    await expect(page.getByRole("heading", { name: "Import from your notes" })).toBeVisible();
    // Humayen is already in list -> marked skipped
    await expect(page.getByText("Already in your list")).toBeVisible();
    // Saimun is new -> included
    await expect(page.locator(".imp-table b", { hasText: "Saimun" })).toBeVisible();
    await page.getByRole("button", { name: /Import 1 person/i }).click();

    // Verify Saimun was added
    await expect(page.locator(".person b", { hasText: "Saimun" })).toBeVisible();
  });

  test("mobile: adds entry, checks inline expansion and settled", async ({ page, isMobile }) => {
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

    // On mobile, Karim is automatically selected upon creation, showing inline ledger with .lrow2 entries
    const mobileRows = page.locator(".lrow2:visible");
    await expect(mobileRows.first()).toBeVisible();
    await expect(mobileRows.first()).toContainText("You borrowed ৳600");
  });
});
