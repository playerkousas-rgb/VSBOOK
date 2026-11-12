import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PAGE_TOTAL,
  badgeStats,
  demoBook,
  exportForVsBadge,
  isDemoBook,
  newBook,
} from '../shared/book.js';
import { PT19_CHECKLIST, PT20_CHECKLIST, formReadiness } from '../shared/forms.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

function collectDemoSignatures(book) {
  const out = [];
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (typeof node.png === 'string' && typeof node.name === 'string') {
      out.push(node);
      return;
    }
    Object.values(node).forEach(walk);
  };
  walk(book);
  return out;
}

test('示範旗標：demoBook 標記 isDemo，空白冊不標記，還原備份後旗標保留', () => {
  assert.equal(isDemoBook(demoBook()), true);
  assert.equal(isDemoBook(newBook()), false);
  assert.equal(isDemoBook(null), false);

  const restored = newBook(JSON.parse(JSON.stringify(demoBook())));
  assert.equal(isDemoBook(restored), true);
  const realRestored = newBook(JSON.parse(JSON.stringify(newBook())));
  assert.equal(isDemoBook(realRestored), false);
});

test('示範資料達本支部最高獎章（榮譽童軍獎章）申請測試狀態：L4 全滿＋三表齊備', () => {
  const demo = demoBook();
  const l4 = badgeStats(demo, 'L4');
  assert.equal(l4.done, 4);
  assert.equal(l4.total, 4);
  assert.equal(l4.percent, 100);
  assert.equal(l4.awarded, '2026-11-10');

  // 多元技能金帶必須是兩個不同範疇
  assert.equal(demo.pages.p25.category, 'scoutcraft');
  assert.equal(demo.pages.p27.category, 'sport');
  assert.notEqual(demo.pages.p25.category, demo.pages.p27.category);
  assert.equal(demo.pages.p33.certNo, 'DSA-2026-0118');

  // 區／地域總監接見齊備（含簽署）
  for (const [page, nameKey, sigKey] of [['p31', 'dcName', 'dcSig'], ['p32', 'rcName', 'rcSig']]) {
    assert.ok(demo.pages[page][nameKey], `${page} 須有接見人姓名`);
    assert.ok(demo.pages[page][sigKey]?.png, `${page} 須有接見簽署`);
  }

  for (const formId of ['pt65', 'pt19', 'pt20']) {
    const check = formReadiness(demo, formId);
    assert.equal(check.ready, true, `${formId} 應齊備可印，尚缺：${check.missing.join('、')}`);
  }
});

test('示範簽名絕不冒用真實簽名：全部為程式產生的抽象墨跡，且署名與簽署人一致', () => {
  const sigs = collectDemoSignatures(demoBook());
  assert.ok(sigs.length >= 10, `示範冊應有多個簽署，實得 ${sigs.length} 個`);
  for (const s of sigs) {
    assert.match(s.png, /^data:image\/svg\+xml/, `簽署 ${s.name} 必須是程式產生的 SVG 墨跡，不可是真實簽名影像`);
    assert.ok(s.name && s.name.trim().length >= 2, '簽署須有純姓名');
  }
  // 領袖簽署只放純姓名（已有舊測試守 vslSig 形狀，此處守內容）
  for (const s of sigs) {
    assert.ok(!s.title, '示範簽名不可附帶職銜');
  }
});

test('虛構示範資料禁止同步至正式系統：匯出即擲回錯誤', () => {
  assert.throws(() => exportForVsBadge(demoBook(), 'HKI-28'), /示範樣本不可同步至正式系統/);
  const real = newBook({
    member: { scoutId: '25081420' },
    progress: { 'L1-ACT-01': { date: '2026-10-01' } },
  });
  const exported = exportForVsBadge(real, 'HKI-28');
  assert.equal(exported.schema, 'vsbadge.pending.v1');
  assert.equal(exported.pendingRequests.length, 1);
});

