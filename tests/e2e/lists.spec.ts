import { test, expect } from "@playwright/test";

test.describe("Lists E2E", () => {
  test("creates list from suggestion, adds item, and plans for today", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Desktop test");

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const existingCard = page.locator("section.lcard", {
      hasText: "TO DO LATER",
    });

    if (!(await existingCard.isVisible())) {
      // Check if "To do later" chip is visible
      const chip = page.locator(".chip", { hasText: "To do later" });
      if (await chip.isVisible()) {
        await chip.click();
      } else {
        // If list already exists or new list button
        const newBtn = page.getByRole("button", { name: /new list/i }).first();
        if (await newBtn.isVisible()) {
          await newBtn.click();
          const listInput = page.getByPlaceholder(/list name/i);
          await listInput.fill("To do later");
          await listInput.press("Enter");
        }
      }
    }

    // List card appears
    const listCard = page
      .locator("section.lcard", { hasText: "TO DO LATER" })
      .first();
    await expect(listCard).toBeVisible();

    // Add item to list
    const itemInput = listCard.getByPlaceholder("Add to To do later…");
    await itemInput.fill("Learn Docker networking");
    await itemInput.press("Enter");

    // Task appears in list card
    const listTask = listCard
      .locator(".task", {
        hasText: "Learn Docker networking",
      })
      .first();
    await expect(listTask).toBeVisible();

    // Plan for today
    await listTask.hover();
    const planBtn = listTask.getByRole("button", { name: /plan for today/i });
    if (await planBtn.isVisible()) {
      await planBtn.click();
      await expect(page.getByText("Moved to Today")).toBeVisible();

      // Check task is now in Today column
      const todayTask = page
        .locator(".col.is-today")
        .locator(".task", { hasText: "Learn Docker networking" })
        .first();
      await expect(todayTask).toBeVisible();
    }
  });
});
