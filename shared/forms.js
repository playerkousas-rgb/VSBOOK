// VSBOOK — 三張官方表格自動帶入與驗證邏輯
// 對應：
//   FORM PT/65 (8/2026)  深資童軍獎章及榮譽童軍獎章考驗計劃（1 頁）
//   FORM PT/19 (10/2026) 深資童軍獎章及證書申請表（3 頁）
//   FORM PT/20 (10/2026) 榮譽童軍獎章及證書申請表（3 頁）

import { ITEM_INDEX, sanitizeHkidPrefix } from './book.js';

export const syllabusItem = (id) => ITEM_INDEX[id] || null;

export const FORM_META = {
  pt65: {
    id: 'pt65',
    code: 'FORM PT/65 (8/2026)',
    short: 'PT/65',
    title: '深資童軍獎章及榮譽童軍獎章考驗計劃',
    en: 'Planning for Assessment of the Venture Scout Award and the Dragon Scout Award',
    when: '完成深資童軍肩章後、開展段章及金帶考驗前提交／修訂',
    pages: 1,
    duplexNote: '單頁 A4 表格',
  },
  pt19: {
    id: 'pt19',
    code: 'FORM PT/19 (10/2026)',
    short: 'PT/19',
    title: '深資童軍獎章及證書申請表',
    en: 'Application Form for the Venture Scout Award and Certificate',
    when: '完成深資童軍獎章四個段章及區總監接見後遞交',
    pages: 3,
    duplexNote: '第 1–2 頁必須雙面列印於同一張 A4 紙，連同第 3 頁查閱清單及證明副本遞交',
  },
  pt20: {
    id: 'pt20',
    code: 'FORM PT/20 (10/2026)',
    short: 'PT/20',
    title: '榮譽童軍獎章及證書申請表',
    en: 'Application Form for the Dragon Scout Award and Certificate',
    when: '完成榮譽童軍獎章四條金帶及區、地域總監接見後遞交（每年 9 月 15 日或以前交抵總會可於同年大會操獲頒）',
    pages: 3,
    duplexNote: '第 1–2 頁必須雙面列印於同一張 A4 紙，連同第 3 頁查閱清單及證明副本遞交',
  },
};

export const FORM_ORDER = ['pt65', 'pt19', 'pt20'];

const CATEGORY_LABELS = {
  scoutcraft: '童軍技能 Scoutcraft',
  sport: '康樂體育 Physical Recreation',
  new: '新體驗 New Experience',
};

const SERVICE_PART1_LABELS = {
  'L3-SERVICE-01': '急救 First Aid',
  'L3-SERVICE-02': '拯溺 (I) Lifesaving (I)',
};

const SERVICE_PART2_LABELS = {
  'L3-SERVICE-03': '消防 Fireman',
  'L3-SERVICE-04': '拯溺 (II) Lifesaving (II)',
  'L3-SERVICE-05': '手語 Sign Language',
  'L3-SERVICE-06': '精神健康急救 Mental Health First Aid',
  'L3-SERVICE-07': 'SOUL Keeper 精神健康守護者課程 (Level 2)',
  'L3-SERVICE-08': '共融大使 Inclusion Ambassador',
};

const SERVICE_BAR_LABELS = {
  'L4-SERV-01': '童軍及社區服務 Scout and Community Service',
  'L4-SERV-02': '志願服務 Voluntary Service',
  'L4-SERV-03': '寰宇童軍計劃 Scouts of the World Award',
};

export function computeAge(dob, refDate = new Date()) {
  if (!dob) return '';
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return '';
  const ref = refDate instanceof Date ? refDate : new Date(refDate);
  let age = ref.getFullYear() - birth.getFullYear();
  const m = ref.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) age -= 1;
  return age >= 0 && age < 120 ? String(age) : '';
}

function firstSummaryLine(text, max = 95) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function itemLabel(id) {
  if (!id) return '';
  return ITEM_INDEX[id]?.name || id;
}

