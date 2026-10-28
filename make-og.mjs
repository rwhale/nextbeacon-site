// Copyright 2026 Rob Hale. All rights reserved.
// Renders og-card.html to og.png (1200x630), the picture LinkedIn shows when the site link is posted.
// Run: node make-og.mjs   (uses the Playwright browser installed for the RoleRadar app)
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire('C:/RoleRadar/roleradar/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(dir, 'og-card.html')).href);
await page.waitForLoadState('networkidle');
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(dir, 'og.png'), type: 'png' });
await browser.close();
console.log('wrote og.png');
