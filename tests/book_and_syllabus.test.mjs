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

test('與 vsbadge 純進度同步：BOOK 匯出一律為待核實（pending）、BADGE 匯入只信領袖已核實且零個人資料', () => {
  const demo = demoBook();
  const exported = exportForVsBadge(demo, 'HKI-28');
  assert.equal(exported.schema, 'vsbadge.pending.v1');
  assert.equal(exported.status, 'pending');
  assert.equal(exported.confirmed, false);
  assert.equal(exported.privacy, 'progress-only');
  assert.equal('members' in exported, false);
  assert.equal('progress' in exported, false);
  assert.ok(exported.pendingRequests.some((r) => r.item_id === 'L1-ACT-01' && r.status === 'pending'));

  // 待領袖核實檔不可倒灌當成已核實進度
  const blank = newBook({
    member: { scoutId: '25081420' },
    progress: {
      'L1-ACT-01': { date: '2025-09-30', assessor: '原團長', signature: { png: 'data:image/png;base64,AAA' } },
    },
  });
  assert.throws(() => importFromVsBadge(exported, blank), /待領袖核實/);

  // 模擬 vsbadge 領袖已核實資料（夾雜個人資料與 pendingRequests 未核實資料）
  const vsbadgePayload = {
    members: [{ ymis: '25081420', name: '張芷晴', en: 'CHEUNG Tsz-ching', email: 'secret@example.com' }],
    progress: {
      '25081420': {
        'L1-ACT-01': { date: '2025-10-18', confirmer: '陳志豪 VSL' },
        'L2-CAMP-01': { date: '2026-02-01', confirmer: '陳志豪 VSL' },
        'OT-FA': { date: '2026-05-03', confirmer: '陳志豪 VSL' },
      },
    },
    pendingRequests: [
      { ymis: '25081420', item_id: 'L3-PROJECT-01', requested_date: '2026-10-01', status: 'pending' },
    ],
  };

  const res = importFromVsBadge(vsbadgePayload, blank);
  assert.equal(res.imported, 3);
  assert.equal(res.skippedPending, 1);
  // 絕不錄入個人資料
  assert.equal(res.book.member.nameZh, '');
  // 無條件相信領袖在 vsbadge 核實的日期與核實者，同時保留本機既有領袖手寫簽名墨跡
  assert.equal(res.book.progress['L1-ACT-01'].date, '2025-10-18');
  assert.equal(res.book.progress['L1-ACT-01'].assessor, '陳志豪 VSL');
  assert.equal(res.book.progress['L1-ACT-01'].confirmedByBadge, true);
  assert.ok(res.book.progress['L1-ACT-01'].signature.png);
  // 未核實（pending）項目絕不錄入
  assert.equal(res.book.progress['L3-PROJECT-01'], undefined);
  assert.equal(res.book.pages.p34.faCompletedDate, '2026-05-03');
  assert.equal(APP_VERSION, 'v1.0.0');
});
