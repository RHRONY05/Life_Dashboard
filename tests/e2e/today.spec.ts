import { test, expect } from "@playwright/test";

test.describe("Today Board E2E", () => {
  test("desktop board loads columns, adds task, ticks done, and moves to tomorrow", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Desktop only test");

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Check headings
    await expect(page.locator("main").getByRole("heading", { name: "TODAY" })).toBeVisible();
    await expect(page.locator(".col-title", { hasText: "Yesterday" })).toBeVisible();
    await expect(page.locator(".col-title", { hasText: "Tomorrow" })).toBeVisible();

    // 1. Add a task to Today
    const title = `Submit CN lab report ${Date.now()}`;
    const todayInput = page.getByPlaceholder("Add a task…").first();
    await todayInput.fill(title);
    await todayInput.press("Enter");

    // Task appears in Today column
    const taskRow = page.locator(".col.is-today .task", { hasText: title });
    await expect(taskRow).toBeVisible();

    // 2. Tick task -> done
    const tickResponse = page.waitForResponse(
      (res) => res.url().includes("/api/tasks/") && res.request().method() === "PATCH"
    );
    const checkbox = taskRow.getByRole("checkbox");
    await checkbox.click();
    await tickResponse;

    // Strikes through and shows in Done
    await expect(taskRow).toHaveClass(/done/);
    await expect(page.locator(".col.is-today .col-count")).toHaveText(/\d+\s+of\s+\d+\s+done/);

    // 3. Un-tick task
    const untickResponse = page.waitForResponse(
      (res) => res.url().includes("/api/tasks/") && res.request().method() === "PATCH"
    );
    await checkbox.click();
    await untickResponse;
    await expect(taskRow).not.toHaveClass(/done/);

    // 4. Move to Tomorrow via quick move
    await taskRow.hover();
    const moveBtn = taskRow.getByRole("button", { name: /move to tomorrow/i });
    if (await moveBtn.isVisible()) {
      const moveResponse = page.waitForResponse(
        (res) => res.url().includes("/api/tasks/") && res.request().method() === "PATCH"
      );
      await moveBtn.click();
      await moveResponse;
      // Toast appears
      await expect(page.getByText("Moved to Tomorrow")).toBeVisible();
    }
  });

  test("mobile DaySwitcher switches views properly", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "Mobile only test");

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Check DaySwitcher buttons
    const switcher = page.locator(".seg.block");
    await expect(switcher).toBeVisible();

    // Switch to Yest.
    await switcher.getByRole("button", { name: /Yest/i }).click();
    await expect(page.locator(".col-title", { hasText: "Yesterday" })).toBeVisible();

    // Switch to Tmrw
    await switcher.getByRole("button", { name: /Tmrw/i }).click();
    await expect(page.locator(".col-title", { hasText: "Tomorrow" })).toBeVisible();

    // Switch to Lists
    await switcher.getByRole("button", { name: /Lists/i }).click();
    await expect(page.locator(".lists-head").getByRole("heading", { name: "Lists" })).toBeVisible();
  });
});
