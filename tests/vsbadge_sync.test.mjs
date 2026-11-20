import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {
  collectPendingForVsBadge,
  exportForVsBadge,
  formatServiceRecordText,
  importFromVsBadge,
  newBook,
} from '../shared/book.js';
import vsbadgeHandler, {
  filterPersonalConfirmedLoad,
  filterPersonalServiceRecords,
  sanitizePendingSubmissions,
  resolveVsBadgeOrigin,
  DEFAULT_VSBADGE_ORIGIN,
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


test('BADGE defaults to its deployed origin and GET filters disconnected troops and aliases while reporting upstreamOk', async () => {
  const previousOrigin = process.env.VSBADGE_ORIGIN;
  const previousTestFlag = process.env.VSBOOK_PROXY_TEST;
  delete process.env.VSBADGE_ORIGIN;
  assert.equal(DEFAULT_VSBADGE_ORIGIN, 'https://vsbadge.vercel.app');
  assert.equal(resolveVsBadgeOrigin(), 'https://vsbadge.vercel.app');

  const server = http.createServer((req, res) => {
    assert.equal(req.url, '/api/troops');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ troops: {
      '82': { name: '82nd Group' },
      '0082': { name: 'Alias group', _aliasOf: '82' },
      '99': { name: 'Closed group', connected: false },
      '101': { name: 'Registered group', en: '101st Group' },
    } }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  process.env.VSBOOK_PROXY_TEST = '1';
  process.env.VSBADGE_ORIGIN = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await callHandler({ method: 'GET' });
    assert.equal(response.status, 200);
    assert.equal(response.body.origin, process.env.VSBADGE_ORIGIN);
    assert.equal(response.body.upstreamOk, true);
    assert.deepEqual(Object.keys(response.body.troops), ['82', '101']);
    assert.equal(response.body.troops['0082'], undefined);
    assert.equal(response.body.troops['99'], undefined);
  } finally {
    if (previousOrigin === undefined) delete process.env.VSBADGE_ORIGIN;
    else process.env.VSBADGE_ORIGIN = previousOrigin;
    if (previousTestFlag === undefined) delete process.env.VSBOOK_PROXY_TEST;
    else process.env.VSBOOK_PROXY_TEST = previousTestFlag;
    await new Promise((resolve) => server.close(resolve));
  }
});

test('服務紀錄：代理層以 getServiceRecords 讀取並清洗為零個人資料（排除 rejected），load 不含服務紀錄', async () => {
  const cleaned = filterPersonalServiceRecords({
    success: true,
    records: [
      {
        id: 'SRV_1',
        activity: '賣旗日服務',
        date: '2026-10-10',
        hours: '3',
        place: '旺角',
        status: 'approved',
        name: '陳小狼',
        ymis: '25081420',
        note: '內部備註不可外流',
        detail: '私隱內容',
      },
      { id: 'SRV_2', activity: '已拒絕項目', date: '2026-10-11', hours: 2, status: 'rejected' },
      { id: 'SRV_3', activity: '待領袖核實項目', date: '2026-10-12', status: 'pending' },
      { id: 'SRV_4', activity: '', date: '', status: 'approved' },
      { id: 'SRV_5', activity: '植樹日', date: '2026-11-01', hours: 0, place: '' },
    ],
  });
  assert.deepEqual(cleaned, [
    { id: 'SRV_1', activity: '賣旗日服務', date: '2026-10-10', hours: 3, place: '旺角' },
    { id: 'SRV_5', activity: '植樹日', date: '2026-11-01' },
  ]);
  // 零個人資料：只留 id / activity / date / hours / place
  const raw = JSON.stringify(cleaned);
  for (const pii of ['陳小狼', '25081420', '內部備註', '私隱內容', 'rejected', 'pending']) {
    assert.equal(raw.includes(pii), false, `服務紀錄不得包含 ${pii}`);
  }

  // 失敗／格式異常一律安全降級為空陣列（不影響進度讀取）
  assert.deepEqual(filterPersonalServiceRecords(null), []);
  assert.deepEqual(filterPersonalServiceRecords({ success: false, error: '未升級' }), []);
  assert.deepEqual(filterPersonalServiceRecords({ success: true }), []);

  // ------------------------------------------------------------------
  // 代理層：load 同步呼叫上游 getServiceRecords（load 本身不含服務紀錄）
  const upstreamCalls = [];
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => {
      raw += c;
    });
    req.on('end', () => {
      const parsed = raw ? JSON.parse(raw) : {};
      upstreamCalls.push(parsed);
      res.setHeader('Content-Type', 'application/json');
      if (parsed.action === 'load') {
        // 舊版／現行上游 load 只回進度與活動徽章，不會回傳服務紀錄
        res.end(
          JSON.stringify({
            success: true,
            progress: { '25081420': { 'L1-ACT-01': { date: '2026-04-01', confirmer: '領袖王' } } },
            otherBadges: {},
            pendingRequests: [],
            members: [{ ymis: '25081420', name: '張芷晴', email: 'secret@hksa.org' }],
          }),
        );
        return;
      }
      if (parsed.action === 'getServiceRecords') {
        res.end(
          JSON.stringify({
            success: true,
            records: [
              { id: 'SRV_1', activity: '賣旗日服務', date: '2026-10-10', hours: 3, place: '旺角', status: 'approved', name: '張芷晴' },
              { id: 'SRV_2', activity: '已拒絕', date: '2026-10-11', status: 'rejected' },
            ],
          }),
        );
        return;
      }
      res.end(JSON.stringify({ success: false, error: 'unexpected action' }));
    });
  });

  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const prevOrigin = process.env.VSBADGE_ORIGIN;
  const prevTestFlag = process.env.VSBOOK_PROXY_TEST;
  process.env.VSBOOK_PROXY_TEST = '1';
  process.env.VSBADGE_ORIGIN = `http://127.0.0.1:${server.address().port}`;

  try {
    const loaded = await callHandler({
      method: 'POST',
      body: { troopId: '0082', action: 'load', data: { token: 'member_tok_123', ymis: '25081420' } },
    });
    assert.equal(loaded.status, 200);
    assert.equal(loaded.body.success, true);

    // 必須以獨立 action 讀取服務紀錄，並帶上 target_ymis
    const serviceCall = upstreamCalls.find(
      (c) => c.action === 'getServiceRecords' || c.data?.action === 'getServiceRecords',
    );
    assert.ok(serviceCall, 'load 必須同步呼叫 getServiceRecords');
    const serviceData = serviceCall.data || serviceCall;
    assert.equal(serviceData.target_ymis, '25081420');
    assert.equal(serviceData.token, 'member_tok_123');

    assert.deepEqual(loaded.body.serviceRecords, [
      { id: 'SRV_1', activity: '賣旗日服務', date: '2026-10-10', hours: 3, place: '旺角' },
    ]);
    const bodyStr = JSON.stringify(loaded.body);
    assert.equal(bodyStr.includes('張芷晴'), false);
    assert.equal(bodyStr.includes('secret@hksa.org'), false);
    assert.equal(bodyStr.includes('已拒絕'), false);
    assert.equal(loaded.body.progress['25081420']['L1-ACT-01'].date, '2026-04-01');

    // 上游 getServiceRecords 失敗（如舊版後端回 Unknown action）時安全降級為 []
    upstreamCalls.length = 0;
    const failServer = http.createServer((req, res) => {
      let raw = '';
      req.on('data', (c) => {
        raw += c;
      });
      req.on('end', () => {
        const parsed = raw ? JSON.parse(raw) : {};
        res.setHeader('Content-Type', 'application/json');
        if (parsed.action === 'load') {
          res.end(JSON.stringify({ success: true, progress: {}, otherBadges: {}, pendingRequests: [] }));
          return;
        }
        res.end(JSON.stringify({ success: false, error: 'Unknown action' }));
      });
    });
    await new Promise((r) => failServer.listen(0, '127.0.0.1', r));
    process.env.VSBADGE_ORIGIN = `http://127.0.0.1:${failServer.address().port}`;
    try {
      const degraded = await callHandler({
        method: 'POST',
        body: { troopId: '0082', action: 'load', data: { token: 'member_tok_123', ymis: '25081420' } },
      });
      assert.equal(degraded.status, 200);
      assert.equal(degraded.body.success, true);
      assert.deepEqual(degraded.body.serviceRecords, []);
    } finally {
      await new Promise((r) => failServer.close(r));
    }
  } finally {
    if (prevOrigin === undefined) delete process.env.VSBADGE_ORIGIN;
    else process.env.VSBADGE_ORIGIN = prevOrigin;
    if (prevTestFlag === undefined) delete process.env.VSBOOK_PROXY_TEST;
    else process.env.VSBOOK_PROXY_TEST = prevTestFlag;
    await new Promise((r) => server.close(r));
  }
});

