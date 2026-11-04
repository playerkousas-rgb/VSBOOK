// VSBOOK — 深資童軍紀錄冊資料模型（純本機儲存，零伺服器）
// 與 vsbadge 互通進度格式：{ [scoutId]: { [itemId]: 'YYYY-MM-DD' } }

import { BADGE_SYLLABUS, OTHER_BADGES, SYLLABUS_ITEMS, ITEM_INDEX, SYLLABUS_META } from './syllabus.js';

export { BADGE_SYLLABUS, OTHER_BADGES, SYLLABUS_ITEMS, ITEM_INDEX, SYLLABUS_META };

export const APP_VERSION = 'v1.0.0';
export const STORE_KEY = 'vsbook.book.v1';
export const LEGACY_STORE_KEYS = [];

export const uid = (p = 'v') => `${p}_${Math.random().toString(36).slice(2, 9)}`;

export function today() {
  return new Date().toISOString().slice(0, 10);
}

/** 紀錄冊編號 ＝ 童軍成員編號 SCOUT ID（與 vsbadge 完全統一）。 */
export function scoutId(bookOrMember) {
  const m = bookOrMember?.member || bookOrMember || {};
  return String(m.scoutId || m.memberNo || m.ymis || '').trim();
}

/** 保持 scoutId 與 memberNo 同步，清除舊 ymis 欄位。 */
export function syncIdentity(member) {
  if (!member) return member;
  const id = scoutId(member);
  member.scoutId = id;
  member.memberNo = id;
  delete member.ymis;
  return member;
}

/** 香港身份證只保留首四位字元（如 A123），符合 PT/19 及 PT/20 私隱規定。 */
export function sanitizeHkidPrefix(raw) {
  return String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4);
}

export function newBook(partial = {}) {
  const now = new Date().toISOString();
  const { member: partialMember, meta: partialMeta, ...rest } = partial;
  const book = {
    version: 1,
    appVersion: APP_VERSION,
    member: {
      nameZh: '',
      nameEn: '',
      scoutId: '',
      memberNo: '',
      hkidPrefix: '',
      gender: '',
      photo: null,
      unit: '',
      group: '',
      district: '',
      region: '',
      dob: '',
      placeOfBirth: '',
      phone: '',
      email: '',
      addressZh: '',
      addressEn: '',
      bloodType: '',
      emergencyName: '',
      emergencyPhone: '',
      sponsoringAuthority: '',
      groupAddress: '',
      gsl: '',
      vsl: '',
      vslPhone: '',
      dateJoined: '',
      dateScoutMovement: '',
      ...(partialMember || {}),
    },
    scouting: {
      grasshopper: { from: '', to: '', unit: '', post: '', award: '' },
      cub: { from: '', to: '', unit: '', post: '', award: '' },
      scout: { from: '', to: '', unit: '', post: '', award: '' },
    },
    transfers: [],
    addressChanges: [],
    detailChanges: [],
    renewals: [],
    wosmBadges: [],
    otherBadges1: [],
    otherBadges2: [],
    additional: [],
    expeditions: [],
    progress: {},
    pages: {},
    forms: {},
    holderSignature: null,
    ...rest,
    meta: { createdAt: now, updatedAt: now, ...(partialMeta || {}) },
  };
  syncIdentity(book.member);
  if (book.member.hkidPrefix) {
    book.member.hkidPrefix = sanitizeHkidPrefix(book.member.hkidPrefix);
  }
  return book;
}

// ---------------------------------------------------------------- 進度統計（支援深資豁免與選修制）

const L1_IDS = [
  'L1-ACT-01',
  'L1-UND-01',
  'L1-UND-02',
  'L1-UND-03',
  'L1-UND-04',
  'L1-UND-05',
  'L1-ETQ-01',
  'L1-ETQ-02',
  'L1-ETQ-03',
  'L1-ETQ-04',
  'L1-PRM-01',
  'L1-CP-01',
];

const L2_PART_A_IDS = [
  'L2-REC-01',
  'L2-REC-02',
  'L2-REC-03',
  'L2-REC-04',
  'L2-REC-05',
  'L2-REC-06',
  'L2-REC-07',
  'L2-REC-08',
  'L2-REC-09',
  'L2-REC-10',
];

