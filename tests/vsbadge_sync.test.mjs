import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {
  collectPendingForVsBadge,
  exportForVsBadge,
  importFromVsBadge,
  newBook,
} from '../shared/book.js';
import vsbadgeHandler, {
  filterPersonalConfirmedLoad,
  sanitizePendingSubmissions,
} from '../api/vsbadge.js';

function callHandler(reqInit) {
  return new Promise((resolve) => {
    const headers = {};
    let statusCode = 200;
    const req = {
      method: reqInit.method || 'GET',
      body: reqInit.body,
      headers: reqInit.headers || {},
    };
    const res = {
      setHeader(k, v) {
        headers[k.toLowerCase()] = v;
      },
      status(code) {
        statusCode = code;
        return this;
      },
      json(obj) {
        resolve({ status: statusCode, headers, body: obj });
      },
      end(str) {
        resolve({ status: statusCode, headers, body: JSON.parse(str) });
      },
    };
    vsbadgeHandler(req, res);
  });
}

test('BOOK → BADGE：成員新填進度只會變成 pendingRequests（待領袖核實），零個人資料', () => {
  const myBook = newBook({
    member: {
      nameZh: '王大文',
      nameEn: 'WONG Tai-man',
      scoutId: '25001122',
      hkidPrefix: 'Z123',
      phone: '91234567',
      email: 'tai.man@example.com',
      addressZh: '九龍柯士甸道童軍徑',
    },
    progress: {
      // 已在 vsbadge 核實的項目不應重複送交 pending
      'L1-ACT-01': { date: '2026-03-01', assessor: '領袖甲', confirmedByBadge: true },
      // 成員自己在 BOOK 新填的項目 -> 必須轉為 pending 待領袖核實
      'L2-REC-01': { date: '2026-09-15', assessor: '自填備忘' },
      'OT-FA': { date: '2026-10-02', cert: 'FA-8899' },
    },
  });

  const pendingItems = collectPendingForVsBadge(myBook);
  assert.equal(pendingItems.length, 2);
  assert.deepEqual(
    pendingItems.map((x) => x.itemId),
    ['L2-REC-01', 'OT-FA'],
  );

  const payload = exportForVsBadge(myBook, '0082');
  const rawStr = JSON.stringify(payload);
  assert.equal(payload.schema, 'vsbadge.pending.v1');
  assert.equal(payload.status, 'pending');
  assert.equal(payload.confirmed, false);
  assert.equal(payload.scoutId, '25001122');
  assert.equal(payload.pendingRequests.length, 2);
  assert.ok(payload.pendingRequests.every((x) => x.status === 'pending' && x.confirmed === false));

  // 嚴格驗證零個人資料外洩
  assert.equal(rawStr.includes('王大文'), false);
  assert.equal(rawStr.includes('WONG Tai-man'), false);
  assert.equal(rawStr.includes('91234567'), false);
  assert.equal(rawStr.includes('tai.man@example.com'), false);
  assert.equal(rawStr.includes('柯士甸道'), false);
  assert.equal(rawStr.includes('Z123'), false);
});

test('BADGE → BOOK：無條件相信領袖已核實資料，未核實（pending）一律不錄入，亦不複製其他成員或個人資料', () => {
  const localBook = newBook({
    member: {
      nameZh: '本機成員原名',
      scoutId: '81420', // 測試無前導零與 vsbadge 10 位 0000081420 自動對齊
    },
    progress: {
      // 成員之前在 BOOK 自填錯了日期，領袖在 BADGE 核實為 2026-08-20 -> 無條件以領袖核實為準
      'L1-UND-01': { date: '2026-08-01', assessor: '自己寫' },
    },
  });

  const vsbadgeCloudData = {
    members: [
      { ymis: '0000081420', name: '絕不可複製之姓名', email: 'pii@example.com', phone: '99998888' },
      { ymis: '0000099999', name: '另一位成員' },
    ],
    progress: {
      '0000099999': {
        'L4-PROJ-01': { date: '2026-07-01', confirmer: '領袖乙' },
      },
      '0000081420': {
        'L1-UND-01': { date: '2026-08-20', confirmer: '陳團長' },
        'L2-CAMP-01': { date: '2026-09-10', confirmer: '陳團長' },
        // 即使混在 progress 內，若標記 status: pending 或 confirmed: false 亦絕不錄入
        'L2-CAMP-02': { date: '2026-09-11', status: 'pending' },
        'L2-CAMP-03': { date: '2026-09-12', confirmed: false },
      },
    },
    otherBadges: {
      '0000081420': {
        'OT-ROVER-LINK': { date: '2026-10-05', cert: 'PR-2026' },
      },
    },
    pendingRequests: [
      { ymis: '0000081420', item_id: 'L3-PROJECT-01', requested_date: '2026-10-20', status: 'pending' },
    ],
  };

  const res = importFromVsBadge(vsbadgeCloudData, localBook);
  assert.equal(res.imported, 3); // L1-UND-01, L2-CAMP-01, OT-ROVER-LINK
  assert.equal(res.skippedPending, 3); // L2-CAMP-02, L2-CAMP-03, L3-PROJECT-01

  // 個人資料保持本機原狀，絕不從 vsbadge members 覆寫
  assert.equal(res.book.member.nameZh, '本機成員原名');
  assert.equal(res.book.member.email, '');

  // 無條件相信領袖核實資料
  assert.equal(res.book.progress['L1-UND-01'].date, '2026-08-20');
  assert.equal(res.book.progress['L1-UND-01'].assessor, '陳團長');
  assert.equal(res.book.progress['L1-UND-01'].confirmedByBadge, true);
  assert.equal(res.book.progress['L2-CAMP-01'].date, '2026-09-10');
  assert.equal(res.book.pages.p35.completedDate, '2026-10-05');

  // 未核實及他人資料一律不存在
  assert.equal(res.book.progress['L2-CAMP-02'], undefined);
  assert.equal(res.book.progress['L2-CAMP-03'], undefined);
  assert.equal(res.book.progress['L3-PROJECT-01'], undefined);
  assert.equal(res.book.progress['L4-PROJ-01'], undefined);
});