/** 由紀錄冊自動推導三張官方表格欄位（可再由 book.forms[formId] 覆寫個別格）。 */
export function buildFormValues(book, formId, refDate = new Date()) {
  const m = book?.member || {};
  const p = book?.pages || {};
  const ov = book?.forms?.[formId] || {};

  const common = {
    nameZh: m.nameZh || '',
    nameEn: (m.nameEn || '').toUpperCase(),
    hkidPrefix: sanitizeHkidPrefix(m.hkidPrefix),
    dob: m.dob || '',
    age: computeAge(m.dob, refDate),
    gender: m.gender || '',
    addressZh: m.addressZh || '',
    addressEn: m.addressEn || '',
    group: m.group || '',
    district: m.district || '',
    region: m.region || '',
    scoutId: m.scoutId || '',
    phone: m.phone || '',
    email: m.email || '',
    mbDate: p.p10?.investitureDate || '',
    epDate: p.p13?.completedDate || '',
    vsaCertNo: p.p20?.certNo || '',
    vsaDate: p.p20?.completedDate || '',
    returnName: (m.nameZh || m.nameEn || '').toUpperCase(),
    returnAddress: m.addressZh || m.addressEn || '',
    applicantDate: new Date(refDate).toISOString().slice(0, 10),
    nominatorName: m.vsl || m.gsl || '',
  };

  // L3 段章自動推導
  const l3ProjectDetail = p.p14?.workshopCertNo
    ? `深資童軍執行委員會工作坊（證書：${p.p14.workshopCertNo}）`
    : '深資童軍執行委員會工作坊';
  const l3ProjectDate = p.p14?.completedDate || p.p14?.workshopDate || book?.progress?.['L3-PROJECT-01']?.date || '';

  const l3Service1 = SERVICE_PART1_LABELS[p.p15?.part1Choice] || '';
  const l3Service1Detail = [l3Service1, p.p15?.part1CertNo ? `（${p.p15.part1CertNo}）` : ''].filter(Boolean).join(' ');
  const l3Service1Date = p.p15?.part1Date || book?.progress?.[p.p15?.part1Choice]?.date || '';

  const l3Service2 = SERVICE_PART2_LABELS[p.p15?.part2Choice] || '';
  const l3Service2Detail = [l3Service2, p.p15?.part2CertNo ? `（${p.p15.part2CertNo}）` : ''].filter(Boolean).join(' ');
  const l3Service2Date = p.p15?.part2Date || book?.progress?.[p.p15?.part2Choice]?.date || '';

  const l3ActCat = CATEGORY_LABELS[p.p16?.category] || '';
  const l3ActDetail = [itemLabel(p.p16?.subItemId), firstSummaryLine(p.p16?.summary)].filter(Boolean).join(' — ');
  const l3ActDate = p.p17?.completedDate || p.p17?.assessorDate || '';

  const l3ExpTraining = p.p18?.preTraining || '';
  const l3ExpTrainingDate =
    book?.progress?.['L3-EXP-V11-PRE-EXPEDITION']?.date ||
    book?.progress?.['L3-EXP-V11-PRE-MAP']?.date ||
    book?.progress?.['L3-EXP-V11-PRE-SEA']?.date ||
    '';
  const l3ExpElective = [itemLabel(p.p18?.selectedItem), firstSummaryLine(p.p18?.summary, 80)].filter(Boolean).join(' — ');
  const l3ExpDate = p.p19?.completedDate || p.p19?.assessorDate || '';

  // L4 金帶自動推導
  const l4ProjDetail = [itemLabel(p.p21?.selectedItem), firstSummaryLine(p.p21?.summary, 90)].filter(Boolean).join(' — ');
  const l4ProjDate = p.p22?.completedDate || p.p22?.assessorDate || '';

  const l4ServDetail = [SERVICE_BAR_LABELS[p.p23?.selectedItem] || '', firstSummaryLine(p.p23?.summary, 85)]
    .filter(Boolean)
    .join(' — ');
  const l4ServDate = p.p24?.completedDate || p.p24?.assessorDate || '';

  const l4ActCatA = CATEGORY_LABELS[p.p25?.category] || '';
  const l4ActDetailA = [itemLabel(p.p25?.subItemId), firstSummaryLine(p.p25?.summary, 85)].filter(Boolean).join(' — ');
  const l4ActDateA = p.p26?.completedDate || p.p26?.assessorDate || '';

  const l4ActCatB = CATEGORY_LABELS[p.p27?.category] || '';
  const l4ActDetailB = [itemLabel(p.p27?.subItemId), firstSummaryLine(p.p27?.summary, 85)].filter(Boolean).join(' — ');
  const l4ActDateB = p.p28?.completedDate || p.p28?.assessorDate || '';

  const l4ExpTraining = p.p29?.preTraining || l3ExpTraining;
  const l4ExpTrainingDate = p.p29?.preTrainingDate || l3ExpTrainingDate;
  const l4ExpElective = [itemLabel(p.p29?.selectedItem), firstSummaryLine(p.p29?.summary, 80)].filter(Boolean).join(' — ');
  const l4ExpDate = p.p30?.completedDate || p.p30?.assessorDate || '';

  const derived = {
    ...common,
    l3ProjectDetail,
    l3ProjectFrom: p.p14?.workshopDate || '',
    l3ProjectTo: l3ProjectDate,
    l3ProjectDate,
    l3Service1Detail,
    l3Service1From: '',
    l3Service1To: l3Service1Date,
    l3Service1Date,
    l3Service2Detail,
    l3Service2From: '',
    l3Service2To: l3Service2Date,
    l3Service2Date,
    l3ActCat,
    l3ActDetail,
    l3ActFrom: '',
    l3ActTo: l3ActDate,
    l3ActDate,
    l3ExpTraining,
    l3ExpTrainingFrom: '',
    l3ExpTrainingTo: l3ExpTrainingDate,
    l3ExpTrainingDate,
    l3ExpElective,
    l3ExpFrom: '',
    l3ExpTo: l3ExpDate,
    l3ExpDate,
    l4ProjDetail,
    l4ProjFrom: '',
    l4ProjTo: l4ProjDate,
    l4ProjDate,
    l4ServDetail,
    l4ServFrom: '',
    l4ServTo: l4ServDate,
    l4ServDate,
    l4ActCatA,
    l4ActDetailA,
    l4ActFromA: '',
    l4ActToA: l4ActDateA,
    l4ActDateA,
    l4ActCatB,
    l4ActDetailB,
    l4ActFromB: '',
    l4ActToB: l4ActDateB,
    l4ActDateB,
    l4ExpTraining,
    l4ExpTrainingFrom: '',
    l4ExpTrainingTo: l4ExpTrainingDate,
    l4ExpTrainingDate,
    l4ExpElective,
    l4ExpFrom: '',
    l4ExpTo: l4ExpDate,
    l4ExpDate,
  };

  const merged = { ...derived };
  Object.entries(ov).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') merged[k] = v;
  });
  merged.hkidPrefix = sanitizeHkidPrefix(merged.hkidPrefix);
  return merged;
}

