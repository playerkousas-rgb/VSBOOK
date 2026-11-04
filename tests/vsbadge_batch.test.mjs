import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {
  demoBook,
  newBook,
  exportProgressOnlyForVsBadge,
  parseVsBadgeRoster,
  mergeMemberPayloadIntoRoster,
  rosterMemberStats,
  buildVsBadgeBatchPayload,
} from '../shared/book.js';
import {
  QR_LIMIT,
  encodeTransfer,
  decodeTransfer,
  encodeBatchSignoff,
  decodePayload,
  applySignoff,
} from '../shared/transfer.js';
import vsbadgeHandler, {
  sanitizeLoadResponse,
  sanitizeSaveChanges,
} from '../api/vsbadge.js';

test('純進度匯出與批次匯出嚴格不含任何個人資料（不錄入個人資料，只錄入進度）', () => {
  const demo = demoBook();
  const single = exportProgressOnlyForVsBadge(demo, '0082');
  assert.equal(single.privacy, 'progress-only');
  assert.equal(single.schema, 'vsbadge.progress.v1');
  assert.equal(single.progress['25081420']['L1-ACT-01'], '2025-10-18');
  assert.equal('members' in single, false);

  const rawSingle = JSON.stringify(single);
  for (const forbidden of [
    demo.member.nameZh,
    demo.member.nameEn,
    demo.member.phone,
    demo.member.email,
    demo.member.addressZh,
    demo.member.hkidPrefix,
    demo.member.emergencyName,
    demo.member.emergencyPhone,
  ]) {
    if (forbidden) {
      assert.equal(rawSingle.includes(forbidden), false, `Progress-only export leaked ${forbidden}`);
    }
  }

  const batch = buildVsBadgeBatchPayload({
    troopId: '0082',
    confirmer: '陳志軒',
    scoutIds: ['25081420', '26001234'],
    itemIds: ['L1-ETQ-01', 'L2-HIKE-02', 'OT-FA'],
    date: '2026-11-05',
  });
  assert.equal(batch.changes.length, 4); // 2 人 × 2 項 L1/L2
  assert.equal(batch.otherBadgeRecords.length, 2); // 2 人 × 1 項 OT-FA
  assert.equal(batch.json.privacy, 'progress-only');
  assert.equal('members' in batch.json, false);
  assert.equal(batch.json.progress['26001234']['L2-HIKE-02'], '2026-11-05');
});

test('vsbadge 全團進度解析、四階統計及純進度成員 QR 併入名單', async () => {
  const mockCloudLoad = {
    success: true,
    members: [
      { ymis: '0025081420', name: '張芷晴', role: 'member', email: 'secret@example.com', phone: '91234567' },
      { ymis: '0026001234', name: '李俊傑', role: 'exec_committee', address: '九龍某處' },
      { ymis: '', name: '團長帳號', role: 'branch_leader', email: 'vsl@example.com' },
    ],
    flatProgress: {
      '0025081420': { 'L1-ACT-01': '2026-09-01', 'L1-UND-01': '2026-09-08' },
      '0026001234': { 'L1-ACT-01': '2026-10-01' },
    },
    otherBadges: {
      '0025081420': { 'OT-FA': { date: '2026-10-15', cert: 'FA-99' } },
    },
  };

  const parsed = parseVsBadgeRoster(mockCloudLoad);
  assert.equal(parsed.members.length, 2);
  assert.equal('email' in parsed.members[0], false);
  assert.equal('phone' in parsed.members[0], false);
  assert.equal('address' in parsed.members[1], false);

  const stats0 = rosterMemberStats(parsed.members[0].progress, parsed.members[0].otherBadges);
  assert.equal(stats0.l1.done, 2);
  assert.equal(stats0.otDone, 1);

  // 成員只剔選 ['progress'] 出示純進度 QR：零姓名、零聯絡資料，仍帶有 scoutId 供領袖併入名單
  const demo = demoBook();
  const qr = await encodeTransfer(demo, ['progress']);
  const decoded = await decodeTransfer(qr.value);
  assert.equal(decoded.member, undefined);
  assert.equal(decoded.contact, undefined);
  assert.equal(decoded.photo, undefined);
  assert.equal(decoded.scoutId, '25081420');

  const merged = mergeMemberPayloadIntoRoster(parsed.members, decoded);
  // 0025081420 與 25081420 自動視為同一成員合併，不重複新增列
  assert.equal(merged.roster.length, 2);
  const target = merged.roster.find((m) => m.scoutId === '0025081420');
  assert.equal(target.progress['L1-CP-01'], demo.progress['L1-CP-01'].date);
});

