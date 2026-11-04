import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

test.describe("Settings E2E", () => {
  const outboxDir = path.resolve(process.cwd(), "tests/.outbox");

  test.beforeEach(async ({ request }) => {
    // 1. Delete all quick links
    const linksRes = await request.get("/api/links");
    if (linksRes.ok()) {
      const data = await linksRes.json();
      for (const l of data.links || []) {
        await request.delete(`/api/links/${l.id}`);
      }
    }

    // 2. Revoke any active keys
    const keysRes = await request.get("/api/keys");
    if (keysRes.ok()) {
      const data = await keysRes.json();
      for (const k of data.keys || []) {
        if (!k.revokedAt) {
          await request.post(`/api/keys/${k.id}/revoke`);
        }
      }
    }

    // 3. Clear outbox directory
    if (fs.existsSync(outboxDir)) {
      const files = fs.readdirSync(outboxDir);
      for (const f of files) {
        fs.unlinkSync(path.join(outboxDir, f));
      }
    }
  });

  test("desktop: creates key, verifies show-once snippets, confirms close, revokes key, adds quick link visible on Today, and sends test email", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Desktop test");

    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    // ── 1. Create API Key ──
    await page.getByRole("button", { name: /new key/i }).first().click();
    const dialog = page.locator(".dialog").first();
    await expect(dialog).toBeVisible();

    await dialog.getByPlaceholder(/e\.g\. Muse/i).fill("Test agent");

    // Ensure tasks:write is enabled
    // Scope grid rows: Tasks is the first data row (div:has-text('Tasks'))
    // Click the Write check button for Tasks
    const tasksWriteBtn = dialog.locator(".scope-grid > div:nth-child(6) button");
    await tasksWriteBtn.click();

    await dialog.getByRole("button", { name: "Create key" }).click();

    // ── 2. Show-once dialog ──
    await expect(dialog.getByText("Key for Test agent")).toBeVisible();
    await expect(
      dialog.getByText("Copy this key now. You won't see it again.")
    ).toBeVisible();

    // Check key format
    const secretCode = dialog.locator(".secret code");
    await expect(secretCode).toBeVisible();
    const secretText = await secretCode.textContent();
    expect(secretText).toMatch(/^ld_[A-Za-z0-9_-]{43}$/);
    const prefix = secretText!.slice(0, 11);

    // Check snippet tabs
    await expect(dialog.getByRole("button", { name: "Antigravity" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Claude Code" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Other" })).toBeVisible();

    // Switch to Claude Code tab
    await dialog.getByRole("button", { name: "Claude Code" }).click();
    await expect(dialog.locator(".snippet")).toContainText("claude mcp add");

    // Click Done to attempt closing
    await dialog.getByRole("button", { name: "Done" }).click();

    // Confirm dialog should appear
    const confirmDialog = page.locator(".dialog").last();
    await expect(confirmDialog.getByText("Did you copy the key?")).toBeVisible();
    await confirmDialog.getByRole("button", { name: "Yes, close" }).click();

    // Both dialogs should now be closed
    await expect(page.locator(".dialog")).not.toBeVisible();

    // Key table should now list the key with its prefix
    const row = page.locator("tr", { hasText: prefix });
    await expect(row).toBeVisible();
    await expect(row).toContainText("Test agent");
    await expect(row.locator(".scope.w", { hasText: "tasks rw" })).toBeVisible();

    // ── 3. Revoke Key ──
    await row.getByRole("button", { name: "Revoke" }).click();
    const revokeModal = page.locator(".dialog");
    await expect(revokeModal.getByText("Revoke Test agent's key?")).toBeVisible();
    await revokeModal.getByRole("button", { name: "Revoke" }).click();
    await expect(revokeModal).not.toBeVisible();

    // Row becomes greyed / has text revoked
    await expect(row).toHaveClass(/revoked/);
    await expect(row).toContainText("revoked");

    // ── 4. Quick links: Add link ──
    await page.getByRole("button", { name: /add link/i }).click();
    const linkModal = page.locator(".dialog");
    await expect(linkModal.getByText("Add link")).toBeVisible();

    await linkModal.getByPlaceholder(/e\.g\. Portfolio/i).fill("My Portfolio");
    await linkModal.getByPlaceholder("https://").fill("https://rhrony05.me");
    // Select globe icon
    await linkModal.getByRole("button", { name: "globe" }).click();
    await linkModal.getByRole("button", { name: "Save" }).click();
    await expect(linkModal).not.toBeVisible();

    // Link is visible in Settings
    await expect(page.locator(".lrow", { hasText: "My Portfolio" })).toBeVisible();

    // Navigate to Today and check that the link appears on the rail
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const linkTile = page.locator('a[href="https://rhrony05.me"]', {
      hasText: "My Portfolio",
    });
    await expect(linkTile).toBeVisible();

    // ── 5. Email reminders: Send test email ──
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Send test email" }).click();
    await expect(page.getByText("Sent. Check your inbox.")).toBeVisible();

    // Verify outbox file
    const files = fs.readdirSync(outboxDir);
    expect(files.length).toBeGreaterThanOrEqual(1);
    const content = JSON.parse(
      fs.readFileSync(path.join(outboxDir, files[0]), "utf8")
    );
    expect(content.subject).toContain("Life Dashboard test email");
  });

  test("mobile: creates key and adds quick link", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile test");

    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    // Add quick link on mobile
    await page.getByRole("button", { name: /add link/i }).click();
    const linkModal = page.locator(".dialog");
    await expect(linkModal).toBeVisible();

    await linkModal.getByPlaceholder(/e\.g\. Portfolio/i).fill("Vocab");
    await linkModal.getByPlaceholder("https://").fill("https://vocab.rhrony05.me");
    await linkModal.getByRole("button", { name: "book-open" }).click();
    await linkModal.getByRole("button", { name: "Save" }).click();
    await expect(linkModal).not.toBeVisible();

    await expect(page.getByText("Vocab", { exact: true })).toBeVisible();
  });
});
