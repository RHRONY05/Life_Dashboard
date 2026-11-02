import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const baseUrl = "https://life-rony.vercel.app";
  const email = process.env.ALLOWED_EMAIL || "muhammadrony147@gmail.com";
  const password = process.env.OWNER_PASSWORD;

  console.log("Logging in to live URL...");
  await page.goto(`${baseUrl}/login`);
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.waitForURL(`${baseUrl}/`, { timeout: 15000 });
  await page.waitForLoadState("networkidle");

  // Desktop 1440x900
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "docs/desktop-today.png", fullPage: false });
  console.log("Desktop screenshot saved to docs/desktop-today.png");

  // Open avatar dropdown
  const avatar = page.locator("button.avatar");
  await avatar.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "docs/desktop-dropdown.png", fullPage: false });
  console.log("Desktop dropdown screenshot saved to docs/desktop-dropdown.png");

  // Mobile 390x844
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "docs/mobile-today.png", fullPage: false });
  console.log("Mobile screenshot saved to docs/mobile-today.png");

  await browser.close();
  console.log("Done!");
}

main().catch(console.error);