const L2_PART_B_IDS = [
  'L2-CAMP-01',
  'L2-CAMP-02',
  'L2-CAMP-03',
  'L2-CAMP-04',
  'L2-CAMP-05',
  'L2-CAMP-06',
  'L2-CAMP-07',
  'L2-KNOT-01',
  'L2-HIKE-01',
  'L2-HIKE-02',
  'L2-FA-01',
  'L2-FA-02',
  'L2-FA-03',
];

const hasDate = (book, id) => Boolean(book?.progress?.[id]?.date);
const anyDate = (book, ids) => ids.some((id) => hasDate(book, id));

export function badgeStats(book, badgeId) {
  const badge = BADGE_SYLLABUS.find((b) => b.id === badgeId);
  if (!badge) return { total: 0, done: 0, percent: 0, segments: [], badge: null };

  if (badgeId === 'L1') {
    const certDone = Boolean(book?.pages?.p10?.safeCertNo);
    const done = L1_IDS.filter((id) => hasDate(book, id) || (id === 'L1-CP-01' && certDone)).length;
    return {
      total: 12,
      done,
      percent: Math.round((done / 12) * 100),
      awarded: book?.pages?.p10?.investitureDate || null,
      badge,
    };
  }

  if (badgeId === 'L2') {
    const exemptA = Boolean(book?.pages?.p11?.linkCertNo || book?.pages?.p11?.linkDate);
    const exemptB = Boolean(book?.pages?.p12?.standardCertNo || book?.pages?.p12?.standardDate);
    const doneA = exemptA ? 10 : L2_PART_A_IDS.filter((id) => hasDate(book, id)).length;
    const doneB = exemptB ? 13 : L2_PART_B_IDS.filter((id) => hasDate(book, id)).length;
    const done = doneA + doneB;
    return {
      total: 23,
      done,
      percent: Math.round((done / 23) * 100),
      exemptA,
      exemptB,
      awarded: book?.pages?.p13?.completedDate || null,
      badge,
    };
  }

  if (badgeId === 'L3') {
    const projectOk = hasDate(book, 'L3-PROJECT-01') || Boolean(book?.pages?.p14?.completedDate);
    const s1Ok = anyDate(book, ['L3-SERVICE-01', 'L3-SERVICE-02']) || Boolean(book?.pages?.p15?.part1Date);
    const s2Ok =
      anyDate(book, ['L3-SERVICE-03', 'L3-SERVICE-04', 'L3-SERVICE-05', 'L3-SERVICE-06', 'L3-SERVICE-07', 'L3-SERVICE-08']) ||
      Boolean(book?.pages?.p15?.part2Date);
    const serviceOk = (s1Ok && s2Ok) || Boolean(book?.pages?.p15?.completedDate);
    const activityOk =
      anyDate(book, [
        'L3-ACT-V11-PIONEERING',
        'L3-ACT-V11-CAMPCRAFT',
        'L3-ACT-V11-FOOTDRILL',
        'L3-ACT-V11-SPORT-2X20',
        'L3-ACT-V11-SPORT-52',
        'L3-ACT-V11-NEW-AIR',
        'L3-ACT-V11-NEW-SEA',
        'L3-ACT-V11-NEW-IT',
        'L3-ACT-V11-NEW-OVERSEAS',
        'L3-ACT-V11-NEW-ARTS',
        'L3-ACT-V11-NEW-INTERESTS',
      ]) || Boolean(book?.pages?.p17?.completedDate);
    const expOk =
      anyDate(book, ['L3-EXP-V11-HIKING', 'L3-EXP-V11-CYCLING', 'L3-EXP-V11-DRIVING', 'L3-EXP-V11-MECHANICAL', 'L3-EXP-V11-SEA']) ||
      Boolean(book?.pages?.p19?.completedDate);
    const flags = [projectOk, serviceOk, activityOk, expOk];
    const done = flags.filter(Boolean).length;
    return {
      total: 4,
      done,
      percent: Math.round((done / 4) * 100),
      awarded: book?.pages?.p20?.completedDate || null,
      unitLabel: '段章',
      badge,
    };
  }

  if (badgeId === 'L4') {
    const projectOk = anyDate(book, ['L4-PROJ-01', 'L4-PROJ-02']) || Boolean(book?.pages?.p22?.completedDate);
    const serviceOk = anyDate(book, ['L4-SERV-01', 'L4-SERV-02', 'L4-SERV-03']) || Boolean(book?.pages?.p24?.completedDate);
    const cat1 = anyDate(book, ['L4-ACT-V11-PIONEERING', 'L4-ACT-V11-CAMPCRAFT', 'L4-ACT-V11-FOOTDRILL']);
    const cat2 = anyDate(book, ['L4-ACT-V11-SPORT-2X20', 'L4-ACT-V11-SPORT-52']);
    const cat3 = anyDate(book, [
      'L4-ACT-V11-NEW-AIR',
      'L4-ACT-V11-NEW-SEA',
      'L4-ACT-V11-NEW-IT',
      'L4-ACT-V11-NEW-OVERSEAS',
      'L4-ACT-V11-NEW-ARTS',
      'L4-ACT-V11-NEW-INTERESTS',
    ]);
    const catCount = [cat1, cat2, cat3].filter(Boolean).length;
    const activityOk =
      catCount >= 2 ||
      (Boolean(book?.pages?.p26?.completedDate) &&
        Boolean(book?.pages?.p28?.completedDate) &&
        book?.pages?.p25?.category &&
        book?.pages?.p27?.category &&
        book.pages.p25.category !== book.pages.p27.category);
    const expOk =
      anyDate(book, ['L4-EXP-V11-HIKING', 'L4-EXP-V11-CYCLING', 'L4-EXP-V11-DRIVING', 'L4-EXP-V11-MECHANICAL', 'L4-EXP-V11-SEA']) ||
      Boolean(book?.pages?.p30?.completedDate);
    const flags = [projectOk, serviceOk, activityOk, expOk];
    const done = flags.filter(Boolean).length;
    return {
      total: 4,
      done,
      percent: Math.round((done / 4) * 100),
      awarded: book?.pages?.p33?.completedDate || null,
      unitLabel: '金帶',
      badge,
    };
  }

  return { total: 0, done: 0, percent: 0, badge };
}