test('/api/vsbadge 伺服器守衛：嚴禁 save 直寫已核實進度（403），submitPending 強制轉為 requestComplete，load 剝除全團與個人資料', async () => {
  // 1. 嘗試直接呼叫 save / saveOtherBadge / reviewRequest 必須 403 攔截
  for (const forbiddenAction of ['save', 'saveOtherBadge', 'reviewRequest', 'addUser']) {
    const blocked = await callHandler({
      method: 'POST',
      body: { troopId: '0082', action: forbiddenAction, data: { token: 'tok12345' } },
    });
    assert.equal(blocked.status, 403);
    assert.equal(blocked.body.success, false);
  }

  // 2. 啟動本地模擬 vsbadge 伺服器驗證 load 與 submitPending -> requestComplete
  const upstreamCalls = [];
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => {
      raw += c;
    });
    req.on('end', () => {
      const parsed = raw ? JSON.parse(raw) : {};
      upstreamCalls.push({ url: req.url, method: req.method, body: parsed });
      res.setHeader('Content-Type', 'application/json');
      if (parsed.action === 'load') {
        res.end(
          JSON.stringify({
            success: true,
            members: [
              { ymis: '25081420', name: '張芷晴', email: 'secret@hksa.org' },
              { ymis: '25099999', name: '其他團員', email: 'other@hksa.org' },
            ],
            progress: {
              '25081420': { 'L1-ACT-01': { date: '2026-04-01', confirmer: '領袖王' } },
              '25099999': { 'L1-ACT-01': { date: '2026-04-02', confirmer: '領袖王' } },
            },
            otherBadges: {
              '25081420': { 'OT-FA': { date: '2026-05-03', cert: 'FA-01' } },
            },
            pendingRequests: [
              { ymis: '25081420', item_id: 'L2-B-01', requested_date: '2026-06-01', status: 'pending' },
              { ymis: '25099999', item_id: 'L2-B-02', requested_date: '2026-06-02', status: 'pending' },
            ],
          }),
        );
        return;
      }
      if (parsed.action === 'requestComplete') {
        res.end(JSON.stringify({ success: true, request_id: 'REQ-001', status: 'pending' }));
        return;
      }
      res.end(JSON.stringify({ success: false, error: 'unexpected action' }));
    });
  });

  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  const prevOrigin = process.env.VSBADGE_ORIGIN;
  const prevTestFlag = process.env.VSBOOK_PROXY_TEST;
  process.env.VSBOOK_PROXY_TEST = '1';
  process.env.VSBADGE_ORIGIN = `http://127.0.0.1:${port}`;

  try {
    // 測試 load：只回傳本人已核實進度與本人待批清單，完全剝除 members 及其他團員
    const loaded = await callHandler({
      method: 'POST',
      body: { troopId: '0082', action: 'load', data: { token: 'member_tok_123', ymis: '25081420' } },
    });
    assert.equal(loaded.status, 200);
    assert.equal(loaded.body.success, true);
    assert.equal('members' in loaded.body, false);
    assert.equal(JSON.stringify(loaded.body).includes('張芷晴'), false);
    assert.equal(JSON.stringify(loaded.body).includes('25099999'), false);
    assert.deepEqual(Object.keys(loaded.body.progress), ['25081420']);
    assert.equal(loaded.body.progress['25081420']['L1-ACT-01'].date, '2026-04-01');
    assert.equal(loaded.body.pendingRequests.length, 1);
    assert.equal(loaded.body.pendingRequests[0].item_id, 'L2-B-01');

    // 測試 submitPending：必須轉成上游 vsbadge 的 action: 'requestComplete'（待領袖核實）
    const submitted = await callHandler({
      method: 'POST',
      body: {
        troopId: '0082',
        action: 'submitPending',
        data: {
          token: 'member_tok_123',
          ymis: '25081420',
          items: [
            { itemId: 'L2-A-02', itemName: '營藝訓練', date: '2026-10-12', nameZh: '嘗試夾帶姓名' },
          ],
        },
      },
    });
    assert.equal(submitted.status, 200);
    assert.equal(submitted.body.success, true);
    assert.equal(submitted.body.status, 'pending');
    assert.equal(submitted.body.confirmed, false);
    assert.equal(submitted.body.submitted, 1);

    const lastCall = upstreamCalls.at(-1);
    assert.equal(lastCall.body.action, 'requestComplete');
    assert.equal(lastCall.body.data.itemId, 'L2-A-02');
    assert.equal(lastCall.body.data.requested_date, '2026-10-12');
    assert.equal('nameZh' in lastCall.body.data, false);
  } finally {
    if (prevOrigin === undefined) delete process.env.VSBADGE_ORIGIN;
    else process.env.VSBADGE_ORIGIN = prevOrigin;
    if (prevTestFlag === undefined) delete process.env.VSBOOK_PROXY_TEST;
    else process.env.VSBOOK_PROXY_TEST = prevTestFlag;
    await new Promise((r) => server.close(r));
  }

  // 直接單元測試 sanitizePendingSubmissions 與 filterPersonalConfirmedLoad
  assert.equal(sanitizePendingSubmissions([{ itemId: 'L1-A1', date: 'bad-date' }]).length, 0);
  assert.equal(filterPersonalConfirmedLoad({ success: true, progress: {} }, '').success, false);
});
