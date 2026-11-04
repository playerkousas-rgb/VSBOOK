import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_VERSION, PAGE_TOTAL, SECTIONS } from '../shared/book.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function luminance(hex) {
  const c = hex.replace('#', '');
  const rgb = [0, 2, 4].map((i) => {
    const v = parseInt(c.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function contrastRatio(hexA, hexB) {
  const l1 = luminance(hexA);
  const l2 = luminance(hexB);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

test('all 40 official pages + contents + appendix are mapped in App.jsx and page modules', () => {
  assert.equal(PAGE_TOTAL, 40);
  const numbered = SECTIONS.filter((s) => !s.digital);
  assert.equal(numbered.length, 40);

  const appSrc = fs.readFileSync(path.join(root, 'web/src/App.jsx'), 'utf8');
  for (const sec of SECTIONS) {
    assert.match(appSrc, new RegExp(`\\b${sec.id}\\s*:`), `App.jsx missing route mapping for ${sec.id}`);
  }
});

test('Legal.jsx and copyright placement strictly follow ROVERBOOK v15 rules', () => {
  const legalSrc = fs.readFileSync(path.join(root, 'web/src/components/Legal.jsx'), 'utf8');
  assert.ok(legalSrc.includes('Copyright © 2026 SCOUT SYSTEM'));
  assert.ok(legalSrc.includes('本網站為非官方獨立工具，旨在方便成員，與香港童軍總會無任何官方從屬關係'));
  assert.ok(legalSrc.includes('This site is an independent, unofficial tool for members'));

  // Present on CoverPage, Appendix (BookBack), MenuDialog ("關於 VSBOOK"), and standalone HashSnapshotViewer
  assert.match(fs.readFileSync(path.join(root, 'web/src/pages/CoverPage.jsx'), 'utf8'), /LegalLine/);
  assert.match(fs.readFileSync(path.join(root, 'web/src/pages/BookBack.jsx'), 'utf8'), /LegalNote/);
  assert.match(fs.readFileSync(path.join(root, 'web/src/components/MenuDialog.jsx'), 'utf8'), /LegalNote/);

  // Never repeated on Welcome, Paper sheet footer, BookFront, BookTraining, or Forms
  for (const rel of [
    'web/src/pages/Welcome.jsx',
    'web/src/components/Paper.jsx',
    'web/src/pages/BookFront.jsx',
    'web/src/pages/BookTraining.jsx',
    'web/src/pages/Forms.jsx',
  ]) {
    const src = fs.readFileSync(path.join(root, rel), 'utf8');
    assert.ok(!src.includes('LegalLine') && !src.includes('LegalNote'), `${rel} must not repeat Legal footer`);
  }
});

test('Venture Scout Red theme palette meets WCAG AA contrast and includes all 13 official badge assets', () => {
  const css = fs.readFileSync(path.join(root, 'web/src/styles.css'), 'utf8');
  assert.ok(css.includes('--cover-bg: #540f1e'));
  assert.ok(css.includes('--vs-red: #7a1426'));
  assert.ok(css.includes('html[data-lang="zh"]'));
  assert.ok(css.includes('.write__dot'));

  // Verify WCAG AA >= 4.5:1 for primary text pairs
  assert.ok(contrastRatio('#7a1426', '#f7f2e7') >= 6.5, 'Venture Scout Red heading on archival paper >= 6.5:1');
  assert.ok(contrastRatio('#1e1a14', '#f7f2e7') >= 14.0, 'Primary ink on archival paper >= 14:1');
  assert.ok(contrastRatio('#19386b', '#f7f2e7') >= 8.5, 'Handwritten blue ink on archival paper >= 8.5:1');
  assert.ok(contrastRatio('#f0dba6', '#540f1e') >= 7.0, 'Foil gold text on Venture Scout Red cloth >= 7.0:1');
  assert.ok(contrastRatio('#2b0710', '#d8b871') >= 7.5, 'Dark maroon label on gold CTA pill >= 7.5:1');

  const expectedImgs = [
    'crest-venture.png',
    'badge-membership.png',
    'badge-epaulettes.png',
    'badge-project.png',
    'badge-service.png',
    'badge-activity.png',
    'badge-exploration.png',
    'badge-vsa.png',
    'badge-dsa.png',
    'badge-swa.png',
    'badge-firstaid.png',
    'badge-rover-link.png',
    'bar-gold.png',
  ];
  const sw = fs.readFileSync(path.join(root, 'web/public/sw.js'), 'utf8');
  for (const name of expectedImgs) {
    const file = path.join(root, 'web/public/img', name);
    assert.ok(fs.existsSync(file), `Missing official Venture Scout image ${name}`);
    assert.ok(sw.includes(`/img/${name}`), `Service worker missing precache entry /img/${name}`);
  }
});

test('Write.jsx and Form.jsx match ROVERBOOK v15 circle-dot & paper-true table conventions', () => {
  const writeSrc = fs.readFileSync(path.join(root, 'web/src/components/Write.jsx'), 'utf8');
  assert.ok(writeSrc.includes('write__dot'));

  const formSrc = fs.readFileSync(path.join(root, 'web/src/components/Form.jsx'), 'utf8');
  assert.ok(!formSrc.includes('itemline__tick'), 'AssessTable must not invent a checkbox column');
  assert.ok(formSrc.includes('del = false'), 'Rows must default to paper-true del = false');
});

test('PWA shell, manifest, icons, and service worker stay aligned', () => {
  const html = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8');
  assert.ok(html.includes(`content="${APP_VERSION}"`));
  assert.ok(html.includes('© SCOUT SYSTEM'));
  assert.ok(html.includes('#540f1e'));

  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'web/public/manifest.webmanifest'), 'utf8'));
  assert.equal(manifest.short_name, 'VSBOOK');
  assert.equal(manifest.theme_color, '#540f1e');
  for (const icon of manifest.icons) {
    const iconFile = path.join(root, 'web/public', icon.src.replace(/^\//, ''));
    assert.ok(fs.existsSync(iconFile), `Missing manifest icon ${icon.src}`);
  }
});