/** 檢查申請表尚缺哪些必填資料，方便印表前提醒成員。 */
export function formReadiness(book, formId) {
  const v = buildFormValues(book, formId);
  const missing = [];
  if (!v.nameZh && !v.nameEn) missing.push('姓名');
  if (!v.scoutId) missing.push('童軍成員編號 Scout ID');
  if (!v.dob) missing.push('出生日期');
  if (!v.group) missing.push('所屬旅團');

  if (formId === 'pt19') {
    if (!v.hkidPrefix) missing.push('香港身份證首四位（如 A123）');
    if (!v.mbDate) missing.push('會員章宣誓日期（第 10 頁）');
    if (!v.epDate) missing.push('深資童軍肩章完成日期（第 13 頁）');
    if (!v.l3ProjectDate) missing.push('活動策劃段章完成日期（第 14 頁）');
    if (!v.l3Service1Date || !v.l3Service2Date) missing.push('社會服務段章選修 I/II 日期（第 15 頁）');
    if (!v.l3ActDate) missing.push('多元技能段章完成日期（第 17 頁）');
    if (!v.l3ExpDate) missing.push('戶外探險段章完成日期（第 19 頁）');
  } else if (formId === 'pt20') {
    if (!v.hkidPrefix) missing.push('香港身份證首四位（如 A123）');
    if (!v.vsaCertNo || !v.vsaDate) missing.push('深資童軍獎章證書號碼及日期（第 20 頁）');
    if (!v.l4ProjDate) missing.push('活動策劃金帶完成日期（第 22 頁）');
    if (!v.l4ServDate) missing.push('社會服務金帶完成日期（第 24 頁）');
    if (!v.l4ActDateA || !v.l4ActDateB) missing.push('多元技能金帶兩個範疇完成日期（第 26、28 頁）');
    if (!v.l4ExpDate) missing.push('戶外探險金帶完成日期（第 30 頁）');
  }

  return { ready: missing.length === 0, missing, values: v };
}

