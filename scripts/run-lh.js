const { chromium } = require('@playwright/test');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PAGES = [
  { name: 'today', url: 'http://localhost:3000/' },
  { name: 'canvas', url: 'http://localhost:3000/canvas' },
  { name: 'trackers', url: 'http://localhost:3000/trackers' },
  { name: 'spending', url: 'http://localhost:3000/money' },
  { name: 'ious', url: 'http://localhost:3000/money?tab=ious' },
  { name: 'topay', url: 'http://localhost:3000/money?tab=topay' },
  { name: 'renewals', url: 'http://localhost:3000/renewals' },
  { name: 'settings', url: 'http://localhost:3000/settings' },
];

const OUT_DIR = path.resolve('C:/Users/Asus/.gemini/antigravity/brain/a472a5af-4026-42a7-bc36-eb88c18fcf48/scratch/lh');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

async function run() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--remote-debugging-port=9222'],
  });

  const context = await browser.newContext({
    storageState: 'playwright/.auth/user.json',
  });
  const page = await context.newPage();
  await page.goto('http://localhost:3000/');
  await page.waitForLoadState('networkidle');

  console.log('Playwright authenticated session active on port 9222');

  const results = {};

  for (const p of PAGES) {
    console.log(`Auditing ${p.name}...`);

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
      console.error(`Desktop error for ${p.name}:`, e.message);
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
      console.error(`Mobile error for ${p.name}:`, e.message);
    }
  }

  await browser.close();
  fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(results, null, 2));
  console.log('Finished all audits. Summary saved.');
}

run().catch(console.error);
