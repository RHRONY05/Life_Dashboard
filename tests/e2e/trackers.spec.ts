import { test, expect } from "@playwright/test";

test.describe("Trackers E2E", () => {
  test.beforeEach(async ({ request }) => {
    // Clean up trackers
    const res = await request.get("/api/trackers");
    if (res.ok()) {
      const data = await res.json();
      for (const t of data.trackers || []) {
        await request.delete(`/api/trackers/${t.id}`);
      }
    }

    // Clean up tasks
    const boardRes = await request.get("/api/board");
    if (boardRes.ok()) {
      const board = await boardRes.json();
      const allTasks = [
        ...(board.columns?.yesterday || []),
        ...(board.columns?.today || []),
        ...(board.columns?.tomorrow || []),
        ...(board.olderUnfinished || []),
      ];
      for (const task of allTasks) {
        await request.delete(`/api/tasks/${task.id}`);
      }
    }
  });

  test("creates tracker with paste text, ticks item, schedules to today, and syncs status", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Desktop flow");

    await page.goto("/trackers");
    await page.waitForLoadState("networkidle");

    // 1. Open New tracker dialog
    await page.getByRole("button", { name: "New tracker" }).first().click();
    await expect(page.getByRole("heading", { name: "New tracker" })).toBeVisible();

    const trackerName = `NeetCode 150 (test) ${Date.now()}`;
    await page.locator("#tracker-name").fill(trackerName);
    await page.locator("#tracker-desc").fill("2 problems a day");

    const pasteText = `## Arrays & Hashing
1. Contains Duplicate | https://leetcode.com/problems/contains-duplicate/
2. Valid Anagram
## Two Pointers
- Valid Palindrome`;

    await page.locator("#tracker-items").fill(pasteText);

    // Verify item count badge shows "3 items"
    await expect(page.getByText("3 items")).toBeVisible();

    // Create tracker
    const createResponse = page.waitForResponse(
      (res) => res.url().includes("/api/trackers") && res.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Create tracker" }).click();
    await createResponse;

    // Tracker detail loads
    await expect(page.getByRole("heading", { name: trackerName })).toBeVisible();
    await expect(page.getByText("Arrays & Hashing")).toBeVisible();
    await expect(page.getByText("Two Pointers")).toBeVisible();

    // Contains Duplicate has external link
    await expect(page.getByLabel("Open problem").first()).toBeVisible();

    // 2. Filter switches: by default it is on "To do"
    // Progress is 0 / 3
    await expect(page.locator(".td-prog .num").first()).toHaveText("0 / 3");

    // 3. Tick "Contains Duplicate" -> progress becomes 1 / 3
    const item1 = page.locator(".item", { hasText: "Contains Duplicate" });
    const tickResponse = page.waitForResponse(
      (res) => res.url().includes("/api/tracker-items/") && res.request().method() === "PATCH"
    );
    await item1.getByRole("checkbox").click();
    await tickResponse;

    await expect(page.locator(".td-prog .num").first()).toHaveText("1 / 3");

    // 4. "Add to today" on "Valid Anagram"
    const item2 = page.locator(".item", { hasText: "Valid Anagram" });
    await item2.getByLabel("Item actions").click();

    const scheduleResponse = page.waitForResponse(
      (res) => res.url().includes("/schedule") && res.request().method() === "POST"
    );
    await page.getByRole("menuitem", { name: "Add to today" }).click();
    await scheduleResponse;

    await expect(page.getByText("On today's board")).toBeVisible();
    await expect(item2.getByText("On board · Today")).toBeVisible();

    // 5. Navigate to Today page and check the linked task
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const expectedTaskTitle = `${trackerName}: Valid Anagram`;
    const todayTask = page.locator(".col.is-today .task", { hasText: expectedTaskTitle });
    await expect(todayTask).toBeVisible();

    // Tracker chip should be visible on task
    await expect(todayTask.locator(".badge.b-tracker")).toBeVisible();

    // Tracker rail block should be visible on desktop
    const railBlock = page.locator(".rail section.card", { hasText: "Trackers" });
    await expect(railBlock).toBeVisible();
    await expect(railBlock.getByText(trackerName)).toBeVisible();

    // 6. Tick the task on Today board
    const todayTickResponse = page.waitForResponse(
      (res) => res.url().includes("/api/tasks/") && res.request().method() === "PATCH"
    );
    await todayTask.getByRole("checkbox").click();
    await todayTickResponse;

    await expect(todayTask).toHaveClass(/done/);

    // 7. Go back to /trackers -> "Valid Anagram" is now done
    await page.goto("/trackers");
    await page.waitForLoadState("networkidle");

    // Switch filter to "Done" to see completed items
    await page.getByRole("tab", { name: "Done" }).click();
    await expect(page.locator(".item", { hasText: "Valid Anagram" })).toBeVisible();
    await expect(page.locator(".item", { hasText: "Contains Duplicate" })).toBeVisible();
    await expect(page.locator(".td-prog .num").first()).toHaveText("2 / 3");

    // 8. Delete the test tracker
    await page.getByLabel("Tracker menu").click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText(`Deleted "${trackerName}"`)).toBeVisible();
  });

  test("mobile flow: shows list and navigates into detail view with back button", async ({
    page,
    isMobile,
    request,
  }) => {
    test.skip(!isMobile, "Mobile flow");

    // Create a tracker via API
    const res = await request.post("/api/trackers", {
      data: {
        name: "Mobile Test Tracker",
        itemsText: "## Group 1\n1. First Problem\n2. Second Problem",
      },
    });
    expect(res.ok()).toBeTruthy();
    const tracker = await res.json();

    await page.goto("/trackers");
    await page.waitForLoadState("networkidle");

    // In mobile, list is visible
    const trackerCard = page.locator(".tcard", { hasText: "Mobile Test Tracker" });
    await expect(trackerCard).toBeVisible();

    // Clicking it navigates to /trackers/[id]
    await trackerCard.click();
    await page.waitForURL(`**/trackers/${tracker.id}`);

    // Detail page is visible with back button
    await expect(page.getByRole("heading", { name: "Mobile Test Tracker" })).toBeVisible();
    await expect(page.getByText("First Problem")).toBeVisible();

    // Clicking back button returns to /trackers
    await page.getByRole("button", { name: "Trackers" }).click();
    await page.waitForURL("**/trackers");
    await expect(trackerCard).toBeVisible();

    // Clean up
    await request.delete(`/api/trackers/${tracker.id}`);
  });
});