export function allStats(book) {
  const badges = BADGE_SYLLABUS.map((b) => badgeStats(book, b.id));
  const total = badges.reduce((n, b) => n + b.total, 0);
  const done = badges.reduce((n, b) => n + b.done, 0);
  return {
    badges,
    total,
    done,
    percent: total ? Math.round((done / total) * 100) : 0,
    nextBadge: badges.find((b) => b.done < b.total) || badges[badges.length - 1],
  };
}

export function latestRenewal(book) {
  return [...(book?.renewals || [])]
    .filter((r) => r && (r.validUntil || r.date))
    .sort((a, b) => String(b.validUntil || b.date).localeCompare(String(a.validUntil || a.date)))[0] || null;
}

export function membershipStatus(book) {
  const last = latestRenewal(book);
  const t = today();
  return {
    renewal: last,
    validUntil: last?.validUntil || null,
    active: Boolean(last?.validUntil && last.validUntil >= t),
  };
}

// ------------------------------------------------- vsbadge 雙向互通

export function exportForVsBadge(book, troopId = '') {
  const sid = scoutId(book?.member) || 'UNSET';
  const progress = {};
  Object.entries(book?.progress || {}).forEach(([itemId, state]) => {
    if (state?.date) progress[itemId] = state.date;
  });
  if (book?.pages?.p34?.swaCompletedDate && !progress['OT-WORLD-SW-AWARD']) {
    progress['OT-WORLD-SW-AWARD'] = book.pages.p34.swaCompletedDate;
  }
  if (book?.pages?.p34?.faCompletedDate && !progress['OT-FA']) {
    progress['OT-FA'] = book.pages.p34.faCompletedDate;
  }
  if (book?.pages?.p35?.completedDate && !progress['OT-ROVER-LINK']) {
    progress['OT-ROVER-LINK'] = book.pages.p35.completedDate;
  }

  const badges = {};
  if (book?.pages?.p10?.investitureDate) badges.L1 = book.pages.p10.investitureDate;
  if (book?.pages?.p13?.completedDate) badges.L2 = book.pages.p13.completedDate;
  if (book?.pages?.p20?.completedDate) badges.L3 = book.pages.p20.completedDate;
  if (book?.pages?.p33?.completedDate) badges.L4 = book.pages.p33.completedDate;

  return {
    info: 'VSBOOK 匯出 · 可直接匯入 vsbadge（2026 第十一版深資童軍訓練綱要）',
    troopId,
    exportedAt: new Date().toISOString(),
    members: [
      {
        scoutId: sid === 'UNSET' ? '' : sid,
        name: book?.member?.nameZh || '',
        nameEn: book?.member?.nameEn || '',
        role: 'member',
        joinDate: book?.member?.dateJoined || '',
        unit: book?.member?.unit || '',
        group: book?.member?.group || '',
      },
    ],
    progress: { [sid]: progress },
    progress_mock: { 說明: 'VSBOOK 匯出進度', [sid]: progress },
    badges,
    source: 'VSBOOK',
    schema: 'vsbadge.progress.v1',
  };
}

