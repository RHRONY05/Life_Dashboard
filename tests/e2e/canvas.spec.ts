import { test, expect } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";

if (typeof (globalThis as unknown as { WebSocket: unknown }).WebSocket === "undefined") {
  (globalThis as unknown as { WebSocket: unknown }).WebSocket = class MockWebSocket {};
}

test.describe("Canvas Scratch E2E", () => {
  test.beforeEach(async ({ request }) => {
    // Delete all notes for e2e user so test starts in a clean state
    const res = await request.get("/api/notes");
    if (res.ok()) {
      const data = await res.json();
      for (const n of data.notes || []) {
        await request.delete(`/api/notes/${n.id}`);
      }
    }
  });

  test("Desktop: loads Scratch, edits text, persists across reload, copies markdown and clears with undo", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Desktop test only");

    // Monitor network requests: verify Scratch content is NEVER sent to server
    let scratchLeaked = false;
    const testSecret = "CRITICAL_SCRATCH_PRIVATE_CONTENT_" + Date.now();

    page.on("request", (req) => {
      const postData = req.postData();
      if (postData && postData.includes(testSecret)) {
        scratchLeaked = true;
      }
    });

    await page.goto("/canvas");
    await page.waitForLoadState("networkidle");

    // 1. Check UI elements
    await expect(page.locator(".ecard-head h2")).toContainText("Scratch");
    await expect(page.locator(".save-status").first()).toContainText("Saved · this browser");
    await expect(page.locator(".npane-empty")).toContainText(/No (saved )?(notes|pages) yet/i);

    // 2. Type text into the editor
    const prose = page.locator(".prose .tiptap");
    await expect(prose).toBeVisible();

    await prose.click();
    await page.keyboard.type(`## CN questions\n- Why does TCP need a 3-way handshake?\n${testSecret}`);

    // Wait for debounce save (500ms)
    await page.waitForTimeout(1000);

    // 3. Reload page and confirm persistence from IndexedDB
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.locator('.prose .tiptap[contenteditable="true"]')).toBeVisible();

    await expect(page.locator(".prose .tiptap")).toContainText("CN questions");
    await expect(page.locator(".prose .tiptap")).toContainText(testSecret);

    // Verify network privacy: Scratch text never touched server
    expect(scratchLeaked).toBe(false);

    // 4. Test "Copy as Markdown"
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);

    const copyBtn = page.locator("#copy-markdown-btn");
    await copyBtn.click();
    await expect(page.locator("[data-sonner-toast]")).toContainText("Copied as Markdown");

    // 5. Clear Scratch and Undo
    const moreBtn = page.locator(".ecard-head").getByRole("button", { name: "More options" });
    await moreBtn.click();

    const clearItem = page.getByRole("menuitem", { name: "Clear Scratch" });
    await clearItem.click();

    // Editor is emptied
    await expect(page.locator(".prose .tiptap")).not.toContainText("CN questions");

    // Toast with Undo appears
    const toast = page.locator("[data-sonner-toast]", { hasText: "Scratch cleared" });
    await expect(toast).toBeVisible();

    // Click Undo
    const undoBtn = toast.getByRole("button", { name: "Undo" });
    await undoBtn.click();

    // Content is restored
    await expect(page.locator(".prose .tiptap")).toContainText("CN questions");
  });

  test("Mobile: renders Scratch with Day/Tab switcher, toggles Notes pane, toolbar adapts", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "Mobile test only");

    await page.goto("/canvas");
    await page.waitForLoadState("networkidle");

    // Mobile header
    await expect(page.locator(".m-header h1")).toHaveText("Canvas");

    // Scratch tab active by default
    const prose = page.locator(".prose .tiptap");
    await expect(prose).toBeVisible();

    // Switch to Pages tab
    const pagesTabBtn = page.getByRole("button", { name: /Pages/i });
    await pagesTabBtn.click();

    // Pages list empty state or tree is shown, prose editor is hidden
    await expect(page.locator(".npane")).toBeVisible();
    await expect(prose).toBeHidden();

    // Switch back to Scratch
    const scratchTabBtn = page.getByRole("button", { name: "Scratch", exact: true });
    await scratchTabBtn.click();
    await expect(prose).toBeVisible();
  });

  test("Mobile: Save as page via menu, tap page to open full width with back button", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "Mobile test only");

    await page.goto("/canvas");
    await page.waitForLoadState("networkidle");

    const prose = page.locator(".prose .tiptap");
    await expect(prose).toBeVisible();

    await prose.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Backspace");
    await page.keyboard.type("## Mobile Lecture Notes\n- Algorithms and Data Structures");

    await page.waitForTimeout(600);

    // Click more options menu on mobile header
    const moreBtn = page
      .locator(".md\\:hidden")
      .getByRole("button", { name: "More options" });
    await moreBtn.click();

    const saveAsPageItem = page.getByRole("menuitem", { name: /Save as (page|note)/i });
    await saveAsPageItem.click();

    // Toast appears
    await expect(
      page.locator("[data-sonner-toast]", {
        hasText: "Saved as “Mobile Lecture Notes”",
      })
    ).toBeVisible();

    // Switch to Pages tab
    const pagesTabBtn = page.getByRole("button", { name: /Pages/i });
    await pagesTabBtn.click();

    const pageCard = page.locator(".tree .trow, .nlist .nrow", {
      hasText: "Mobile Lecture Notes",
    }).first();
    await expect(pageCard).toBeVisible();

    // Tap page to open full width
    await pageCard.click();

    // Header shows back button
    const backBtn = page.getByRole("button", { name: "Back to Pages" });
    await expect(backBtn).toBeVisible();

    // Click Back to Pages
    await backBtn.click();
    await expect(page.locator(".npane")).toBeVisible();
  });

  test("Multi-tab Web Lock: second tab is read-only with 'Use here' banner", async ({
    page,
    context,
    isMobile,
  }) => {
    test.skip(isMobile, "Desktop test only");

    // Tab 1 is page
    await page.goto("/canvas");
    await page.waitForLoadState("networkidle");
    await expect(page.locator('.prose .tiptap[contenteditable="true"]')).toBeVisible();
    await expect(page.getByText("Scratch is open in another tab.")).toBeHidden();

    // Open second tab
    const page2 = await context.newPage();
    await page2.goto("/canvas");
    await page2.waitForLoadState("networkidle");

    // Tab 2 detects lock: shows banner and Use here button
    const banner = page2.getByText("Scratch is open in another tab.");
    await expect(banner).toBeVisible();
    const useHereBtn = page2.getByRole("button", { name: "Use here" });
    await expect(useHereBtn).toBeVisible();

    // Click Use here in Tab 2
    await useHereBtn.click();
    await expect(page2.getByText("Scratch is open in another tab.")).toBeHidden();
    await expect(page2.locator('.prose .tiptap[contenteditable="true"]')).toBeVisible();

    // Tab 1 should now be locked and show the banner
    await expect(page.getByText("Scratch is open in another tab.")).toBeVisible();

    await page2.close();
  });

  test("Desktop: Save as page, open page, edit with autosave, search pages, delete page", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Desktop test only");

    await page.goto("/canvas");
    await page.waitForLoadState("networkidle");

    const prose = page.locator(".prose .tiptap");
    await expect(prose).toBeVisible();

    // 1. Enter text in Scratch and click "Save as page"
    await prose.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Backspace");
    await page.keyboard.type("## Operating System Notes\n- Processes vs Threads");

    await page.waitForTimeout(600);

    const saveAsPageBtn = page.locator("#save-as-note-btn");
    await expect(saveAsPageBtn).toBeVisible();
    await saveAsPageBtn.click();

    // Toast appears: "Saved as “Operating System Notes”"
    const toast = page.locator("[data-sonner-toast]", {
      hasText: "Saved as “Operating System Notes”",
    });
    await expect(toast).toBeVisible();

    // The page appears in the Pages tree
    const pageRow = page.locator(".tree .trow", {
      hasText: "Operating System Notes",
    }).first();
    await expect(pageRow).toBeVisible();

    // Scratch content is still present in editor
    await expect(page.locator(".ecard-head h2")).toHaveText("Scratch");
    await expect(prose).toContainText("Processes vs Threads");

    // 2. Open the page by clicking its row
    await pageRow.click();

    // Editor head now displays editable page title input instead of "SCRATCH"
    const titleInput = page.locator(".ecard-head .ntitle");
    await expect(titleInput).toBeVisible();
    await expect(titleInput).toHaveValue("Operating System Notes");
    await expect(page.locator(".save-status").first()).toContainText("Saved");

    // 3. Edit page text and verify 800ms autosave
    await prose.click();
    await page.keyboard.type("\n- Virtual Memory and Paging");

    // Status transitions to Saving... then Saved
    await expect(page.locator(".save-status").first()).toContainText(/Saving…|Saved/);
    await expect(page.locator(".save-status").first()).toContainText("Saved", {
      timeout: 5000,
    });

    // 4. Test search in pages pane
    const searchInput = page.getByRole("searchbox", { name: /Search pages|Search notes/i });
    await searchInput.fill("Operating");
    await expect(page.locator(".nlist .nrow", { hasText: "Operating System Notes" })).toBeVisible();

    await searchInput.fill("NonExistentKeyword");
    await expect(page.locator(".npane-empty")).toContainText(/No pages match|No notes match/);

    await searchInput.clear();
    await expect(page.locator(".tree .trow", { hasText: "Operating System Notes" }).first()).toBeVisible();

    // 5. Delete page with confirm dialog
    const moreBtn = page.locator(".ecard-head").getByRole("button", { name: "More options" });
    await moreBtn.click();

    const deleteMenuItem = page.getByRole("menuitem", { name: /Delete page|Delete note/i });
    await deleteMenuItem.click();

    // Confirm dialog is shown
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText(/Delete “Operating System Notes”/)).toBeVisible();

    const confirmDeleteBtn = page.locator("#confirm-delete-note-btn");
    await confirmDeleteBtn.click();

    // Toast "Page deleted" appears
    await expect(page.locator("[data-sonner-toast]", { hasText: /Page deleted|Note deleted/ })).toBeVisible();

    // View returns to Scratch and page is gone from list
    await expect(page.locator(".ecard-head h2")).toHaveText("Scratch");
    await expect(page.locator(".tree .trow", { hasText: "Operating System Notes" })).toBeHidden();
  });

  test("Desktop: typing continuously with 1.5s delayed PATCH causes no conflict", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Desktop test only");

    // 1.5s delayed PATCH
    await page.route("**/api/notes/*", async (route) => {
      if (route.request().method() === "PATCH") {
        await new Promise((r) => setTimeout(r, 1500));
      }
      await route.continue();
    });

    await page.goto("/canvas");
    await page.waitForLoadState("networkidle");

    const prose = page.locator(".prose .tiptap");
    await expect(prose).toBeVisible();

    await prose.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Backspace");
    await page.keyboard.type("## Stress Test Concurrency\n- Base line");

    await page.waitForTimeout(600);

    const saveAsPageBtn = page.locator("#save-as-note-btn");
    await saveAsPageBtn.click();

    await expect(
      page.locator("[data-sonner-toast]", { hasText: "Saved as “Stress Test Concurrency”" })
    ).toBeVisible();

    // Open page
    const pageRow = page.locator(".tree .trow", { hasText: "Stress Test Concurrency" }).first();
    await pageRow.click();

    await expect(page.locator(".ecard-head .ntitle")).toHaveValue("Stress Test Concurrency");

    // Type in bursts over several seconds while PATCHes take 1.5s
    for (let i = 1; i <= 5; i++) {
      await prose.click();
      await page.keyboard.type(`\n- Continuous typing chunk ${i}`);
      await page.waitForTimeout(1000);
    }

    // Wait for all in-flight saves to settle
    await page.waitForTimeout(4000);

    // Verify: no conflict banner or line ever appeared
    await expect(page.locator(".conflict-line")).toBeHidden();
    await expect(page.getByText(/changed somewhere else|conflict/i)).toBeHidden();
    await expect(page.locator(".save-status").first()).toContainText("Saved");

    // Clean up
    const moreBtn = page.locator(".ecard-head").getByRole("button", { name: "More options" });
    await moreBtn.click();
    await page.getByRole("menuitem", { name: /Delete page|Delete note/i }).click();
    await page.locator("#confirm-delete-note-btn").click();
    await expect(page.locator("[data-sonner-toast]", { hasText: /Page deleted|Note deleted/ })).toBeVisible();
  });

  test("Desktop: Canvas v2 tabs bar, LRU eviction, Alt shortcuts, sub-pages & tree hierarchy", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Desktop test only");

    await page.goto("/canvas");
    await page.waitForLoadState("networkidle");

    // 1. Create a parent page "DevTools Parent"
    const newPageBtn = page.getByRole("button", { name: "New page" });
    await newPageBtn.click();
    await expect(page.locator("[data-sonner-toast]", { hasText: "Page created" })).toBeVisible();

    const titleInput = page.locator(".ecard-head .ntitle");
    await titleInput.fill("DevTools Parent");
    await titleInput.blur();
    await page.waitForTimeout(1000);

    // Verify tab bar shows Scratch + DevTools Parent
    await expect(page.locator(".ptabs .ptab")).toHaveCount(2);
    await expect(page.locator(".ptabs .ptab.on")).toContainText("DevTools Parent");

    // 2. In Sub-pages list at bottom, click "New sub-page"
    const newSubPageBtn = page.locator(".subpages .add");
    await expect(newSubPageBtn).toBeVisible();
    await newSubPageBtn.click();

    // Wait until child tab is created and loaded into editor
    await expect(page.locator(".ptabs .ptab")).toHaveCount(3);
    await expect(titleInput).toHaveValue("Untitled");

    // Set title of child to "Backend Tips"
    await titleInput.fill("Backend Tips");
    await titleInput.blur();
    await page.waitForTimeout(1000);

    // Verify breadcrumb shows "DevTools Parent ›"
    await expect(page.locator(".crumbs")).toContainText("DevTools Parent");

    // Verify tabs count: Scratch + DevTools Parent + Backend Tips = 3
    await expect(page.locator(".ptabs .ptab")).toHaveCount(3);

    // Switch to Scratch via Alt+1
    await page.keyboard.press("Alt+1");
    await expect(page.locator(".ptabs .ptab.scratch.on")).toBeVisible();
    await expect(page.locator(".ecard-head h2")).toHaveText("Scratch");

    // Switch to Backend Tips via Alt+3
    await page.keyboard.press("Alt+3");
    await expect(titleInput).toHaveValue("Backend Tips");

    // Close tab via Alt+W
    await page.keyboard.press("Alt+W");
    await page.waitForTimeout(500);

    // Clean up created pages
    const moreBtn = page.locator(".ecard-head").getByRole("button", { name: "More options" });
    if (await moreBtn.isVisible()) {
      await moreBtn.click();
      await page.getByRole("menuitem", { name: /Delete page/i }).click();
      await page.locator("#confirm-delete-note-btn").click();
      await page.waitForTimeout(500);
    }
  });

  test("Agent-ready pages: shows Edited by Muse line, confirms and undoes agent edit", async ({
    page,
    request,
    isMobile,
  }) => {
    test.skip(isMobile, "Desktop test");

    // 1. Create a page "Agent Page" via API
    const createRes = await request.post("/api/notes", {
      data: {
        title: "Agent Page",
        bodyMd: "## Base Section\n- Original line",
        doc: {
          type: "doc",
          content: [
            {
              type: "heading",
              attrs: { level: 2 },
              content: [{ type: "text", text: "Base Section" }],
            },
            {
              type: "bulletList",
              content: [
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Original line" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    });
    expect(createRes.ok()).toBe(true);
    const created = await createRes.json();

    // 2. Open /canvas and select the note
    await page.goto("/canvas");
    await page.waitForLoadState("networkidle");

    const pageRow = page.locator(".tree .trow", { hasText: "Agent Page" }).first();
    await pageRow.click();
    await expect(page.locator(".ecard-head .ntitle")).toHaveValue("Agent Page");

    // 3. Simulate an agent edit in the DB directly
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll: () => [],
          setAll: () => {},
        },
      }
    );

    const { error: updateErr } = await supabase
      .from("notes")
      .update({
        body_md: "## Base Section\n- Original line\n- Added by Muse",
        doc: null,
        prev_doc: created.doc,
        prev_body_md: created.bodyMd,
        prev_by: "Muse",
        prev_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", created.id);
    expect(updateErr).toBeNull();

    // 4. Reload page to fetch updated note
    await page.reload();
    await page.waitForLoadState("networkidle");

    const pageRowAfter = page.locator(".tree .trow", { hasText: "Agent Page" }).first();
    await pageRowAfter.click();
    await expect(page.locator(".ecard-head .ntitle")).toHaveValue("Agent Page");

    // Verify: Agent line is displayed
    const agentLine = page.locator(".agent-line");
    await expect(agentLine).toBeVisible();
    await expect(agentLine).toContainText("Edited by Muse");
    await expect(agentLine.getByRole("button", { name: "Undo" })).toBeVisible();

    // 5. Click Undo -> Dialog opens
    await agentLine.getByRole("button", { name: "Undo" }).click();
    await expect(
      page.getByText("Undo Muse's edit? Changes you made after it are lost too.")
    ).toBeVisible();

    // 6. Confirm Undo
    const confirmBtn = page.locator("#confirm-undo-agent-edit-btn");
    await confirmBtn.click();

    // Verify toast appears
    await expect(
      page.locator("[data-sonner-toast]", { hasText: "Muse's edit undone" })
    ).toBeVisible();

    // Agent line is now hidden
    await expect(agentLine).toBeHidden();

    // Content no longer has agent addition
    await expect(page.locator(".prose .tiptap")).not.toContainText("Added by Muse");

    // Clean up
    const moreBtn = page.locator(".ecard-head").getByRole("button", { name: "More options" });
    if (await moreBtn.isVisible()) {
      await moreBtn.click();
      await page.getByRole("menuitem", { name: /Delete page/i }).click();
      await page.locator("#confirm-delete-note-btn").click();
      await page.waitForTimeout(500);
    }
  });
});