test('領袖「一簽簽發所有成員」通用回傳二維碼：單一 QR 簽發全團並驗證成員編號', async () => {
  const twentyFiveIds = [
    '25081420',
    '26001234',
    ...Array.from({ length: 23 }, (_, i) => String(26010000 + i)),
  ];

  const batchQr = await encodeBatchSignoff({
    targets: twentyFiveIds,
    leader: {
      name: '陳志軒',
      title: '深資童軍團長',
      at: '2026-11-05',
      png: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==',
    },
    items: [
      { id: 'L1-ETQ-04', date: '2026-11-05' },
      { id: 'L2-CAMP-01', date: '2026-11-05' },
      { id: 'OT-FA', date: '2026-11-05' },
    ],
  });

  assert.equal(batchQr.tooBig, false);
  assert.ok(batchQr.chars < QR_LIMIT, `Batch QR chars ${batchQr.chars} must fit under ${QR_LIMIT}`);

  const payload = await decodePayload(batchQr.value);
  assert.equal(payload.batch, true);
  assert.equal(payload.member, undefined); // 不含任何成員姓名或個人資料
  assert.equal(payload.targets.length, 25);

  // 成員一：直接相符
  const book1 = newBook({ member: { scoutId: '25081420', nameZh: '張芷晴' } });
  const res1 = applySignoff(book1, payload);
  assert.equal(res1.changes.length, 3);
  assert.equal(res1.book.progress['L1-ETQ-04'].assessor, '陳志軒');
  assert.equal(res1.book.pages.p34.faCompletedDate, '2026-11-05');

  // 成員二：10 位補零 YMIS 亦能自動相符同一張通用 QR
  const book2 = newBook({ member: { scoutId: '0026001234', nameZh: '李俊傑' } });
  const res2 = applySignoff(book2, payload);
  assert.equal(res2.changes.length, 3);
  assert.ok(res2.book.progress['L2-CAMP-01'].signature.png);

  // 未在名單內的成員：拒絕寫入
  const outsider = newBook({ member: { scoutId: '99999999' } });
  assert.throws(() => applySignoff(outsider, payload), /未包含你的 SCOUT ID/);
});

test('api/vsbadge.js 嚴格限制白名單進度動作並剝除個人私隱欄位', async () => {
  const cleanedLoad = sanitizeLoadResponse({
    success: true,
    members: [
      {
        ymis: '1234567890',
        name: '王小明',
        role: 'member',
        joinDate: '2026-01-10',
        email: 'ming@example.com',
        phone: '98887777',
        hkid: 'A123456(7)',
      },
    ],
    flatProgress: { '1234567890': { 'L1-ACT-01': '2026-10-01' } },
  });
  assert.equal(cleanedLoad.privacy, 'progress-only');
  assert.equal('email' in cleanedLoad.members[0], false);
  assert.equal('phone' in cleanedLoad.members[0], false);
  assert.equal('hkid' in cleanedLoad.members[0], false);

  const cleanedSave = sanitizeSaveChanges(
    [
      {
        ymis: '1234567890',
        itemId: 'L1-ACT-01',
        date: '2026-11-05',
        name: '不應傳送姓名',
        phone: '90000000',
        hkid: 'Z999',
      },
    ],
    '團長甲',
  );
  assert.deepEqual(cleanedSave, [
    {
      ymis: '1234567890',
      itemId: 'L1-ACT-01',
      date: '2026-11-05',
      uncomplete: false,
      confirmer: '團長甲',
    },
  ]);

  // 啟動本機模擬 vsbadge 上游，驗證 /api/vsbadge 攔截個人帳戶操作並正確轉發純進度
  let upstreamReceived = null;
  const mockUpstream = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/api/troops') {
      res.end(JSON.stringify({ troops: { '0082': { name: '第 82 旅', en: '82nd Group' } } }));
      return;
    }
    let body = '';
    req.on('data', (c) => {
      body += c;
    });
    req.on('end', () => {
      upstreamReceived = JSON.parse(body || '{}');
      res.end(JSON.stringify({ success: true, processed: upstreamReceived?.data?.changes?.length || 0 }));
    });
  });

  await new Promise((resolve) => mockUpstream.listen(0, '127.0.0.1', resolve));
  const port = mockUpstream.address().port;
  const prevOrigin = process.env.VSBADGE_ORIGIN;
  const prevTest = process.env.VSBOOK_PROXY_TEST;
  process.env.VSBADGE_ORIGIN = `http://127.0.0.1:${port}`;
  process.env.VSBOOK_PROXY_TEST = '1';

  const invoke = async (method, body) => {
    let status = 200;
    let payload = null;
    const res = {
      setHeader() {},
      status(c) {
        status = c;
        return this;
      },
      json(d) {
        payload = d;
        return this;
      },
    };
    await vsbadgeHandler({ method, body }, res);
    return { status, payload };
  };

  try {
    const getRes = await invoke('GET', null);
    assert.equal(getRes.status, 200);
    assert.equal(getRes.payload.troops['0082'].name, '第 82 旅');

    // 嘗試呼叫錄入個人資料的 bulkAddUsers → 必須 403 拒絕
    const blocked = await invoke('POST', {
      troopId: '0082',
      action: 'bulkAddUsers',
      data: { token: 'tok_1234', users: [{ ymis: '1234567890', name: '測試' }] },
    });
    assert.equal(blocked.status, 403);

    // 呼叫 save 純進度 → 必須剝除個人欄位後成功轉發
    const saved = await invoke('POST', {
      troopId: '0082',
      action: 'save',
      data: {
        token: 'tok_leader_1234',
        confirmer: '陳志軒',
        changes: [{ ymis: '1234567890', itemId: 'L1-ACT-01', date: '2026-11-05', phone: '99999999' }],
      },
    });
    assert.equal(saved.status, 200);
    assert.equal(saved.payload.processed, 1);
    assert.equal('phone' in upstreamReceived.data.changes[0], false);
  } finally {
    mockUpstream.close();
    if (prevOrigin === undefined) delete process.env.VSBADGE_ORIGIN;
    else process.env.VSBADGE_ORIGIN = prevOrigin;
    if (prevTest === undefined) delete process.env.VSBOOK_PROXY_TEST;
    else process.env.VSBOOK_PROXY_TEST = prevTest;
  }
});
