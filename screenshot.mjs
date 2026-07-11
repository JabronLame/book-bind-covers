// Screenshot helper for the Bookbinding Coverboard Calculator.
// Usage: node screenshot.mjs http://localhost:3000 [label]
// Saves auto-incremented ./temporary_screenshots/screenshot-N-label.png
import { createRequire } from 'node:module';
import { readdir, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire('/Users/jaredbelardo/node_modules/');
const puppeteer = require('puppeteer');

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const OUT_DIR = join(ROOT, 'temporary_screenshots');
const url = process.argv[2] || 'http://localhost:3000';
const label = (process.argv[3] || 'view').replace(/[^a-z0-9-]+/gi, '-');

async function nextIndex() {
  try {
    const files = await readdir(OUT_DIR);
    const nums = files
      .map((f) => f.match(/^screenshot-(\d+)-/))
      .filter(Boolean)
      .map((m) => parseInt(m[1], 10));
    return nums.length ? Math.max(...nums) + 1 : 1;
  } catch {
    return 1;
  }
}

async function resolveChrome() {
  const base = '/Users/jaredbelardo/.cache/puppeteer/chrome';
  try {
    const builds = (await readdir(base)).filter((d) => /mac/.test(d)).sort();
    if (builds.length) {
      return join(base, builds[builds.length - 1],
        'chrome-mac-arm64', 'Google Chrome for Testing.app',
        'Contents', 'MacOS', 'Google Chrome for Testing');
    }
  } catch {}
  return undefined;
}

await mkdir(OUT_DIR, { recursive: true });
const index = await nextIndex();
const outPath = join(OUT_DIR, `screenshot-${index}-${label}.png`);

const browser = await puppeteer.launch({
  headless: true,
  executablePath: await resolveChrome(),
  args: ['--no-sandbox', '--force-color-profile=srgb'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
// Give React/Babel + fonts a moment to settle.
await new Promise((r) => setTimeout(r, 800));
try { await page.evaluateHandle('document.fonts.ready'); } catch {}
await page.screenshot({ path: outPath, fullPage: true });
await browser.close();
console.log(`Saved ${outPath}`);
