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

test('表格欄寬按真實內容量度：名稱欄 clamp() 攤分、日期欄下限容得下 YYYY-MM-DD 連日曆鈕', () => {
  const css = fs.readFileSync(path.join(root, 'web/src/styles.css'), 'utf8');

  // 1. 名稱欄不得以 minmax(0, 1fr) 獨佔餘下全部闊度
  assert.ok(
    !/\.asstable__head,\s*\n\.assrow\s*\{[^}]*minmax\(0,\s*1fr\)/.test(css),
    'assrow 名稱欄不得用 minmax(0, 1fr) 獨佔餘下闊度',
  );

  // 2. 名稱欄用 clamp(下限, 佔闊百分比, 上限)
  const assCols = /\.asstable__head,\s*\n\.assrow\s*\{[^}]*grid-template-columns:\s*([^;]+);/.exec(css);
  assert.ok(assCols, 'assrow 必須有 grid-template-columns');
  assert.match(assCols[1], /clamp\(\s*\d+px\s*,\s*\d+%\s*,\s*\d+px\s*\)/, '名稱欄必須用 clamp(下限, 百分比, 上限)');

  // 3. 日期欄下限 >= 118px（原生日期輸入連日曆鈕所需）
  const dateMins = [...assCols[1].matchAll(/minmax\((\d+)px/g)].map((m) => Number(m[1]));
  assert.ok(Math.max(...dateMins) >= 118, `日期欄下限須 >= 118px，實得 ${Math.max(...dateMins)}px`);

  // 4. 續期表同樣用 grid 而非 flex:1（曾令日期欄被壓至 58–82px）
  const renew = /\.renewtable__head,\s*\n\.renewrow\s*\{[^}]*grid-template-columns:\s*([^;]+);/.exec(css);
  assert.ok(renew, 'renewrow 必須用 grid-template-columns');
  assert.ok(
    [...renew[1].matchAll(/minmax\((\d+)px/g)].every((m) => Number(m[1]) >= 118),
    '續期表兩個日期欄下限須 >= 118px',
  );

  // 5. 表頭與表身共用同一套欄寬
  assert.match(css, /\.asstable__head,\s*\n\.assrow\s*\{\s*\n\s*display:\s*grid/, '表頭與表身必須共用同一組 grid-template-columns');
  assert.match(css, /\.pgtable__head,\s*\n\.asstable__head,\s*\n\.renewtable__head/, '三種表格表頭須共用樣式');

  // 6. 不可用 container-type / container query 量度頁面闊度（會困住 position: fixed 彈窗）
  assert.ok(!/container-type\s*:/.test(css), '禁止 container-type —— 會令簽署彈窗被困在書頁內');
  assert.ok(!/@container\b/.test(css), '禁止 @container 查詢');
});

test('簽名圖同時限寬限高，窄欄不顯示會遮字的浮動小按鈕', () => {
  const css = fs.readFileSync(path.join(root, 'web/src/styles.css'), 'utf8');
  for (const sel of ['.assrow__sigbtn img', '.renewrow__sigarea img', '.sigblock__preview img', '.signoffsig img']) {
    const re = new RegExp(`${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{[^}]*\\}`);
    const rule = re.exec(css);
    assert.ok(rule, `${sel} 必須有樣式規則`);
    assert.match(rule[0], /max-width:\s*100%/, `${sel} 必須限寬 max-width: 100%`);
    assert.match(rule[0], /max-height:/, `${sel} 必須限高`);
  }
  const zoomHide = /\.assrow__date \.write__zoom,\s*\n\.assrow__init \.write__zoom,\s*\n\.pgtable__cell \.write__zoom/.exec(css);
  assert.ok(zoomHide, '窄欄（主考／日期／表格細胞）不得顯示浮動放大鈕');
});

test('簽署視窗不預填職銜，示範資料只放純姓名', () => {
  const files = [
    'web/src/pages/BookFront.jsx',
    'web/src/pages/BookTraining.jsx',
    'web/src/components/Form.jsx',
    'web/src/components/SignoffPanel.jsx',
  ];
  for (const rel of files) {
    const src = fs.readFileSync(path.join(root, rel), 'utf8');
    assert.ok(!/defaultTitle=/.test(src), `${rel} 不得再預填職銜（defaultTitle）`);
  }
  const bookSrc = fs.readFileSync(path.join(root, 'shared/book.js'), 'utf8');
  assert.ok(!/const vslSig = \(at\) => \(\{[^}]*title:/.test(bookSrc), '示範簽名只放純姓名，不放職銜');
});

test('PWA 四處版本號同步，並具備主動查更新、更新提示與自動重載', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const bookSrc = fs.readFileSync(path.join(root, 'shared/book.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8');
  const sw = fs.readFileSync(path.join(root, 'web/public/sw.js'), 'utf8');

  // 1. 四處版本號必須一致：package.json / APP_VERSION / index.html meta / SW 快取名
  const appVer = /export const APP_VERSION = '([^']+)'/.exec(bookSrc)?.[1];
  assert.equal(appVer, `v${pkg.version}`, 'shared/book.js APP_VERSION 必須等於 package.json version');
  assert.ok(html.includes(`<meta name="app-version" content="${appVer}" />`), 'index.html meta app-version 必須同步');
  const cacheName = /const CACHE_NAME = '([^']+)'/.exec(sw)?.[1] || '';
  assert.ok(cacheName.includes(appVer), `SW 快取名須含版本號（現為 ${cacheName}），否則已安裝 APP 永遠收到舊版面`);

  // 2. 主動查更新：切回前景即 reg.update()
  assert.match(sw, /SKIP_WAITING/, 'SW 必須處理 SKIP_WAITING 訊息');
  const pwa = fs.readFileSync(path.join(root, 'web/src/pwa.js'), 'utf8');
  assert.match(pwa, /addEventListener\('visibilitychange'/, '必須註冊 visibilitychange 主動查更新');
  assert.match(pwa, /reg\.update\(\)/, '切回前景必須呼叫 reg.update()');
  assert.match(pwa, /controllerchange/, '必須監聽 controllerchange 自動重載');
  assert.match(pwa, /location\.reload\(\)/, 'controllerchange 後必須自動 location.reload()');

  // 3. 偵測到新版要彈出提示，按鈕送出 SKIP_WAITING
  const appSrc = fs.readFileSync(path.join(root, 'web/src/App.jsx'), 'utf8');
  assert.match(appSrc, /className="updatebar no-print"/, 'App.jsx 必須顯示更新提示');
  assert.match(pwa, /postMessage\(\{\s*type:\s*'SKIP_WAITING'\s*\}\)/, '按下更新必須 postMessage SKIP_WAITING');
});

test('BADGE progress-file controls require an authenticated session; BOOK backups remain separate and offline', () => {
  const card = fs.readFileSync(path.join(root, 'web/src/components/VsBadgeSyncCard.jsx'), 'utf8');
  assert.match(card, /const hasBadgeSession = Boolean\(session\?\.token && session\?\.ymis\)/);
  assert.match(card, /\{hasBadgeSession \? \([\s\S]*?onClick=\{onExportFile\}[\s\S]*?onChange=\{onImportFile\}/);
  assert.match(card, /vsbsync__locked/);
  assert.match(card, /下方「完整備份 JSON／還原備份 JSON」仍可完全離線使用/);
  assert.match(card, /const onExportFile = \(\) => \{\s*if \(!session\?\.token \|\| !session\?\.ymis\)/);
  assert.match(card, /const onImportFile = \(e\) => \{\s*if \(!session\?\.token \|\| !session\?\.ymis\)/);
  assert.doesNotMatch(card, /未連接[\s\S]{0,30}仍可用下方 JSON 檔與領袖交換進度/);

  const welcome = fs.readFileSync(path.join(root, 'web/src/pages/Welcome.jsx'), 'utf8');
  assert.match(welcome, /data\?\.member[\s\S]{0,100}data\?\.pages/);
  assert.match(welcome, /BADGE 進度檔不能在此還原[\s\S]*數位附錄/);
  assert.doesNotMatch(welcome, /importFromVsBadge/);

  const menu = fs.readFileSync(path.join(root, 'web/src/components/MenuDialog.jsx'), 'utf8');
  assert.doesNotMatch(menu, /importBadge|importFromVsBadge|vsRef/);
  assert.match(menu, /Number\(data\?\.version\) === 1[\s\S]*data\?\.member[\s\S]*data\?\.pages/);
});

test('BADGE troop selection, conditional onboarding links, refresh/manual fallback, icons and print behavior are contracted', () => {
  const card = fs.readFileSync(path.join(root, 'web/src/components/VsBadgeSyncCard.jsx'), 'utf8');
  assert.match(card, /upstreamOk/);
  assert.match(card, /已自動讀取 \$\{troopEntries\.length\} 個 BADGE 已登記旅團/);
  assert.match(card, /value="__NOT_FOUND__"/);
  assert.match(card, /troopEntries\.length === 0/);
  assert.match(card, /重新讀取旅團清單/);
  assert.match(card, /手動輸入旅團編號/);
  assert.match(card, /troopId !== '__NOT_FOUND__'[\s\S]*?BADGE 密碼/);
  assert.match(card, /target="_blank" rel="noopener noreferrer"/);
  assert.match(card, /href=\{badgeOrigin\}/);

  const ui = fs.readFileSync(path.join(root, 'web/src/ui.jsx'), 'utf8');
  assert.match(ui, /refresh:/);
  assert.match(ui, /external:/);
  const css = fs.readFileSync(path.join(root, 'web/src/styles.css'), 'utf8');
  for (const selector of ['.vsbsync__locked', '.vsbsync__notfound', '.vsbsync__refresh']) assert.ok(css.includes(selector));
  assert.match(css, /@media print[\s\S]*?\.vsbsync__locked,[\s\S]*?display: none !important/);
  assert.match(css, /\.vsbsync__locked[\s\S]*?background: #f7f2e7[\s\S]*?color: #1e1a14/);
});

test('BADGE bridge origin is documented consistently in deployment configuration', () => {
  const api = fs.readFileSync(path.join(root, 'api/vsbadge.js'), 'utf8');
  const env = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  for (const text of [api, env, readme]) assert.ok(text.includes('https://vsbadge.vercel.app'));
  assert.ok(env.includes('VSBADGE_ORIGIN=https://vsbadge.vercel.app'));
  assert.ok(readme.includes('`VSBADGE_ORIGIN`'));
});
