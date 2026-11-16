import { test } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

const targetDir = "C:\\Users\\Asus\\.gemini\\antigravity\\brain\\a48678f9-0de3-47ec-a196-7b607899259f\\mobile_screenshots";

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  storageState: "playwright/.auth/user.json",
});

test("Capture mobile screenshots of all views", async ({ page }) => {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 1. Today
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: path.join(targetDir, "01-today.png") });

  // 1b. Today - Lists tab & Add Task
  const listsTabBtn = page.getByRole("button", { name: /^Lists/i });
  if (await listsTabBtn.isVisible()) {
    await listsTabBtn.click();
    await page.waitForTimeout(400);

    // If no lists exist, create one first
    const listCardInput = page.locator(".lcard .task-input input").first();
    if (!await listCardInput.isVisible()) {
      const newListBtn = page.getByRole("button", { name: "New list" }).first();
      if (await newListBtn.isVisible()) {
        await newListBtn.click();
        const listNameInput = page.getByPlaceholder(/List name/i);
        await listNameInput.fill("Project to complete within this week");
        await page.getByRole("button", { name: "Create" }).click();
        await page.waitForTimeout(500);
      }
    }

    const taskInput = page.locator(".lcard .task-input input").first();
    if (await taskInput.isVisible()) {
      await taskInput.fill("Fix vibe coded project");
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(targetDir, "01b-today-lists-with-add-btn.png") });

      // Click the Add button and wait for the API response
      const addBtn = page.locator(".lcard .task-input button[aria-label='Add task']").filter({ hasText: "Add" }).first();
      await Promise.all([
        page.waitForResponse((res) => res.url().includes("/api/tasks") && res.request().method() === "POST"),
        addBtn.click(),
      ]);
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(targetDir, "01c-today-lists-task-added.png") });
    }
  }

  // 2. Canvas - Scratch
  await page.goto("/canvas");
  await page.waitForLoadState("networkidle");
  const canvasDiag = await page.evaluate(() => {
    const tabbar = document.querySelector(".tabbar");
    const ecard = document.querySelector(".ecard");
    const overflowing: any[] = [];
    document.querySelectorAll("*").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.right > 390.5 || r.width > 390.5) {
        overflowing.push({ tag: el.tagName, cls: el.className.toString(), w: r.width, right: r.right });
      }
    });
    return {
      scrollWidth: document.body.scrollWidth,
      tabbar: tabbar ? { rect: tabbar.getBoundingClientRect(), display: getComputedStyle(tabbar).display, pos: getComputedStyle(tabbar).position } : null,
      ecard: ecard ? ecard.getBoundingClientRect() : null,
      overflowing: overflowing.slice(0, 10),
    };
  });
  console.log("CANVAS_DIAG:", JSON.stringify(canvasDiag, null, 2));
  await page.screenshot({ path: path.join(targetDir, "02-canvas-scratch.png") });

  // 3. Canvas - Pages list
  const pagesBtn = page.getByRole("button", { name: /^Pages/i });
  if (await pagesBtn.isVisible()) {
    await pagesBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(targetDir, "03-canvas-pages.png") });
  }

  // 4. Trackers
  await page.goto("/trackers");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: path.join(targetDir, "04-trackers.png") });

  // 5. Money - Spending
  await page.goto("/money");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: path.join(targetDir, "05-money-spending.png") });

  // 6. Money - IOUs
  await page.goto("/money?tab=ious");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: path.join(targetDir, "06-money-ious.png") });

  // 7. Money - To Pay
  await page.goto("/money?tab=topay");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: path.join(targetDir, "07-money-topay.png") });

  // 8. Renewals
  try {
    const res = await page.request.get("/api/renewals");
    const json = await res.json();
    if (!json.renewals || json.renewals.length === 0) {
      await page.request.post("/api/renewals", {
        data: {
          name: "GitHub Copilot",
          category: "subscription",
          amount: 10,
          currency: "USD",
          cycle: "monthly",
          renewsOn: "2026-11-20",
          autoRenew: true,
          remindDaysBefore: 7,
        },
      });
      await page.request.post("/api/renewals", {
        data: {
          name: "Vercel Pro",
          category: "hosting",
          amount: 20,
          currency: "USD",
          cycle: "monthly",
          renewsOn: "2026-11-25",
          autoRenew: false,
          remindDaysBefore: 3,
        },
      });
    }
  } catch (e) {
    console.error("Failed to seed renewals", e);
  }
  await page.goto("/renewals");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: path.join(targetDir, "08-renewals.png") });

  // Seed sample key & long link for Settings
  try {
    const keysRes = await page.request.get("/api/keys");
    const keysJson = await keysRes.json();
    if (!keysJson.keys || keysJson.keys.length === 0) {
      await page.request.post("/api/keys", {
        data: {
          name: "Antigravity",
          scopes: ["tasks:write", "trackers:write", "money:read", "renewals:write", "notes:write", "links:read"],
        },
      });
    }
    const linksRes = await page.request.get("/api/links");
    const linksJson = await linksRes.json();
    if (!linksJson.links || linksJson.links.length === 0) {
      await page.request.post("/api/links", {
        data: {
          title: "Upwork",
          url: "https://www.upwork.com/freelancers/~01f208b507aeaa4a11?mp_source=share",
          icon: "briefcase",
        },
      });
    }
  } catch (e) {
    console.error("Failed to seed settings items", e);
  }

  // 9. Settings (Standard Mobile 390px)
  await page.goto("/settings");
  await page.waitForLoadState("networkidle");
  const settingsDiag = await page.evaluate(() => {
    const overflowing: any[] = [];
    document.querySelectorAll("*").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.right > 390.5 || r.width > 390.5) {
        overflowing.push({ tag: el.tagName, cls: el.className.toString(), w: r.width, right: r.right });
      }
    });
    const tabbar = document.querySelector(".tabbar");
    return {
      scrollWidth: document.body.scrollWidth,
      innerWidth: window.innerWidth,
      tabbar: tabbar ? tabbar.getBoundingClientRect() : null,
      overflowing: overflowing.slice(0, 15),
    };
  });
  console.log("SETTINGS_DIAG_390:", JSON.stringify(settingsDiag, null, 2));
  await page.screenshot({ path: path.join(targetDir, "09-settings.png") });

  // 10. Settings (User's Exact Mobile Screen 357px)
  await page.setViewportSize({ width: 357, height: 795 });
  await page.waitForTimeout(300);
  const settings357Diag = await page.evaluate(() => {
    const overflowing: any[] = [];
    document.querySelectorAll("*").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.right > 357.5 || r.width > 357.5) {
        overflowing.push({ tag: el.tagName, cls: el.className.toString(), w: r.width, right: r.right });
      }
    });
    const tabbar = document.querySelector(".tabbar");
    return {
      scrollWidth: document.body.scrollWidth,
      innerWidth: window.innerWidth,
      tabbar: tabbar ? tabbar.getBoundingClientRect() : null,
      overflowing: overflowing.slice(0, 15),
    };
  });
  console.log("SETTINGS_DIAG_357:", JSON.stringify(settings357Diag, null, 2));
  await page.screenshot({ path: path.join(targetDir, "10-settings-357px.png") });

  // Scroll to Quick links and Email section
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(targetDir, "11-settings-357px-links.png") });
});