export function importFromVsBadge(json, srcBook) {
  if (!json || typeof json !== 'object') throw new Error('檔案格式不正確');
  const next = structuredClone(srcBook);
  const member = { ...next.member };
  let progressMap = null;
  let matchedBy = '檔案';

  const candidates = [json.progress, json.progress_mock].filter((x) => x && typeof x === 'object');
  for (const candidate of candidates) {
    const keys = Object.keys(candidate).filter((k) => k !== '說明');
    if (keys.some((k) => ITEM_INDEX[k])) {
      progressMap = candidate;
      matchedBy = '直接進度表';
      break;
    }
    const sid = scoutId(member);
    if (sid && candidate[sid] && typeof candidate[sid] === 'object') {
      progressMap = candidate[sid];
      matchedBy = `SCOUT ID ${sid}`;
      break;
    }
    const byName = keys.find((k) => {
      const m = Array.isArray(json.members)
        ? json.members.find((x) => String(x.scoutId || x.ymis) === String(k))
        : null;
      return m && m.name && m.name === member.nameZh;
    });
    if (byName && candidate[byName]) {
      progressMap = candidate[byName];
      matchedBy = `姓名 ${member.nameZh}`;
      break;
    }
    if (keys.length && typeof candidate[keys[0]] === 'object') {
      progressMap = candidate[keys[0]];
      matchedBy = `第一位成員（${keys[0]}）`;
      break;
    }
  }

  if (!progressMap && json.progress === undefined && json.progress_mock === undefined) {
    const direct = Object.fromEntries(
      Object.entries(json).filter(([k, v]) => ITEM_INDEX[k] && (typeof v === 'string' || typeof v?.date === 'string')),
    );
    if (Object.keys(direct).length) {
      progressMap = direct;
      matchedBy = '直接進度表';
    }
  }

  if (!progressMap) {
    throw new Error('找不到可識別的深資童軍進度資料（需要 progress / progress_mock 或 {項目ID: 日期}）');
  }

  const imported = [];
  const skipped = [];
  next.progress = next.progress || {};
  next.pages = next.pages || {};

  Object.entries(progressMap).forEach(([itemId, value]) => {
    if (!ITEM_INDEX[itemId]) {
      skipped.push(itemId);
      return;
    }
    const date = typeof value === 'string' ? value : value?.date || '';
    if (!date) return;
    if (next.progress[itemId]?.date) return; // 不覆蓋本機已有的日期與簽名
    next.progress[itemId] = { date, source: 'vsbadge', at: new Date().toISOString() };
    imported.push(itemId);

    // 同步常見特殊獎章至對應紙本頁
    if (itemId === 'OT-FA') {
      next.pages.p34 = { ...(next.pages.p34 || {}), faCompletedDate: next.pages.p34?.faCompletedDate || date };
    } else if (itemId === 'OT-WORLD-SW-AWARD') {
      next.pages.p34 = { ...(next.pages.p34 || {}), swaCompletedDate: next.pages.p34?.swaCompletedDate || date };
    } else if (itemId === 'OT-ROVER-LINK') {
      next.pages.p35 = { ...(next.pages.p35 || {}), completedDate: next.pages.p35?.completedDate || date };
    }
  });

  const srcMember = Array.isArray(json.members)
    ? json.members.find((m) => String(m.scoutId || m.ymis) === scoutId(member)) || json.members[0]
    : null;
  if (srcMember) {
    const sid = srcMember.scoutId || srcMember.ymis;
    if (!scoutId(member) && sid && sid !== 'UNSET') member.scoutId = String(sid);
    if (!member.nameZh && srcMember.name) member.nameZh = srcMember.name;
    if (!member.nameEn && srcMember.nameEn) member.nameEn = srcMember.nameEn;
    if (!member.dateJoined && srcMember.joinDate) member.dateJoined = srcMember.joinDate;
    if (!member.unit && (srcMember.unit || srcMember.crew)) member.unit = srcMember.unit || srcMember.crew;
    if (!member.group && srcMember.group) member.group = srcMember.group;
  }
  syncIdentity(member);
  next.member = member;
  next.meta = { ...(next.meta || {}), updatedAt: new Date().toISOString() };

  return { book: next, imported: imported.length, skipped, matchedBy };
}