export const PT19_CHECKLIST = [
  { key: 'hkid', group: 'core', zh: '香港身份證／護照', en: 'Hong Kong Identity Card / Passport', auto: (b) => Boolean(b?.member?.hkidPrefix) },
  { key: 'orig', group: 'core', zh: '所有證明文件正本', en: 'Originals of all Documentary Evidence', auto: () => false },
  { key: 'sid', group: 'core', zh: '有效童軍成員編號', en: 'Valid Scout ID', auto: (b) => Boolean(b?.member?.scoutId) },
  { key: 'p1_5', group: 'book', zh: '個人及會員資格紀錄（深資童軍紀錄冊第 1、2、4、5 頁）', en: 'Personal and Membership Record (Page 1, 2, 4, 5)', auto: (b) => Boolean(b?.member?.nameZh && (b?.renewals || []).length > 0) },
  { key: 'p9_10', group: 'book', zh: '會員章考驗紀錄（深資童軍紀錄冊第 9、10 頁）', en: 'Membership Badge Assessment Record (Page 9, 10)', auto: (b) => Boolean(b?.pages?.p10?.investitureDate) },
  { key: 'p11_13', group: 'book', zh: '深資童軍肩章考驗紀錄（深資童軍紀錄冊第 11、12、13 頁）', en: 'Venture Scout Epaulettes Assessment Record (Page 11, 12, 13)', auto: (b) => Boolean(b?.pages?.p13?.completedDate) },
  { key: 'p14_20', group: 'book', zh: '深資童軍獎章考驗紀錄（深資童軍紀錄冊第 14 至 20 頁）', en: 'Venture Scout Award Assessment Record (Page 14 to 20)', auto: (b) => Boolean(b?.pages?.p20?.completedDate || b?.pages?.p19?.completedDate) },
  { key: 'c_proj', group: 'cert', zh: '活動策劃段章證書', en: 'Project Badge Certificate', auto: (b) => Boolean(b?.pages?.p14?.certNo) },
  { key: 'c_wksp', group: 'cert', zh: '深資童軍執行委員會工作坊證書', en: 'Venture Scout Executive Committee Workshop Certificate', auto: (b) => Boolean(b?.pages?.p14?.workshopCertNo) },
  { key: 'c_serv', group: 'cert', zh: '社會服務段章證書', en: 'Service Badge Certificate', auto: (b) => Boolean(b?.pages?.p15?.certNo) },
  { key: 'c_serv1', group: 'cert', zh: '社會服務段章 - 選修部分（I）證書', en: 'Service Badge - Elective Part (I) Certificate', auto: (b) => Boolean(b?.pages?.p15?.part1CertNo) },
  { key: 'c_serv2', group: 'cert', zh: '社會服務段章 - 選修部分（II）證書', en: 'Service Badge - Elective Part (II) Certificate', auto: (b) => Boolean(b?.pages?.p15?.part2CertNo) },
  { key: 'c_act', group: 'cert', zh: '多元技能段章證書', en: 'Activity Badge Certificate', auto: (b) => Boolean(b?.pages?.p17?.certNo) },
  { key: 'c_act_cat', group: 'cert', zh: '多元技能段章 - 所選取範疇之證書（如需）', en: 'Activity Badge - Selected Category Certificate (If necessary)', auto: (b) => Boolean(b?.pages?.p16?.summary) },
  { key: 'c_exp', group: 'cert', zh: '戶外探險段章證書', en: 'Exploration Badge Certificate', auto: (b) => Boolean(b?.pages?.p19?.certNo) },
  { key: 'c_exp_tr', group: 'cert', zh: '戶外探險段章 - 認可之訓練證書（如需）', en: 'Exploration Badge - Recognised Training Certificate (If necessary)', auto: (b) => Boolean(b?.pages?.p18?.preTraining) },
];

