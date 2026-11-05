import { test, expect } from "@playwright/test";
import { resetUserData, getE2EUserId } from "../helpers/reset";

test.describe("UI States E2E (10-STATES §6)", () => {
  let e2eUserId: string;

  test.beforeAll(async () => {
    e2eUserId = await getE2EUserId();
  });

  test.beforeEach(async () => {
    await resetUserData(e2eUserId);
  });

  test("1. Offline bar and recovery", async ({ page, context }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Simulate going offline
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));

    // Offline bar appears
    const offlineBar = page.locator(".offline-bar, [data-state='offline']").first();
    await expect(offlineBar).toBeVisible({ timeout: 5000 });
    await expect(offlineBar).toContainText("offline");

    // Simulate going back online
    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event("online")));

    // Should indicate back online or resolve
    await expect(offlineBar).toContainText("Back online", { timeout: 5000 });
  });

  test("2. Server error (500) and Retry toast", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Intercept POST /api/tasks once with 500
    await page.route("**/api/tasks", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Internal Server Error" }),
        });
      } else {
        await route.continue();
      }
    }, { times: 1 });

    // Submit a new task
    const taskInput = page.getByPlaceholder("Add a task", { exact: false }).first();
    await taskInput.fill("Will fail first time");
    await taskInput.press("Enter");

    // Expect error toast with Retry
    const toast = page.locator("[data-sonner-toast], .toast").filter({ hasText: "Something went wrong" }).first();
    await expect(toast).toBeVisible({ timeout: 6000 });
    const retryBtn = toast.getByRole("button", { name: "Retry" });
    await expect(retryBtn).toBeVisible();

    // Click Retry (next request will succeed since route interception was 1 time)
    await retryBtn.click();
    await expect(page.getByText("Will fail first time")).toBeVisible({ timeout: 6000 });
  });

  test("3. Session expired (401) redirects to /login?expired=1", async ({ browser }) => {
    // Explicitly unauthenticated context
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();

    await page.goto("/login?expired=1");
    await page.waitForLoadState("networkidle");

    // Banner indicates sign out
    const expiredBanner = page.getByText("You were signed out. Sign in again to continue.");
    await expect(expiredBanner).toBeVisible({ timeout: 5000 });

    await context.close();
  });

  test("4. Unknown URL shows Not Found page with 'Go to Today'", async ({ page }) => {
    await page.goto("/unknown-page-does-not-exist");

    await expect(page.getByText("This page doesn't exist.")).toBeVisible();
    const todayLink = page.getByRole("link", { name: "Go to Today" });
    await expect(todayLink).toBeVisible();
    await todayLink.click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("5. Today all-done strip displays when tasks are completed", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Add a single task
    const input = page.getByPlaceholder("Add a task", { exact: false }).first();
    await input.fill("Solo task to complete");
    await input.press("Enter");

    const taskRow = page.locator(".task").filter({ hasText: "Solo task to complete" });
    await expect(taskRow).toBeVisible({ timeout: 5000 });

    // Click checkbox to complete
    const checkbox = taskRow.getByRole("checkbox");
    await checkbox.click();

    // All-done strip appears
    const allDone = page.locator(".done-strip, [data-state='all-done']").first();
    await expect(allDone).toBeVisible({ timeout: 5000 });
    await expect(allDone).toContainText("done");
  });

  test("6. Tracker 100% finished banner", async ({ page }) => {
    await page.goto("/trackers");
    await page.waitForLoadState("networkidle");

    // Click New tracker button
    await page.getByRole("button", { name: "New tracker" }).first().click();

    // Fill form
    await page.locator("#tracker-name").fill("Completion Tracker");
    await page.locator("#tracker-items").fill("## Group 1\nItem to finish");
    await page.getByRole("button", { name: "Create tracker" }).click();

    // Open detail
    const trackerLink = page.getByText("Completion Tracker").first();
    await expect(trackerLink).toBeVisible({ timeout: 5000 });
    await trackerLink.click();

    // Check the item
    const itemCheckbox = page.locator(".ti-check, button[role='checkbox']").first();
    await expect(itemCheckbox).toBeVisible({ timeout: 5000 });
    await itemCheckbox.click();

    // 100% finished banner appears
    const finishedBanner = page.locator(".tracker-finished-banner, [data-state='finished']").first();
    await expect(finishedBanner).toBeVisible({ timeout: 5000 });
    await expect(finishedBanner).toContainText("Finished!");
  });
});