export function progressedCount(book) {
  return Object.values(book?.progress || {}).filter((p) => p?.date).length;
}

// ---------------------------------------------------------------- 紙本第 1–40 頁逐頁對照
// 嚴格對應《New Venture Record Book .pdf》共 40 頁（第 1 頁至第 40 頁）。

export const SECTIONS = [
  { id: 'contents', label: '目錄與總覽', en: 'Contents & Progress', page: '—', digital: true },
  { id: 'p01', label: '個人資料', en: 'Personal Particulars', page: 1 },
  { id: 'p02', label: '轉旅 · 旅部資料', en: 'Transfer & Group Information', page: 2 },
  { id: 'p03', label: '童軍紀錄 · 更改摘要', en: 'Scouting Experience & Changes', page: 3 },
  { id: 'p04', label: '會員資格（一）', en: 'Renewal of Membership (I)', page: 4 },
  { id: 'p05', label: '會員資格（二）', en: 'Renewal of Membership (II)', page: 5 },
  { id: 'p06', label: '支部目的 · 方法 · 銘言', en: 'Aim, Method & Motto', page: 6 },
  { id: 'p07', label: '童軍誓詞 · 童軍規律', en: 'Scout Promise & Scout Law', page: 7 },
  { id: 'p08', label: '進度性獎章總覽', en: 'Progressive Badges', page: 8 },
  { id: 'p09', label: '會員章（一）活動 · 理解 · 禮節', en: 'Membership Badge (I)', page: 9, badge: 'L1' },
  { id: 'p10', label: '會員章（二）許諾 · 保護童軍 · 宣誓', en: 'Membership Badge (II)', page: 10, badge: 'L1' },
  { id: 'p11', label: '深資童軍肩章：甲. 認識', en: 'Epaulettes: A. Understanding', page: 11, badge: 'L2' },
  { id: 'p12', label: '深資童軍肩章：乙. 童軍技能（一）', en: 'Epaulettes: B. Scoutcraft (I)', page: 12, badge: 'L2' },
  { id: 'p13', label: '深資童軍肩章：乙. 童軍技能（二）', en: 'Epaulettes: B. Scoutcraft (II)', page: 13, badge: 'L2' },
  { id: 'p14', label: '活動策劃段章', en: 'Project Badge', page: 14, badge: 'L3' },
  { id: 'p15', label: '社會服務段章', en: 'Service Badge', page: 15, badge: 'L3' },
  { id: 'p16', label: '多元技能段章（一）內容簡述', en: 'Activity Badge (I) Summary', page: 16, badge: 'L3' },
  { id: 'p17', label: '多元技能段章（二）主考評語', en: 'Activity Badge (II) Comments', page: 17, badge: 'L3' },
  { id: 'p18', label: '戶外探險段章（一）內容簡述', en: 'Exploration Badge (I) Summary', page: 18, badge: 'L3' },
  { id: 'p19', label: '戶外探險段章（二）主考評語', en: 'Exploration Badge (II) Comments', page: 19, badge: 'L3' },
  { id: 'p20', label: '深資童軍獎章 · 區總監接見', en: 'Venture Scout Award & DC Interview', page: 20, badge: 'L3' },
  { id: 'p21', label: '活動策劃金帶（一）內容簡述', en: 'Project Bar (I) Summary', page: 21, badge: 'L4' },
  { id: 'p22', label: '活動策劃金帶（二）主考評語', en: 'Project Bar (II) Comments', page: 22, badge: 'L4' },
  { id: 'p23', label: '社會服務金帶（一）內容簡述', en: 'Service Bar (I) Summary', page: 23, badge: 'L4' },
  { id: 'p24', label: '社會服務金帶（二）主考評語', en: 'Service Bar (II) Comments', page: 24, badge: 'L4' },
  { id: 'p25', label: '多元技能金帶・範疇甲（一）', en: 'Activity Bar · Cat. A (I)', page: 25, badge: 'L4' },
  { id: 'p26', label: '多元技能金帶・範疇甲（二）', en: 'Activity Bar · Cat. A (II)', page: 26, badge: 'L4' },
  { id: 'p27', label: '多元技能金帶・範疇乙（一）', en: 'Activity Bar · Cat. B (I)', page: 27, badge: 'L4' },
  { id: 'p28', label: '多元技能金帶・範疇乙（二）', en: 'Activity Bar · Cat. B (II)', page: 28, badge: 'L4' },
  { id: 'p29', label: '戶外探險金帶（一）內容簡述', en: 'Exploration Bar (I) Summary', page: 29, badge: 'L4' },
  { id: 'p30', label: '戶外探險金帶（二）主考評語', en: 'Exploration Bar (II) Comments', page: 30, badge: 'L4' },
  { id: 'p31', label: '榮譽童軍獎章：區總監接見', en: 'Dragon Scout Award: DC Interview', page: 31, badge: 'L4' },
  { id: 'p32', label: '榮譽童軍獎章：地域總監接見', en: 'Dragon Scout Award: RC Interview', page: 32, badge: 'L4' },
  { id: 'p33', label: '榮譽童軍獎章完成紀錄', en: 'Dragon Scout Award Completion', page: 33, badge: 'L4' },
  { id: 'p34', label: '寰宇童軍章 · 深資童軍急救章', en: 'SWA & Venture First Aid Badge', page: 34 },
  { id: 'p35', label: '樂行童軍先修章', en: 'Rover Scout Link Badge', page: 35 },
  { id: 'p36', label: '世界童軍組織推出的獎章', en: 'Badges from the WOSM', page: 36 },
  { id: 'p37', label: '其他獎章（一）', en: 'Other Badges (I)', page: 37 },
  { id: 'p38', label: '其他獎章（二）', en: 'Other Badges (II)', page: 38 },
  { id: 'p39', label: '其他經驗', en: 'Additional Experiences', page: 39 },
  { id: 'p40', label: '遠足及海外活動', en: 'Expeditions & Overseas Activities', page: 40 },
  { id: 'appendix', label: '數位附錄與備份', en: 'Digital Appendix & Sync', page: '—', digital: true },
];

