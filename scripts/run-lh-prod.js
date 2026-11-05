const { chromium } = require('@playwright/test');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROD_URL = "https://life-rony.vercel.app";

const PAGES = [
  { name: 'login', url: `${PROD_URL}/login` },
  { name: 'today', url: `${PROD_URL}/` },
  { name: 'canvas', url: `${PROD_URL}/canvas` },
  { name: 'trackers', url: `${PROD_URL}/trackers` },
  { name: 'spending', url: `${PROD_URL}/money` },
  { name: 'ious', url: `${PROD_URL}/money?tab=ious` },
  { name: 'topay', url: `${PROD_URL}/money?tab=topay` },
  { name: 'renewals', url: `${PROD_URL}/renewals` },
  { name: 'settings', url: `${PROD_URL}/settings` },
];

const OUT_DIR = path.resolve('C:/Users/Asus/.gemini/antigravity/brain/a472a5af-4026-42a7-bc36-eb88c18fcf48/scratch/lh-prod');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

async function run() {
  console.log("=== Production Lighthouse Audits (V10) ===");

  const browser = await chromium.launch({
    headless: true,
    args: ['--remote-debugging-port=9222'],
  });

  const page = await browser.newPage();

  // Log in as owner on production
  console.log("Logging into production...");
  await page.goto(`${PROD_URL}/login`);
  await page.locator("#email").fill("muhammadrony147@gmail.com");
  const pwd = process.env.OWNER_PASSWORD || process.env.E2E_PASSWORD;
  await page.locator("#password").fill(pwd);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(`${PROD_URL}/`, { timeout: 15000 });
  console.log("Logged in successfully. Remote debugging port 9222 active.");

  const results = {};

  for (const p of PAGES) {
    console.log(`\nAuditing ${p.name} (${p.url})...`);

    // Desktop
    const deskOut = path.join(OUT_DIR, `${p.name}-desktop.json`);
    try {
      execSync(
        `npx lighthouse "${p.url}" --port=9222 --output=json --output-path="${deskOut}" --preset=desktop --throttling-method=simulate`,
        { stdio: 'pipe' }
      );
      const deskData = JSON.parse(fs.readFileSync(deskOut, 'utf8'));
      results[`${p.name}_desktop`] = {
        perf: Math.round(deskData.categories.performance.score * 100),
        a11y: Math.round(deskData.categories.accessibility.score * 100),
        bp: Math.round(deskData.categories['best-practices'].score * 100),
        lcp: deskData.audits['largest-contentful-paint'].displayValue,
        cls: deskData.audits['cumulative-layout-shift'].displayValue,
        tbt: deskData.audits['total-blocking-time'].displayValue,
      };
      console.log(`  Desktop ${p.name}: perf=${results[`${p.name}_desktop`].perf} a11y=${results[`${p.name}_desktop`].a11y} bp=${results[`${p.name}_desktop`].bp}`);
    } catch (e) {
      console.error(`  Desktop error for ${p.name}:`, e.message);
    }

    // Mobile
    const mobOut = path.join(OUT_DIR, `${p.name}-mobile.json`);
    try {
      execSync(
        `npx lighthouse "${p.url}" --port=9222 --output=json --output-path="${mobOut}" --form-factor=mobile --screenEmulation.mobile=true --throttling-method=simulate`,
        { stdio: 'pipe' }
      );
      const mobData = JSON.parse(fs.readFileSync(mobOut, 'utf8'));
      results[`${p.name}_mobile`] = {
        perf: Math.round(mobData.categories.performance.score * 100),
        a11y: Math.round(mobData.categories.accessibility.score * 100),
        bp: Math.round(mobData.categories['best-practices'].score * 100),
        lcp: mobData.audits['largest-contentful-paint'].displayValue,
        cls: mobData.audits['cumulative-layout-shift'].displayValue,
        tbt: mobData.audits['total-blocking-time'].displayValue,
      };
      console.log(`  Mobile ${p.name}: perf=${results[`${p.name}_mobile`].perf} a11y=${results[`${p.name}_mobile`].a11y} bp=${results[`${p.name}_mobile`].bp}`);
    } catch (e) {
      console.error(`  Mobile error for ${p.name}:`, e.message);
    }
  }

  await browser.close();
  fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(results, null, 2));
  console.log('\nFinished all production Lighthouse audits. Summary saved.');
}

run().catch(console.error);
