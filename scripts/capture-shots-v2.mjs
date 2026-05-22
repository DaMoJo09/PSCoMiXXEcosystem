import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = 'http://localhost:5000';
const OUT = 'exports/shots';
fs.mkdirSync(OUT, { recursive: true });

const ROUTES = [
  ['fx_template',  '/fx-studio',     true],
  ['cyoa',         '/creator/cyoa',  true],
  ['dashboard',    '/',              true],
  ['library',      '/library',       true],
  ['marketplace',  '/marketplace',   true],
  ['print_studio', '/print-studio',  true],
];

const browser = await chromium.launch({
  executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
  args: ['--no-sandbox', '--disable-gpu'],
  headless: true,
});

const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();

const loginRes = await page.request.post(`${BASE}/api/auth/admin-login`, {
  data: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
  headers: { 'Content-Type': 'application/json' },
});
console.log('Admin login:', loginRes.status());

// Accept AI consent globally by hitting the endpoint
const consents = ['/api/auth/accept-ai-consent', '/api/auth/accept-ip-disclosure', '/api/auth/accept-user-agreement'];
for (const c of consents) {
  try { await page.request.post(`${BASE}${c}`); } catch {}
}

for (const [key, route] of ROUTES) {
  try {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 25000 });
    await page.waitForTimeout(2500);
    // Try to dismiss any visible modal close buttons
    try {
      const closeBtns = await page.locator('button:has-text("NOT NOW"), button:has-text("Got it"), button:has-text("Accept"), button[aria-label="Close"]').all();
      for (const b of closeBtns.slice(0,2)) { try { await b.click({ timeout: 800 }); } catch {} }
      await page.waitForTimeout(800);
    } catch {}
    const out = `${OUT}/${key}.jpg`;
    await page.screenshot({ path: out, type: 'jpeg', quality: 85 });
    console.log(`OK ${key} ${fs.statSync(out).size}B`);
  } catch (e) {
    console.error(`FAIL ${key}:`, e.message);
  }
}

await browser.close();
