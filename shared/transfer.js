/**
 * VSBOOK 純離線二維碼傳輸協定（VS1）
 * 成員端挑選要出示的組別 -> gzip + Base64URL 編碼為單一二維碼字串（或 /#v=VS1... 純前端片段連結）。
 * 領袖端掃描查閱 -> 一次簽名 + 勾選項目 -> 產生 VS1 核簽回傳碼 -> 成員掃回寫入紀錄冊。
 * 全程零伺服器、零雲端上傳。
 */

import { normalizeScoutId, sameScoutId } from './book.js';

export const TRANSFER_PREFIX = 'VS1';
export const TRANSFER_VERSION = 1;
export const KIND_MEMBER = 'vsbook/member';
export const KIND_SIGNOFF = 'vsbook/signoff';

/** QR version 40-L 上限 2,953 bytes，預留鏡頭容錯餘裕定為 2,400 字元。 */
export const QR_LIMIT = 2400;

/** 成員每次出示均須主動剔選；預設全不選以保護私隱。 */
export const TRANSFER_OPTIONS = [
  {
    key: 'particulars',
    label: '個人及旅團資料',
    en: 'Personal & Unit Particulars',
    hint: '姓名、Scout ID、所屬地域／區／旅、入團日期',
  },
  {
    key: 'contact',
    label: '聯絡及緊急聯絡人',
    en: 'Contact & Emergency',
    hint: '電話、電郵、通訊地址、緊急聯絡人電話',
    sensitive: true,
  },
  {
    key: 'progress',
    label: '訓練綱要進度',
    en: 'Training Progress',
    hint: '會員章、肩章、四段章、四金帶及其他獎章完成日期與證書號',
  },
  {
    key: 'summaries',
    label: '段章及金帶活動簡述',
    en: 'Badge & Bar Summaries',
    hint: '第 14–30 頁活動簡述、路線及主考評語',
  },
  {
    key: 'presentations',
    label: '宣誓、續期及總監接見',
    en: 'Investiture, Renewals & Interviews',
    hint: '宣誓日期、會員續期及區／地域總監接見紀錄',
  },
  {
    key: 'signatures',
    label: '領袖及主考簽名墨跡',
    en: 'Leader Signatures',
    hint: '各項旁邊的簽名圖片（較佔容量）',
    heavy: true,
  },
  {
    key: 'holderSignature',
    label: '持有人簽名',
    en: 'Holder Signature',
    hint: '第 1 頁持有人簽名墨跡',
    heavy: true,
  },
  {
    key: 'photo',
    label: '個人近照',
    en: 'Recent Photo',
    hint: '第 1 頁近照（最佔容量，容易超出單張 QR 上限）',
    heavy: true,
  },
];

const SUMMARY_FIELDS = [
  ['p14', 'workshopCertNo', '執行委員會工作坊證書'],
  ['p15', 'part1CertNo', '社會服務段章選修(I)'],
  ['p15', 'part2CertNo', '社會服務段章選修(II)'],
  ['p16', 'summary', '多元技能段章內容簡述'],
  ['p17', 'comments', '多元技能段章主考評語'],
  ['p18', 'summary', '戶外探險段章內容簡述'],
  ['p19', 'comments', '戶外探險段章主考評語'],
  ['p21', 'summary', '活動策劃金帶內容簡述'],
  ['p22', 'comments', '活動策劃金帶主考評語'],
  ['p23', 'summary', '社會服務金帶內容簡述'],
  ['p24', 'comments', '社會服務金帶主考評語'],
  ['p25', 'summary', '多元技能金帶（範疇甲）簡述'],
  ['p27', 'summary', '多元技能金帶（範疇乙）簡述'],
  ['p29', 'summary', '戶外探險金帶內容簡述'],
  ['p30', 'comments', '戶外探險金帶主考評語'],
];

const PRESENTATION_PAGES = ['p10', 'p13', 'p20', 'p31', 'p32', 'p33'];

const clean = (v) => (typeof v === 'string' ? v.trim() : '');
const pick = (obj, keys) => {
  const out = {};
  keys.forEach((k) => {
    const v = clean(obj?.[k]);
    if (v) out[k] = v;
  });
  return out;
};

