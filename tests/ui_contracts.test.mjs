import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_VERSION, PAGE_TOTAL, SECTIONS } from '../shared/book.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('all 40 official pages + contents + appendix are mapped in App.jsx and page modules', () => {
  assert.equal(PAGE_TOTAL, 40);
  const numbered = SECTIONS.filter((s) => !s.digital);
  assert.equal(numbered.length, 40);

  const appSrc = fs.readFileSync(path.join(root, 'web/src/App.jsx'), 'utf8');
  for (const sec of SECTIONS) {
    assert.match(appSrc, new RegExp(`\\b${sec.id}\\s*:`), `App.jsx missing route mapping for ${sec.id}`);
  }
});

test('Legal.jsx preserves exact ROVERBOOK copyright and unofficial tool disclaimer', () => {
  const legalSrc = fs.readFileSync(path.join(root, 'web/src/components/Legal.jsx'), 'utf8');
  assert.ok(legalSrc.includes('Copyright © 2026 SCOUT SYSTEM'));
  assert.ok(legalSrc.includes('本網站為非官方獨立工具，旨在方便成員，與香港童軍總會無任何官方從屬關係'));
  assert.ok(legalSrc.includes('This site is an independent, unofficial tool for members'));
});

test('PWA shell, manifest, icons, and service worker stay aligned', () => {
  const html = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8');
  assert.ok(html.includes(`content="${APP_VERSION}"`));
  assert.ok(html.includes('© SCOUT SYSTEM'));

  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'web/public/manifest.webmanifest'), 'utf8'));
  assert.equal(manifest.short_name, 'VSBOOK');
  for (const icon of manifest.icons) {
    const iconFile = path.join(root, 'web/public', icon.src.replace(/^\//, ''));
    assert.ok(fs.existsSync(iconFile), `Missing manifest icon ${icon.src}`);
  }

  const sw = fs.readFileSync(path.join(root, 'web/public/sw.js'), 'utf8');
  assert.ok(sw.includes('vsbook-cache-'));
});