test('同步卡封鎖示範送交：警告框＋停用送出／匯出按鈕', () => {
  const card = src('web/src/components/VsBadgeSyncCard.jsx');
  assert.match(card, /isDemoBook/);
  assert.match(card, /const demoBlocked = isDemoBook\(book\)/);
  assert.match(card, /示範樣本不可送交正式系統/);
  assert.match(card, /示範樣本不可匯出至正式系統/);
  assert.match(card, /className="vsbsync__demo"/);
  assert.match(card, /disabled=\{busy \|\| pendingToSubmit\.length === 0 \|\| demoBlocked\}/);
  assert.match(card, /<button type="button" className="btn btn--ghost btn--sm" disabled=\{demoBlocked\} onClick=\{onExportFile\}>/);
  const css = src('web/src/styles.css');
  assert.match(css, /\.vsbsync__demo\s*\{/);
});

test('表格示範蓋印：三張表共 7 頁每頁標示「示範樣本，只供測試，不可遞交」', () => {
  const forms = src('web/src/pages/Forms.jsx');
  assert.ok(forms.includes('示範樣本，只供測試，不可遞交'));
  const stamps = forms.match(/<DemoStamp \/>/g) || [];
  assert.equal(stamps.length, 5, `DemoStamp 須出現 5 次（PT65×1＋PT19 首頁×1＋PT20 首頁×1＋共用背面×1＋共用清單×1），實得 ${stamps.length} 次`);
  assert.match(forms, /function DemoStamp\(\) \{[\s\S]*?if \(!isDemoBook\(book\)\) return null;/);
  assert.match(forms, /formcard__demo/);

  const css = src('web/src/styles.css');
  const stampRule = /\.demostamp\s*\{[^}]*\}/.exec(css);
  assert.ok(stampRule, 'styles.css 須有 .demostamp 規則');
  assert.match(stampRule[0], /border:/, '蓋印須用邊框呈現，關閉背景列印仍清晰');
  assert.match(css, /\.formcard__demo\s*\{/);
});

test('跨 BOOK 文案稽核：目錄分組逐頁對應紙本第 1–40 頁，無外來頁數', () => {
  const front = src('web/src/pages/BookFront.jsx');
  const groups = [...front.matchAll(/ids: \[([^\]]+)\]/g)].map((m) =>
    [...m[1].matchAll(/'(p\d\d|appendix)'/g)].map((x) => x[1]),
  );
  assert.equal(groups.length, 5, '目錄須有 5 組');
  const flat = groups.flat();
  const numbered = flat.filter((id) => id !== 'appendix');
  assert.deepEqual(numbered, Array.from({ length: 40 }, (_, i) => `p${String(i + 1).padStart(2, '0')}`));
  assert.equal(PAGE_TOTAL, 40);

  const menu = src('web/src/components/MenuDialog.jsx');
  assert.ok(menu.includes('40 頁一次過'), '列印選單「40 頁一次過」須與 PAGE_TOTAL=40 一致');
});

test('跨 BOOK 文案稽核：表格查閱清單頁碼對照只引用本冊第 1–40 頁', () => {
  const pageRefs = (text) => [...text.matchAll(/第\s*(\d+)/g)].map((m) => Number(m[1]));
  for (const row of [...PT19_CHECKLIST, ...PT20_CHECKLIST]) {
    for (const n of pageRefs(row.zh)) {
      assert.ok(n >= 1 && n <= 40, `查閱清單「${row.zh}」引用第 ${n} 頁，超出本冊 1–40`);
    }
  }
  const pt19Range = PT19_CHECKLIST.find((r) => r.key === 'p14_20');
  assert.match(pt19Range.zh, /第 14 至 20 頁/);
  const pt20Range = PT20_CHECKLIST.find((r) => r.key === 'p21_33');
  assert.match(pt20Range.zh, /第 21 至 33 頁/);

  // 表格就緒提示引用的內頁必須全部落在 1–40
  for (const n of pageRefs(src('shared/forms.js'))) {
    assert.ok(n >= 1 && n <= 40, `shared/forms.js 引用第 ${n} 頁，超出本冊 1–40`);
  }
});

test('跨 BOOK 文案稽核：web／shared 不得沿用 SCOUTBOOK／CUBBOOK 文案或頁數', () => {
  const hits = [];
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        walk(full);
      } else if (/\.(js|jsx|css)$/.test(ent.name)) {
        const text = fs.readFileSync(full, 'utf8');
        if (/scoutbook|cubbook/i.test(text)) hits.push(path.relative(root, full));
      }
    }
  };
  walk(path.join(root, 'web'));
  walk(path.join(root, 'shared'));
  assert.deepEqual(hits, [], '不得出現 SCOUTBOOK／CUBBOOK 沿用文案');
});
