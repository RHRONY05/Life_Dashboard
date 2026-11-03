import { test, expect } from "@playwright/test";

test.describe("Canvas Scratch E2E", () => {
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
    await expect(page.locator(".npane-empty")).toContainText("No saved notes yet");

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
    // Grant clipboard permissions
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

    // Switch to Notes tab
    const notesTabBtn = page.getByRole("button", { name: /Notes/i });
    await notesTabBtn.click();

    // Notes list empty state is shown, prose editor is hidden
    await expect(page.locator(".npane-empty")).toBeVisible();
    await expect(prose).toBeHidden();

    // Switch back to Scratch
    const scratchTabBtn = page.getByRole("button", { name: "Scratch", exact: true });
    await scratchTabBtn.click();
    await expect(prose).toBeVisible();
  });

  test("Mobile: Save as note via menu, tap note to open full width with back button", async ({
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

    const saveAsNoteItem = page.getByRole("menuitem", { name: "Save as note" });
    await saveAsNoteItem.click();

    // Toast appears
    await expect(
      page.locator("[data-sonner-toast]", {
        hasText: "Saved as “Mobile Lecture Notes”",
      })
    ).toBeVisible();

    // Switch to Notes tab
    const notesTabBtn = page.getByRole("button", { name: /Notes/i });
    await notesTabBtn.click();

    const noteCard = page.locator(".nlist .nrow", {
      hasText: "Mobile Lecture Notes",
    });
    await expect(noteCard).toBeVisible();

    // Tap note to open full width
    await noteCard.click();

    // Header shows back button
    const backBtn = page.getByRole("button", { name: "Back to Notes" });
    await expect(backBtn).toBeVisible();

    // Click Back to Notes
    await backBtn.click();
    await expect(page.locator(".ecard-head h2")).toHaveText("Scratch");
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

  test("Desktop: Save as note, open note, edit with autosave, search notes, delete note", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Desktop test only");

    await page.goto("/canvas");
    await page.waitForLoadState("networkidle");

    const prose = page.locator(".prose .tiptap");
    await expect(prose).toBeVisible();

    // 1. Enter text in Scratch and click "Save as note"
    await prose.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Backspace");
    await page.keyboard.type("## Operating System Notes\n- Processes vs Threads");

    await page.waitForTimeout(600);

    const saveAsNoteBtn = page.locator("#save-as-note-btn");
    await expect(saveAsNoteBtn).toBeVisible();
    await saveAsNoteBtn.click();

    // Toast appears: "Saved as “Operating System Notes”"
    const toast = page.locator("[data-sonner-toast]", {
      hasText: "Saved as “Operating System Notes”",
    });
    await expect(toast).toBeVisible();

    // The note appears in the Notes list
    const noteRow = page.locator(".nlist .nrow", {
      hasText: "Operating System Notes",
    });
    await expect(noteRow).toBeVisible();

    // Scratch content is still present in editor
    await expect(page.locator(".ecard-head h2")).toHaveText("Scratch");
    await expect(prose).toContainText("Processes vs Threads");

    // 2. Open the note by clicking its card in the notes pane
    await noteRow.click();

    // Editor head now displays editable note title input instead of "SCRATCH"
    const titleInput = page.locator(".ecard-head .ntitle");
    await expect(titleInput).toBeVisible();
    await expect(titleInput).toHaveValue("Operating System Notes");
    await expect(page.locator(".save-status").first()).toContainText("Saved");

    // 3. Edit note text and verify 800ms autosave
    await prose.click();
    await page.keyboard.type("\n- Virtual Memory and Paging");

    // Status transitions to Saving... then Saved
    await expect(page.locator(".save-status").first()).toContainText(/Saving…|Saved/);
    await expect(page.locator(".save-status").first()).toContainText("Saved", {
      timeout: 5000,
    });

    // 4. Test search in notes pane
    const searchInput = page.getByRole("searchbox", { name: "Search notes" });
    await searchInput.fill("Operating");
    await expect(page.locator(".nlist .nrow", { hasText: "Operating System Notes" })).toBeVisible();

    await searchInput.fill("NonExistentKeyword");
    await expect(page.locator(".npane-empty")).toContainText("No notes match “NonExistentKeyword”");

    await searchInput.clear();
    await expect(page.locator(".nlist .nrow", { hasText: "Operating System Notes" })).toBeVisible();

    // 5. Delete note with confirm dialog
    const moreBtn = page.locator(".ecard-head").getByRole("button", { name: "More options" });
    await moreBtn.click();

    const deleteMenuItem = page.getByRole("menuitem", { name: "Delete note" });
    await deleteMenuItem.click();

    // Confirm dialog is shown
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText(/Delete “Operating System Notes”\? Its images are deleted too/)).toBeVisible();

    const confirmDeleteBtn = page.locator("#confirm-delete-note-btn");
    await confirmDeleteBtn.click();

    // Toast "Note deleted" appears
    await expect(page.locator("[data-sonner-toast]", { hasText: "Note deleted" })).toBeVisible();

    // View returns to Scratch and note is gone from list
    await expect(page.locator(".ecard-head h2")).toHaveText("Scratch");
    await expect(page.locator(".nlist .nrow", { hasText: "Operating System Notes" })).toBeHidden();
  });
});