export const PAGE_TOTAL = 40;
export const PRINT_PAGES = SECTIONS.filter((s) => !s.digital);

// ------------------------------------------------------------------ 示範紀錄冊（一鍵體驗完整功能）

const inkSvg = (path, tint = '#231920') =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 80"><path d="${path}" fill="none" stroke="${tint}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  )}`;

const SIG_HOLDER = inkSvg(
  'M18 56 C 36 22, 54 18, 62 34 C 68 48, 48 58, 44 46 C 40 34, 60 28, 78 40 C 92 48, 98 58, 114 46 C 128 36, 126 22, 142 28 C 156 34, 148 54, 168 50 C 186 46, 192 28, 212 36',
  '#2d1d24',
);
const SIG_VSL = inkSvg(
  'M14 52 C 38 26, 52 18, 64 26 C 76 34, 54 54, 46 58 C 40 60, 56 60, 72 48 C 88 34, 98 22, 112 30 C 126 38, 108 56, 124 54 C 142 52, 146 28, 164 32 C 180 36, 174 54, 198 46',
  '#5a1321',
);

const vslSig = (at) => ({ png: SIG_VSL, name: '陳志軒', title: '深資童軍團長 VSL', at });

export function demoBook() {
  const progress = {};
  L1_IDS.forEach((id) => {
    progress[id] = { date: '2025-10-18', assessor: '陳志軒', signature: vslSig('2025-10-18') };
  });
  L2_PART_A_IDS.forEach((id) => {
    progress[id] = { date: '2026-01-17', assessor: '陳志軒' };
  });
  L2_PART_B_IDS.forEach((id) => {
    progress[id] = { date: '2026-02-22', assessor: '周國樑' };
  });
  progress['L3-PROJECT-01'] = { date: '2026-04-12', assessor: '周國樑', cert: 'VSEC-2026-048' };
  progress['L3-SERVICE-01'] = { date: '2026-05-03', assessor: '香港聖約翰救傷會', cert: 'FA30-88219' };
  progress['L3-SERVICE-06'] = { date: '2026-06-14', assessor: '黃敏儀', cert: 'MHFA-2026-312' };
  progress['L3-ACT-V11-PIONEERING'] = { date: '2026-07-19', assessor: '李偉傑', cert: 'PIO-2026-109' };
  progress['L3-EXP-V11-PRE-MAP'] = { date: '2026-03-15', assessor: '張家豪', cert: 'MAP-2026-055' };
  progress['L3-EXP-V11-PRE-EXPEDITION'] = { date: '2026-05-24', assessor: '張家豪', cert: 'EXPTR-2026-021' };
  progress['L3-EXP-V11-HIKING'] = { date: '2026-08-23', assessor: '張家豪', cert: 'VS-EXP-2026-091' };
  progress['OT-FA'] = { date: '2026-05-03', cert: 'VSFA-2026-204' };
  progress['OT-ENV'] = { date: '2026-04-26', cert: 'WSEP-2026-077' };

  return newBook({
    member: {
      nameZh: '張芷晴',
      nameEn: 'CHEUNG Tsz-ching',
      scoutId: '25081420',
      hkidPrefix: 'Y418',
      gender: 'F',
      unit: '港島第 28 旅深資童軍團',
      group: '港島第 28 旅',
      district: '灣仔區',
      region: '港島地域',
      dob: '2009-04-16',
      placeOfBirth: '香港',
      phone: '9234 5678',
      email: 'tc.cheung@example.org',
      addressZh: '香港灣仔軒尼詩道 288 號 15 樓 B 室',
      addressEn: 'Flat B, 15/F, 288 Hennessy Road, Wan Chai, Hong Kong',
      bloodType: 'A+',
      emergencyName: '張國華（父親）',
      emergencyPhone: '9123 8899',
      sponsoringAuthority: '灣仔青年服務團',
      groupAddress: '香港灣仔愛群道社區中心 4 樓',
      gsl: '梁耀輝',
      vsl: '陳志軒',
      vslPhone: '9345 6789',
      dateJoined: '2025-09-06',
      dateScoutMovement: '2018-10-01',
    },
    holderSignature: { png: SIG_HOLDER, name: '張芷晴', title: '持有人', at: '2025-09-06' },
    scouting: {
      grasshopper: { from: '2016-09', to: '2018-08', unit: '港島第 28 旅小童軍團', post: '小童軍', award: '金箭章' },
      cub: { from: '2018-09', to: '2021-08', unit: '港島第 28 旅幼童軍團', post: '隊長', award: '金紫荊獎章' },
      scout: { from: '2021-09', to: '2025-08', unit: '港島第 28 旅童軍團', post: '小隊長', award: '總領袖獎章' },
    },
    renewals: [
      { id: uid('ren'), date: '2025-09-06', validUntil: '2025-12-31', note: '港島第 28 旅 · 陳志軒簽署', signature: vslSig('2025-09-06') },
      { id: uid('ren'), date: '2026-01-03', validUntil: '2026-12-31', note: '港島第 28 旅 · 陳志軒簽署', signature: vslSig('2026-01-03') },
    ],
    pages: {
      p10: {
        safeCertNo: 'SFH-2025-99102',
        investitureDate: '2025-11-01',
        vslName: '陳志軒',
        vslSig: vslSig('2025-11-01'),
      },
      p13: {
        planInitials: '陳志軒',
        planDate: '2026-02-28',
        vslName: '陳志軒',
        vslSig: vslSig('2026-03-01'),
        completedDate: '2026-03-01',
        certNo: 'VSEP-2026-118',
      },
      p14: {
        workshopCertNo: 'VSEC-2026-048',
        workshopDate: '2026-04-12',
        assessorName: '周國樑',
        assessorPost: '區深資童軍領袖',
        assessorDate: '2026-04-12',
        assessorSig: vslSig('2026-04-12'),
        completedDate: '2026-04-19',
        certNo: 'VSPB-2026-215',
      },
      p15: {
        part1Choice: 'L3-SERVICE-01',
        part1CertNo: 'FA30-88219',
        part1Assessor: '陳志軒',
        part1Post: '深資童軍團長',
        part1Date: '2026-05-03',
        part2Choice: 'L3-SERVICE-06',
        part2CertNo: 'MHFA-2026-312',
        part2Assessor: '黃敏儀',
        part2Post: '助理區總監（深資）',
        part2Date: '2026-06-14',
        completedDate: '2026-06-20',
        certNo: 'VSSB-2026-188',
      },
      p16: {
        category: 'scoutcraft',
        subItemId: 'L3-ACT-V11-PIONEERING',
        summary: '完成港島地域深資童軍先鋒工程訓練班（證書編號 PIO-2026-109），並於大潭童軍中心主持三腳瞭望台及雙索橋架設實習。',
      },
      p17: {
        comments: '繩結及編結紮實，安全檢查嚴謹，能清晰指導團員分工完成工程架設。',
        assessorName: '李偉傑',
        assessorPost: '先鋒工程教練員',
        assessorDate: '2026-07-19',
        completedDate: '2026-07-26',
        certNo: 'VSAB-2026-142',
      },
      p18: {
        preTraining: '深資童軍地圖閱讀及遠足訓練班（EXPTR-2026-021）',
        selectedItem: 'L3-EXP-V11-HIKING',
        summary: '2026年8月21至23日（三日兩夜）於西貢東郊野公園進行徒步遠足探險，路線由北潭涌經萬宜、浪茄、西灣、鹹田、赤徑至嶂上，總距離 44 公里，以無痕山林為考察主題。',
      },
      p19: {
        comments: '小隊路線規劃周詳，天氣應變及營地管理表現成熟，考察報告圖文並茂。',
        assessorName: '張家豪',
        assessorPost: '一級遠足審核員',
        assessorNo: 'HA-1084',
        regNo: 'VSEXP-26-309',
        assessorDate: '2026-08-23',
        completedDate: '2026-09-05',
        certNo: 'VSEB-2026-099',
      },
      p20: {
        vslName: '陳志軒',
        vslSig: vslSig('2026-09-12'),
        completedDate: '2026-09-12',
        certNo: 'VSA-2026-0318',
        dcComments: '張員積極投入執行委員會團務，四個段章規劃均衡且具反思深度，鼓勵繼續挑戰榮譽童軍獎章。',
        dcName: '何國榮',
        dcDate: '2026-09-20',
      },
      p34: {
        faCompletedDate: '2026-05-03',
        faCertNo: 'VSFA-2026-204',
      },
    },
    wosmBadges: [{ id: uid('w'), badge: '世界童軍環境章 World Scout Environment Badge', certNo: 'WSEP-2026-077', date: '2026-04-26' }],
    additional: [
      { id: uid('add'), period: '2025-10 至 2026-09', item: '深資童軍團執行委員會文書', desc: '負責會議紀錄、年度團務計劃整理及露營物資協調。' },
    ],
    expeditions: [
      { id: uid('exp'), period: '2026-08-21 至 08-23', item: '西貢東三日兩夜 44 公里遠足旅程', desc: '戶外探險段章評核旅程（北潭涌—浪茄—鹹田—嶂上）。' },
    ],
    progress,
  });
}