test('服務紀錄：匯入 BOOK 只附加唯讀副本、按 badgeRecordId 及 date|text 去重，不覆蓋本機手寫紀錄', () => {
  assert.equal(formatServiceRecordText({ activity: '賣旗日服務', hours: 3, place: '旺角' }), '賣旗日服務（3小時） · 旺角');
  assert.equal(formatServiceRecordText({ activity: '植樹日' }), '植樹日');
  assert.equal(formatServiceRecordText(null), '');

  const book = newBook({
    member: { scoutId: '00123456' },
    pages: { p23: { summary: '本機手寫的服務內容簡述，絕不可被覆蓋' } },
  });
  book.serviceRecords = [{ date: '2026-09-01', text: '本機手寫服務紀錄' }];

  const payload = {
    success: true,
    progress: {},
    otherBadges: {},
    serviceRecords: [
      { id: 'SRV_1', activity: '賣旗日服務', date: '2026-10-10', hours: 3, place: '旺角' },
      { activity: '植樹日', date: '2026-11-01' },
      { id: 'SRV_REJ', activity: '已拒絕項目', date: '2026-11-02', status: 'rejected' },
    ],
  };

  const res1 = importFromVsBadge(payload, book);
  assert.equal(res1.importedServices, 2);
  assert.equal(res1.book.serviceRecords.length, 3);
  assert.equal(res1.book.serviceRecords[0].text, '本機手寫服務紀錄');
  assert.equal(res1.book.serviceRecords[1].badgeRecordId, 'SRV_1');
  assert.equal(res1.book.serviceRecords[1].date, '2026-10-10');
  assert.equal(res1.book.serviceRecords[1].hours, 3);
  assert.equal(res1.book.serviceRecords[1].place, '旺角');
  assert.equal(res1.book.serviceRecords[1].confirmedByBadge, true);
  assert.match(res1.book.serviceRecords[1].text, /賣旗日服務.*3小時.*旺角/);
  assert.equal(res1.book.serviceRecords.some((r) => /已拒絕/.test(r.text)), false);
  // 本機手寫紀錄與頁面文字原封不動
  assert.equal(res1.book.pages.p23.summary, '本機手寫的服務內容簡述，絕不可被覆蓋');
  assert.equal(res1.book.meta.lastServiceSyncAt !== undefined, true);

  // 重複同步不會產生重複行（badgeRecordId 與 date|text 兩重去重）
  const res2 = importFromVsBadge(payload, res1.book);
  assert.equal(res2.importedServices, 0);
  assert.equal(res2.book.serviceRecords.length, 3);

  // 同一筆以不同 id 再次出現（BADGE 重建紀錄）時，以 date|text 判重
  const res3 = importFromVsBadge(
    { progress: {}, serviceRecords: [{ id: 'SRV_NEW_ID', activity: '賣旗日服務', date: '2026-10-10', hours: 3, place: '旺角' }] },
    res1.book,
  );
  assert.equal(res3.importedServices, 0);
  assert.equal(res3.book.serviceRecords.length, 3);

  // 只帶服務紀錄、暫無進度更新的回應亦可匯入
  const res4 = importFromVsBadge(
    {
      serviceRecords: [{ id: 'SRV_9', activity: '長者中心探訪', date: '2026-11-10', hours: 2, place: '灣仔' }],
    },
    newBook({ member: { scoutId: '00123456' } }),
  );
  assert.equal(res4.importedServices, 1);
  assert.equal(res4.imported, 0);

  // 服務紀錄絕不外流：BOOK → BADGE 的申報／匯出一律不含服務紀錄
  const pending = exportForVsBadge(res1.book, '0082');
  assert.equal(JSON.stringify(pending).includes('賣旗日服務'), false);
  assert.equal('serviceRecords' in pending, false);
});

