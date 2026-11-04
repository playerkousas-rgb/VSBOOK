import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_VERSION, PAGE_TOTAL, SECTIONS } from '../shared/book.js';
import leaderHandler from '../api/leader.js';

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

function callLeaderApi(method, body, envCode) {
  const prev = process.env.LEADER_CODE;
  if (envCode === undefined) delete process.env.LEADER_CODE;
  else process.env.LEADER_CODE = envCode;
  let status = 200;
  let payload = null;
  const res = {
    setHeader() {},
    status(c) {
      status = c;
      return this;
    },
    json(data) {
      payload = data;
      return this;
    },
  };
  try {
    leaderHandler({ method, body }, res);
  } finally {
    if (prev === undefined) delete process.env.LEADER_CODE;
    else process.env.LEADER_CODE = prev;
  }
  return { status, payload };
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

test('Legal.jsx and copyright placement strictly follow ROVERBOOK v16 rules', () => {
  const legalSrc = fs.readFileSync(path.join(root, 'web/src/components/Legal.jsx'), 'utf8');
  assert.ok(legalSrc.includes('Copyright © 2026 SCOUT SYSTEM'));
  assert.ok(legalSrc.includes('本網站為非官方獨立工具，旨在方便成員，與香港童軍總會無任何官方從屬關係'));
  assert.ok(legalSrc.includes('This site is an independent, unofficial tool for members'));

  assert.match(fs.readFileSync(path.join(root, 'web/src/pages/CoverPage.jsx'), 'utf8'), /LegalLine/);
  assert.match(fs.readFileSync(path.join(root, 'web/src/pages/BookBack.jsx'), 'utf8'), /LegalNote/);
  assert.match(fs.readFileSync(path.join(root, 'web/src/components/MenuDialog.jsx'), 'utf8'), /LegalNote/);

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
  assert.ok(css.includes("html[data-lang='zh']"));
  assert.ok(css.includes('.write__dot'));
  assert.ok(css.includes('env(safe-area-inset-top)'));

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

test('api/leader.js verifies LEADER_CODE server-side with timingSafeEqual and zero client secret', () => {
  assert.deepEqual(callLeaderApi('GET', null, undefined), { status: 200, payload: { enabled: false } });
  assert.deepEqual(callLeaderApi('GET', null, '852963'), { status: 200, payload: { enabled: true } });
  assert.deepEqual(callLeaderApi('POST', { code: '852963' }, undefined), { status: 503, payload: { error: 'unset' } });
  assert.deepEqual(callLeaderApi('POST', { code: '' }, '852963'), { status: 400, payload: { error: 'empty' } });
  assert.deepEqual(callLeaderApi('POST', { code: '000000' }, '852963'), { status: 401, payload: { error: 'wrong' } });
  assert.deepEqual(callLeaderApi('POST', { code: '852963' }, '852963'), { status: 200, payload: { ok: true } });

  // Ensure VITE_LEADER_CODE never appears anywhere in web/src
  const checkDir = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) checkDir(full);
      else if (/\.(js|jsx|html)$/.test(ent.name)) {
        const txt = fs.readFileSync(full, 'utf8');
        assert.ok(!txt.includes('VITE_LEADER'), `${full} must never expose VITE_LEADER* in client bundle`);
      }
    }
  };
  checkDir(path.join(root, 'web'));
});

test('Leader Mode (read-only) and Normal Mode (cannot read) are strictly separated', () => {
  const appSrc = fs.readFileSync(path.join(root, 'web/src/App.jsx'), 'utf8');
  assert.ok(appSrc.includes('readOnly: leader'), 'App.jsx must lock BookCtx to readOnly when in Leader Mode');
  assert.ok(appSrc.includes('if (isLeader()) return;'), 'App.jsx update() must reject mutations in Leader Mode');
  assert.ok(appSrc.includes('leader ? <HashSnapshotViewer token={hashToken} /> : <LeaderGate mode="gate" />'), '#v= links must require Leader Mode');

  const writeSrc = fs.readFileSync(path.join(root, 'web/src/components/Write.jsx'), 'utf8');
  assert.ok(writeSrc.includes('write--readonly'), 'Write.jsx must render read-only span in Leader Mode');

  const showQrSrc = fs.readFileSync(path.join(root, 'web/src/components/ShowQrDialog.jsx'), 'utf8');
  assert.ok(showQrSrc.includes('payload.t !== KIND_SIGNOFF'), 'Normal mode ShowQrDialog must reject member record-book payloads');
});

test('Chinese and English are cleanly separated with compact paper-true tables', () => {
  const frontSrc = fs.readFileSync(path.join(root, 'web/src/pages/BookFront.jsx'), 'utf8');
  assert.ok(frontSrc.includes('PROMISE_ZH') && frontSrc.includes('LAWS_ZH'), 'P07 Promise & Law must render single-language lists');
  assert.ok(!frontSrc.includes('日期 Date') && !frontSrc.includes('由 From'), 'BookFront must not mix zh + en in the same string');

  const trainSrc = fs.readFileSync(path.join(root, 'web/src/pages/BookTraining.jsx'), 'utf8');
  assert.ok(!trainSrc.includes('或 OR') && !trainSrc.includes('所選項目 Selected Item'), 'BookTraining must not mix zh + en in the same string');
});

test('Favicon SVG, root favicons, manifest icons, and service worker stay aligned', () => {
  const html = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8');
  assert.ok(html.includes(`content="${APP_VERSION}"`));
  assert.ok(html.includes('href="/favicon.svg"'));
  assert.ok(html.includes('href="/favicon-32.png"'));
  assert.ok(html.includes('href="/favicon-48.png"'));
  assert.ok(html.includes('href="/icons/apple-touch-icon.png"'));

  for (const rel of [
    'web/public/favicon.svg',
    'web/public/favicon.ico',
    'web/public/favicon-32.png',
    'web/public/favicon-48.png',
    'web/public/icons/favicon.ico',
    'web/public/icons/favicon-16.png',
    'web/public/icons/favicon-32.png',
    'web/public/icons/apple-touch-icon.png',
    'web/public/icons/icon-192.png',
    'web/public/icons/icon-512.png',
    'web/public/icons/icon-maskable-192.png',
    'web/public/icons/icon-maskable-512.png',
    'web/public/icons/og-image.png',
  ]) {
    const f = path.join(root, rel);
    assert.ok(fs.existsSync(f) && fs.statSync(f).size > 200, `Missing or empty icon ${rel}`);
  }

  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'web/public/manifest.webmanifest'), 'utf8'));
  assert.equal(manifest.short_name, 'VSBOOK');
  assert.equal(manifest.theme_color, '#540f1e');
  for (const icon of manifest.icons) {
    const iconFile = path.join(root, 'web/public', icon.src.replace(/^\//, ''));
    assert.ok(fs.existsSync(iconFile), `Missing manifest icon ${icon.src}`);
  }
});