export const PT20_CHECKLIST = [
  { key: 'hkid', group: 'core', zh: '香港身份證／護照', en: 'Hong Kong Identity Card / Passport', auto: (b) => Boolean(b?.member?.hkidPrefix) },
  { key: 'orig', group: 'core', zh: '所有證明文件正本', en: 'Originals of all documentary evidence', auto: () => false },
  { key: 'sid', group: 'core', zh: '有效童軍成員編號', en: 'Valid Scout ID', auto: (b) => Boolean(b?.member?.scoutId) },
  { key: 'p1_5', group: 'book', zh: '個人及會員資格紀錄（深資童軍紀錄冊第 1、2、4、5 頁）', en: 'Personal and Membership Record (Page 1, 2, 4, 5)', auto: (b) => Boolean(b?.member?.nameZh && (b?.renewals || []).length > 0) },
  { key: 'p14_20', group: 'book', zh: '深資童軍獎章考驗紀錄（深資童軍紀錄冊第 14 至 20 頁）', en: 'Venture Scout Award Assessment Record (Page 14 to 20)', auto: (b) => Boolean(b?.pages?.p20?.completedDate) },
  { key: 'p21_33', group: 'book', zh: '榮譽童軍獎章考驗紀錄（深資童軍紀錄冊第 21 至 33 頁）', en: 'Dragon Scout Award Assessment Record (Page 21 to 33)', auto: (b) => Boolean(b?.pages?.p33?.completedDate || b?.pages?.p30?.completedDate) },
  { key: 'c_vsa', group: 'cert', zh: '深資童軍獎章證書', en: 'Venture Scout Award Certificate', auto: (b) => Boolean(b?.pages?.p20?.certNo) },
  { key: 'c_pbar', group: 'cert', zh: '活動策劃金帶證書', en: 'Project Bar Certificate', auto: (b) => Boolean(b?.pages?.p22?.certNo) },
  { key: 'c_sbar', group: 'cert', zh: '社會服務金帶證書', en: 'Service Bar Certificate', auto: (b) => Boolean(b?.pages?.p24?.certNo) },
  { key: 'c_sbar_i', group: 'cert', zh: '社會服務金帶 - 所選項目證書（如需）', en: 'Service Bar - Selected Items Certificate (If necessary)', auto: (b) => Boolean(b?.pages?.p23?.summary) },
  { key: 'c_abar', group: 'cert', zh: '多元技能金帶證書', en: 'Activity Bar Certificate', auto: (b) => Boolean(b?.pages?.p26?.certNo || b?.pages?.p28?.certNo) },
  { key: 'c_abar_a', group: 'cert', zh: '多元技能金帶 - 範疇甲之證書（如需）', en: 'Activity Bar - Selected Category A Certificate (If necessary)', auto: (b) => Boolean(b?.pages?.p25?.summary) },
  { key: 'c_abar_b', group: 'cert', zh: '多元技能金帶 - 範疇乙之證書（如需）', en: 'Activity Bar - Selected Category B Certificate (If necessary)', auto: (b) => Boolean(b?.pages?.p27?.summary) },
  { key: 'c_ebar', group: 'cert', zh: '戶外探險金帶證書', en: 'Exploration Bar Certificate', auto: (b) => Boolean(b?.pages?.p30?.certNo) },
  { key: 'c_ebar_tr', group: 'cert', zh: '戶外探險金帶 - 認可之訓練證書（如需）', en: 'Exploration Bar - Recognised Training Certificate (If necessary)', auto: (b) => Boolean(b?.pages?.p29?.preTraining || b?.pages?.p18?.preTraining) },
];