export function buildPayload(book, selection = []) {
  const chosen = new Set(selection);
  const payload = {
    t: KIND_MEMBER,
    v: TRANSFER_VERSION,
    at: new Date().toISOString(),
    sel: TRANSFER_OPTIONS.filter((o) => chosen.has(o.key)).map((o) => o.key),
  };
  const m = book?.member || {};

  if (chosen.has('particulars')) {
    payload.member = pick(m, ['nameZh', 'nameEn', 'scoutId', 'memberNo', 'unit', 'group', 'district', 'region', 'dateJoined', 'vsl', 'gsl']);
  }
  if (chosen.has('contact')) {
    payload.contact = pick(m, ['phone', 'email', 'addressZh', 'addressEn', 'emergencyName', 'emergencyPhone']);
  }
  if (chosen.has('progress')) {
    const sid = clean(m.scoutId || m.memberNo);
    if (sid) payload.scoutId = sid;
    const progress = {};
    Object.entries(book?.progress || {}).forEach(([id, entry]) => {
      if (!entry) return;
      const row = pick(entry, ['date', 'assessor', 'cert']);
      if (Object.keys(row).length) progress[id] = row;
    });
    payload.progress = progress;
  }
  if (chosen.has('summaries')) {
    const summaries = {};
    SUMMARY_FIELDS.forEach(([page, field, label]) => {
      const v = clean(book?.pages?.[page]?.[field]);
      if (v) summaries[`${page}.${field}`] = { label, text: v };
    });
    payload.summaries = summaries;
  }
  if (chosen.has('presentations')) {
    const pages = {};
    PRESENTATION_PAGES.forEach((page) => {
      const src = book?.pages?.[page] || {};
      const row = pick(src, ['investitureDate', 'vslName', 'completedDate', 'certNo', 'dcComments', 'dcName', 'dcDate', 'rcComments', 'rcName', 'rcDate']);
      if (Object.keys(row).length) pages[page] = row;
    });
    const renewals = (book?.renewals || [])
      .map((r) => pick(r, ['date', 'validUntil', 'note']))
      .filter((r) => Object.keys(r).length > 0);
    if (renewals.length) payload.renewals = renewals;
    if (Object.keys(pages).length) payload.pages = pages;
  }
  if (chosen.has('signatures')) {
    const signatures = {};
    Object.entries(book?.progress || {}).forEach(([id, entry]) => {
      if (entry?.signature?.png) signatures[id] = entry.signature;
    });
    payload.signatures = signatures;
  }
  if (chosen.has('holderSignature') && book?.holderSignature?.png) {
    payload.holderSignature = book.holderSignature;
  }
  if (chosen.has('photo') && m.photo) {
    payload.photo = m.photo;
  }

  payload.sums = { done: Object.keys(payload.progress || {}).length };
  return payload;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function toBase64Url(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64[b0 >> 2];
    out += B64[((b0 & 3) << 4) | ((b1 ?? 0) >> 4)];
    if (b1 === undefined) break;
    out += B64[((b1 & 15) << 2) | ((b2 ?? 0) >> 6)];
    if (b2 === undefined) break;
    out += B64[b2 & 63];
  }
  return out;
}

function fromBase64Url(str) {
  const cleanStr = str.replace(/=+$/, '');
  const bytes = [];
  for (let i = 0; i < cleanStr.length; i += 4) {
    const c0 = B64.indexOf(cleanStr[i]);
    const c1 = B64.indexOf(cleanStr[i + 1]);
    const c2 = B64.indexOf(cleanStr[i + 2]);
    const c3 = B64.indexOf(cleanStr[i + 3]);
    if (c0 < 0 || c1 < 0) throw new Error('二維碼內容格式有誤');
    bytes.push((c0 << 2) | (c1 >> 4));
    if (c2 >= 0) bytes.push(((c1 & 15) << 4) | (c2 >> 2));
    if (c3 >= 0) bytes.push(((c2 & 3) << 6) | c3);
  }
  return new Uint8Array(bytes);
}

const gzipAvailable = () => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

