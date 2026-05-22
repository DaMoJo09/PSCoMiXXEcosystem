import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = 'http://localhost:5000';
const OUT = 'exports/shots';
fs.mkdirSync(OUT, { recursive: true });

const ROUTES = [
  ['fx_template',  '/fx-studio',      'FX STUDIO — TEMPLATE LIBRARY'],
  ['fx_canvas',    '/creator/motion', 'FX STUDIO — CANVAS'],
  ['hop_timeline', '/creator/hop',    'HOP BUILDER — SCENE TIMELINE'],
  ['graffiti',     '/creator/graffiti','GRAFFITI DRAW — SPRAY TOOLS'],
  ['title_maker',  '/creator/title',  'TITLE MAKER — 3D LETTERFORMS'],
  ['card_forge',   '/creator/card',   'CARD FORGE — 300 DPI PRINT'],
  ['comic_editor', '/creator/comic',  'COMIC EDITOR — PAGE BUILDER'],
  ['visual_novel', '/creator/vn',     'VISUAL NOVEL — SCENE BUILDER'],
  ['cyoa',         '/creator/cyoa',   'CYOA — BRANCHING STORY'],
];

const browser = await chromium.launch({
  executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
  args: ['--no-sandbox', '--disable-gpu'],
  headless: true,
});

const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();

// Admin login
const loginRes = await page.request.post(`${BASE}/api/auth/admin-login`, {
  data: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
  headers: { 'Content-Type': 'application/json' },
});
console.log('Admin login:', loginRes.status());
if (!loginRes.ok()) {
  console.error('Login failed:', await loginRes.text());
  process.exit(1);
}

for (const [key, route, label] of ROUTES) {
  try {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2500);
    const out = `${OUT}/${key}.jpg`;
    await page.screenshot({ path: out, type: 'jpeg', quality: 85, fullPage: false });
    const size = fs.statSync(out).size;
    console.log(`OK ${key} (${label}) -> ${out} ${size}B`);
  } catch (e) {
    console.error(`FAIL ${key}:`, e.message);
  }
}

await browser.close();
