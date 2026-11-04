import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_VERSION, demoBook, newBook } from '../shared/book.js';
import { FORM_ORDER, FORM_META, buildFormValues, formReadiness, computeAge } from '../shared/forms.js';
import {
  QR_LIMIT,
  encodeTransfer,
  decodeTransfer,
  decodePayload,
  encodeSignoff,
  applySignoff,
} from '../shared/transfer.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('三張官方表格（PT/65、PT/19、PT/20）自動帶入與必填檢查', () => {
  assert.deepEqual(FORM_ORDER, ['pt65', 'pt19', 'pt20']);
  assert.equal(FORM_META.pt65.pages, 1);
  assert.equal(FORM_META.pt19.pages, 3);
  assert.equal(FORM_META.pt20.pages, 3);

  const demo = demoBook();
  assert.equal(computeAge('2009-04-16', new Date('2026-11-04')), '17');

  const pt19Ready = formReadiness(demo, 'pt19');
  assert.equal(pt19Ready.ready, true);
  assert.equal(pt19Ready.values.hkidPrefix, 'Y418');
  assert.equal(pt19Ready.values.nameEn, 'CHEUNG TSZ-CHING');
  assert.match(pt19Ready.values.l3ProjectDetail, /VSEC-2026-048/);
  assert.match(pt19Ready.values.l3Service1Detail, /急救/);

  // 示範資料尚未填榮譽童軍金帶，PT/20 應準確回報尚缺項目
  const pt20Check = formReadiness(demo, 'pt20');
  assert.equal(pt20Check.ready, false);
  assert.ok(pt20Check.missing.some((m) => m.includes('活動策劃金帶')));
  assert.equal(buildFormValues(demo, 'pt20').vsaCertNo, 'VSA-2026-0318');
});

test('VS1 二維碼封包私隱隔離、壓縮編解碼及 #v= 連結解析', async () => {
  const demo = demoBook();

  // 只勾選個人及進度，絕不能外洩聯絡電話與相片
  const encoded = await encodeTransfer(demo, ['particulars', 'progress']);
  assert.match(encoded.value, /^VS1(P?)\./);
  assert.equal(encoded.tooBig, false);
  assert.ok(encoded.chars < QR_LIMIT);

  const decoded = await decodeTransfer(encoded.value);
  assert.equal(decoded.member.nameZh, '張芷晴');
  assert.equal(decoded.contact, undefined);
  assert.equal(decoded.photo, undefined);
  assert.equal(decoded.progress['L1-ACT-01'].date, '2025-10-18');

  // 支援從純前端 URL fragment (#v=VS1...) 直接解碼
  const fromUrl = await decodePayload(`https://vsbook.vercel.app/#v=${encodeURIComponent(encoded.value)}`);
  assert.equal(fromUrl.member.scoutId, '25081420');
});

test('領袖核簽回傳碼產生與寫入成員紀錄冊', async () => {
  const memberBook = newBook({
    member: { nameZh: '李俊傑', scoutId: '26001234' },
    progress: {
      'L1-ACT-01': { date: '2026-10-01' },
      'L1-UND-01': { date: '2026-10-08' },
    },
  });

  const signRes = await encodeSignoff({
    member: memberBook.member,
    leader: {
      name: '陳志軒',
      title: '深資童軍團長 VSL',
      at: '2026-11-04',
      png: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==',
    },
    items: [
      { id: 'L1-ACT-01', date: '2026-10-01' },
      { id: 'L1-UND-01', date: '2026-10-08' },
    ],
    note: '集會當面核簽',
  });

  assert.equal(signRes.tooBig, false);
  const signPayload = await decodePayload(signRes.value);
  const { book: updated, changes } = applySignoff(memberBook, signPayload);
  assert.equal(changes.length, 2);
  assert.equal(updated.progress['L1-ACT-01'].assessor, '陳志軒');
  assert.ok(updated.progress['L1-ACT-01'].signature.png);
});

test('G11 全套 9 個圖示與雙重版本號守衛', () => {
  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(`v${pkg.version}`, APP_VERSION);

  const iconDir = path.join(root, 'web', 'public', 'icons');
  const required = [
    'favicon.ico',
    'favicon-16.png',
    'favicon-32.png',
    'apple-touch-icon.png',
    'icon-192.png',
    'icon-512.png',
    'icon-maskable-192.png',
    'icon-maskable-512.png',
    'og-image.png',
  ];
  let bytes = 0;
  for (const name of required) {
    const p = path.join(iconDir, name);
    assert.ok(existsSync(p), `Missing icon ${name}`);
    const sz = statSync(p).size;
    assert.ok(sz > 64, `Icon ${name} looks empty`);
    bytes += sz;
  }
  assert.ok(bytes <= 260 * 1024, `Icons exceed 260 KB: ${bytes}`);
});