function byteStream(bytes) {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

async function gzip(bytes) {
  const stream = byteStream(bytes).pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gunzip(bytes) {
  const stream = byteStream(bytes).pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function encodePayload(payload) {
  const json = JSON.stringify(payload);
  const raw = new TextEncoder().encode(json);
  let bytes = raw;
  let prefix = `${TRANSFER_PREFIX}P.`;
  if (gzipAvailable()) {
    try {
      const packed = await gzip(raw);
      if (packed.length < raw.length * 0.96) {
        bytes = packed;
        prefix = `${TRANSFER_PREFIX}.`;
      }
    } catch {
      /* fallback uncompressed */
    }
  }
  const value = prefix + toBase64Url(bytes);
  return {
    value,
    payload,
    chars: value.length,
    rawBytes: raw.length,
    bytes: bytes.length,
    compressed: prefix === `${TRANSFER_PREFIX}.`,
    tooBig: value.length > QR_LIMIT,
  };
}

export async function encodeTransfer(book, selection) {
  return encodePayload(buildPayload(book, selection));
}

export async function encodeSignoff({ member, leader, items, note }) {
  const payload = {
    t: KIND_SIGNOFF,
    v: TRANSFER_VERSION,
    at: new Date().toISOString(),
    seq: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    member: {
      nameZh: member?.nameZh || '',
      scoutId: member?.scoutId || member?.memberNo || '',
    },
    leader: {
      name: leader?.name || '',
      title: leader?.title || '深資童軍團長 VSL',
      at: leader?.at || new Date().toISOString().slice(0, 10),
      png: leader?.png || null,
    },
    items: (items || []).map((it) => ({
      id: it.id,
      date: it.date || new Date().toISOString().slice(0, 10),
      assessor: it.assessor || leader?.name || '',
      verified: true,
    })),
    note: note || '',
  };
  return encodePayload(payload);
}

/** 抽取純 VS1 字串（同時支援直接掃描 VS1... 或貼上含 #v=VS1... 的完整網址）。 */
export function extractToken(rawInput) {
  const s = String(rawInput || '').trim();
  const hashIdx = s.indexOf('#v=');
  if (hashIdx >= 0) {
    return decodeURIComponent(s.slice(hashIdx + 3).split('&')[0].trim());
  }
  return s;
}

export async function decodePayload(rawInput) {
  const input = extractToken(rawInput);
  const match = /^VS1S?(P?)\.([A-Za-z0-9_-]+)$/.exec(input);
  if (!match) throw new Error('這不是 VSBOOK 的二維碼（應以 VS1. 開頭）');
  let bytes = fromBase64Url(match[2]);
  if (!match[1]) {
    if (!gzipAvailable()) throw new Error('此二維碼需要支援壓縮流的現代瀏覽器讀取');
    bytes = await gunzip(bytes);
  }
  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error('二維碼內容損壞，請請對方重新產生');
  }
  if (payload?.v !== TRANSFER_VERSION || (payload.t !== KIND_MEMBER && payload.t !== KIND_SIGNOFF)) {
    throw new Error('二維碼版本不相容，請更新 VSBOOK');
  }
  return payload;
}

export async function decodeTransfer(rawInput) {
  const payload = await decodePayload(rawInput);
  if (payload.t !== KIND_MEMBER) throw new Error('這個二維碼是核簽單，不是成員紀錄冊');
  return payload;
}

export function applySignoff(book, payload) {
  if (!payload || payload.t !== KIND_SIGNOFF) throw new Error('這不是有效的領袖核簽單');
  if (payload?.member?.scoutId) {
    const myId = normalizeScoutId(book?.member?.scoutId || book?.member?.memberNo);
    if (myId && !sameScoutId(payload.member.scoutId, myId)) {
      throw new Error(`此核簽單屬於 SCOUT ID ${payload.member.scoutId}，與本機（${myId}）不符`);
    }
  }

  const next = structuredClone(book);
  const changes = [];
  next.progress = next.progress || {};
  next.pages = next.pages || {};

  (payload.items || []).forEach((item) => {
    if (!item?.id || !item.verified) return;
    const current = next.progress[item.id] || {};
    const before = { date: current.date || '', assessor: current.assessor || '' };
    const finalDate = item.date || current.date || new Date().toISOString().slice(0, 10);
    next.progress[item.id] = {
      ...current,
      date: finalDate,
      assessor: item.assessor || payload.leader?.name || current.assessor || '',
      at: new Date().toISOString(),
      signedAt: payload.at,
      ...(payload.leader?.png
        ? {
            signature: {
              png: payload.leader.png,
              name: payload.leader.name,
              title: payload.leader.title,
              at: payload.leader.at,
            },
          }
        : {}),
    };
    if (item.id === 'OT-FA') {
      next.pages.p34 = { ...(next.pages.p34 || {}), faCompletedDate: next.pages.p34?.faCompletedDate || finalDate };
    } else if (item.id === 'OT-WORLD-SW-AWARD') {
      next.pages.p34 = { ...(next.pages.p34 || {}), swaCompletedDate: next.pages.p34?.swaCompletedDate || finalDate };
    } else if (item.id === 'OT-ROVER-LINK') {
      next.pages.p35 = { ...(next.pages.p35 || {}), completedDate: next.pages.p35?.completedDate || finalDate };
    }
    changes.push({
      id: item.id,
      before,
      after: { date: next.progress[item.id].date, assessor: next.progress[item.id].assessor },
      stamped: Boolean(payload.leader?.png),
    });
  });

  next.meta = { ...(next.meta || {}), updatedAt: new Date().toISOString() };
  return { book: next, changes };
}

export function describeSelection(selection = []) {
  const chosen = TRANSFER_OPTIONS.filter((o) => selection.includes(o.key));
  return chosen.length ? chosen.map((o) => o.label).join('、') : '（未剔選任何組別）';
}