test('服務紀錄介面：第 23 頁與數位附錄只讀顯示（含空狀態），同步提示顯示服務紀錄筆數', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

  const training = read('web/src/pages/BookTraining.jsx');
  // 第 23 頁（社會服務金帶）必須掛上唯讀服務紀錄表
  assert.match(training, /<ServiceRecordsPanel \/>/, '第 23 頁必須顯示服務紀錄唯讀表');
  assert.match(training, /serviceRecords/, '服務紀錄表必須讀取 book.serviceRecords');
  assert.match(training, /（唯讀）/, '服務紀錄表須標明唯讀');
  assert.match(training, /仍須由領袖在 BADGE 內核實/, '必須聲明成員自填服務紀錄仍須領袖核實');
  assert.match(training, /尚未錄入服務紀錄/, '必須有空狀態提示');

  const card = read('web/src/components/VsBadgeSyncCard.jsx');
  // 同步提示必須顯示已錄入的服務紀錄筆數（雲端同步及檔案匯入兩條路徑）
  const noticeCount = (card.match(/筆服務紀錄/g) || []).length;
  assert.ok(noticeCount >= 2, '連接同步及匯入進度檔的提示都要顯示服務紀錄筆數');
  assert.match(card, /importedServices/, '提示必須引用 importFromVsBadge 回傳的 importedServices');
  assert.match(card, /vsbsync__services/, '同步卡必須顯示服務紀錄區塊');

  const css = read('web/src/styles.css');
  for (const sel of ['.svcrecs', '.vsbsync__servicelist', '.vsbsync__servicedate']) {
    assert.ok(css.includes(sel), `缺少樣式 ${sel}`);
  }
});
