import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APP_VERSION,
  BADGE_SYLLABUS,
  OTHER_BADGES,
  ITEM_INDEX,
  SECTIONS,
  PRINT_PAGES,
  PAGE_TOTAL,
  newBook,
  demoBook,
  scoutId,
  syncIdentity,
  sanitizeHkidPrefix,
  badgeStats,
  allStats,
  exportForVsBadge,
  importFromVsBadge,
} from '../shared/book.js';

test('紙本第 1–40 頁逐頁映射完整無缺漏與重覆', () => {
  assert.equal(PAGE_TOTAL, 40);
  assert.equal(PRINT_PAGES.length, 40);
  const pageNos = PRINT_PAGES.map((s) => s.page);
  assert.deepEqual(
    pageNos,
    Array.from({ length: 40 }, (_, i) => i + 1),
  );
  const ids = new Set(SECTIONS.map((s) => s.id));
  assert.equal(ids.size, SECTIONS.length);
});

test('2026 年第十一版深資童軍訓練綱要四階與其他獎章索引齊備', () => {
  assert.deepEqual(
    BADGE_SYLLABUS.map((b) => b.id),
    ['L1', 'L2', 'L3', 'L4'],
  );
  assert.ok(OTHER_BADGES.length >= 25);
  assert.ok(ITEM_INDEX['L1-ACT-01']);
  assert.ok(ITEM_INDEX['L1-CP-01']);
  assert.ok(ITEM_INDEX['L2-REC-10']);
  assert.ok(ITEM_INDEX['L2-FA-03']);
  assert.ok(ITEM_INDEX['L3-PROJECT-01']);
  assert.ok(ITEM_INDEX['L3-SERVICE-01']);
  assert.ok(ITEM_INDEX['L3-ACT-V11-PIONEERING']);
  assert.ok(ITEM_INDEX['L3-EXP-V11-HIKING']);
  assert.ok(ITEM_INDEX['L4-PROJ-01']);
  assert.ok(ITEM_INDEX['L4-SERV-01']);
  assert.ok(ITEM_INDEX['L4-ACT-V11-SPORT-2X20']);
  assert.ok(ITEM_INDEX['L4-EXP-V11-HIKING']);
  assert.ok(ITEM_INDEX['OT-FA']);
  assert.ok(ITEM_INDEX['OT-ROVER-LINK']);
});

test('SCOUT ID 單一真相與香港身份證首四碼私隱截斷', () => {
  const m = syncIdentity({ ymis: '25009911' });
  assert.equal(m.scoutId, '25009911');
  assert.equal(m.memberNo, '25009911');
  assert.equal('ymis' in m, false);
  assert.equal(scoutId({ member: m }), '25009911');

  assert.equal(sanitizeHkidPrefix('y418923(7)'), 'Y418');
  const b = newBook({ member: { hkidPrefix: 'a1234567' } });
  assert.equal(b.member.hkidPrefix, 'A123');
});

test('深資童軍肩章豁免規則與示範紀錄冊四階統計', () => {
  const demo = demoBook();
  const s = allStats(demo);
  assert.equal(s.badges[0].done, 12);
  assert.equal(s.badges[0].percent, 100);
  assert.equal(s.badges[1].done, 23);
  assert.equal(s.badges[1].percent, 100);
  assert.equal(s.badges[2].done, 4);
  assert.equal(s.badges[2].percent, 100);

  // 測試深資童軍先修章 + 童軍標準獎章豁免肩章甲乙部
  const exemptBook = newBook({
    pages: {
      p11: { linkCertNo: 'VSLINK-01' },
      p12: { standardCertNo: 'STD-02' },
    },
  });
  const l2 = badgeStats(exemptBook, 'L2');
  assert.equal(l2.exemptA, true);
  assert.equal(l2.exemptB, true);
  assert.equal(l2.done, 23);
  assert.equal(l2.percent, 100);
});

test('與 vsbadge 雙向匯出匯入進度且不覆蓋既有領袖簽名', () => {
  const demo = demoBook();
  const exported = exportForVsBadge(demo, 'HKI-28');
  assert.equal(exported.schema, 'vsbadge.progress.v1');
  assert.equal(exported.progress['25081420']['L1-ACT-01'], '2025-10-18');
  assert.equal(exported.badges.L3, '2026-09-12');

  const blank = newBook({
    member: { scoutId: '25081420' },
    progress: {
      'L1-ACT-01': { date: '2025-09-30', assessor: '原團長', signature: { png: 'data:image/png;base64,AAA' } },
    },
  });
  const res = importFromVsBadge(exported, blank);
  assert.ok(res.imported >= 38);
  assert.equal(res.book.member.nameZh, '張芷晴');
  // 既有簽名與日期必須保留不被覆蓋
  assert.equal(res.book.progress['L1-ACT-01'].date, '2025-09-30');
  assert.equal(res.book.progress['L1-ACT-01'].assessor, '原團長');
  assert.ok(res.book.progress['L1-ACT-01'].signature.png);
  assert.equal(res.book.pages.p34.faCompletedDate, '2026-05-03');
  assert.equal(APP_VERSION, 'v1.0.0');
});
