/* ==========================================================================
   Vercel Serverless Function — GET / POST /api/vsbadge
   --------------------------------------------------------------------------
   與兄弟系統 vsbadge 進行伺服器端純進度互通（不錄入個人資料，只錄入進度）：
   1. 預設自動對接公開 vsbadge 主站 `https://vsbadge.vercel.app`（可由環境變數 `VSBADGE_ORIGIN` 覆寫）。
   2. 亦相容直接設定 `TROOP_<ID>_NAME` / `TROOP_<ID>_BACKEND` / `TROOP_<ID>_APIKEY` 直連旅團 GAS。
   3. 前端永不提交後端 URL（杜絕 SSRF）；只開放進度操作白名單：
      - GET  /api/vsbadge  → { success: true, origin, troops }
      - POST /api/vsbadge  → action ∈ { login, logout, load, save, saveOtherBadge }
   4. 伺服器端強制過濾個人資料欄位：禁止新增／修改帳戶，只讀寫 SCOUT ID（YMIS）與訓練進度。
   ========================================================================== */

const DEFAULT_VSBADGE_ORIGIN = 'https://vsbadge.vercel.app';
const EXEC_URL_RE = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{10,}\/exec\/?$/i;
const TEST_LOCAL_RE = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/[A-Za-z0-9._~\-/?=&%]*)?$/;
const ALLOWED_ACTIONS = new Set(['login', 'logout', 'load', 'save', 'saveOtherBadge']);
const MAX_BODY_BYTES = 1024 * 1024;
const TIMEOUT_MS = 30000;

export function resolveVsBadgeOrigin() {
  const raw = String(process.env.VSBADGE_ORIGIN || DEFAULT_VSBADGE_ORIGIN).trim();
  try {
    const u = new URL(raw);
    if (u.username || u.password) return DEFAULT_VSBADGE_ORIGIN;
    if (u.protocol === 'https:') return u.origin;
    if (
      process.env.VSBOOK_PROXY_TEST === '1' &&
      process.env.VERCEL !== '1' &&
      (u.hostname === '127.0.0.1' || u.hostname === 'localhost')
    ) {
      return u.origin;
    }
  } catch {
    /* fallback below */
  }
  return DEFAULT_VSBADGE_ORIGIN;
}

function normalizeGasUrl(url) {
  const raw = String(url ?? '').trim();
  if (!raw) return '';
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' || u.hostname !== 'script.google.com' || u.search || u.hash || u.username || u.password || u.port) {
      return raw;
    }
    const m = u.pathname.match(/^\/a\/[^/]+\/macros\/s\/([A-Za-z0-9_-]+)\/exec\/?$/);
    return m ? `https://script.google.com/macros/s/${m[1]}/exec` : raw;
  } catch {
    return raw;
  }
}

function isTrustedGasUrl(url) {
  if (typeof url !== 'string' || url.length > 300) return false;
  if (EXEC_URL_RE.test(normalizeGasUrl(url))) return true;
  if (process.env.VSBOOK_PROXY_TEST === '1' && process.env.VERCEL !== '1' && TEST_LOCAL_RE.test(url.trim())) return true;
  return false;
}

function getLocalTroopRegistry() {
  const ids = new Set();
  for (const key of Object.keys(process.env)) {
    const m = key.match(/^TROOP_([0-9A-Za-z_-]{1,32})_(NAME|EN|BACKEND|APIKEY)$/);
    if (m) ids.add(m[1]);
  }
  const out = Object.create(null);
  for (const id of ids) {
    const name = String(process.env[`TROOP_${id}_NAME`] || '').trim();
    const en = String(process.env[`TROOP_${id}_EN`] || '').trim();
    const backend = normalizeGasUrl(process.env[`TROOP_${id}_BACKEND`] || '');
    const apikey = String(process.env[`TROOP_${id}_APIKEY`] || '').trim();
    if (name && apikey && backend && isTrustedGasUrl(backend)) {
      out[id] = { id, name, en, backend: backend.replace(/\/$/, ''), apikey };
    }
  }
  return out;
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.length;
    if (total > MAX_BODY_BYTES) return null;
    chunks.push(buf);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return null;
  }
}

function sendJson(res, status, obj) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    res.status(status).json(obj);
  } else {
    res.statusCode = status;
    res.end(JSON.stringify(obj));
  }
}

/** 剝除任何個人私隱欄位，只保留成員編號、顯示名稱與純進度日期。 */
export function sanitizeLoadResponse(raw) {
  if (!raw || typeof raw !== 'object') return { success: false, error: '無效回應' };
  if (!raw.success) return { success: false, error: String(raw.error || '讀取進度失敗') };

  const members = Array.isArray(raw.members)
    ? raw.members
        .filter((m) => m && typeof m === 'object' && (m.ymis || m.scoutId))
        .map((m) => {
          const ymis = String(m.ymis || m.scoutId || '').trim();
          return {
            ymis,
            scoutId: ymis,
            name: String(m.name || '').trim().slice(0, 40),
            role: String(m.role || 'member').trim(),
            joinDate: String(m.joinDate || '').trim().slice(0, 10),
          };
        })
    : [];

  const flatProgress = {};
  const mergeProgress = (source) => {
    if (!source || typeof source !== 'object') return;
    for (const [ymis, items] of Object.entries(source)) {
      if (!items || typeof items !== 'object' || ymis === '說明') continue;
      if (!flatProgress[ymis]) flatProgress[ymis] = {};
      for (const [itemId, val] of Object.entries(items)) {
        const date = typeof val === 'string' ? val : val?.date || '';
        if (date) flatProgress[ymis][itemId] = String(date).slice(0, 10);
      }
    }
  };
  mergeProgress(raw.flatProgress);
  mergeProgress(raw.progress);

  const otherBadges = {};
  if (raw.otherBadges && typeof raw.otherBadges === 'object') {
    for (const [ymis, map] of Object.entries(raw.otherBadges)) {
      if (!map || typeof map !== 'object') continue;
      otherBadges[ymis] = {};
      for (const [badgeId, val] of Object.entries(map)) {
        const date = typeof val === 'string' ? val : val?.date || '';
        if (date) otherBadges[ymis][badgeId] = { date: String(date).slice(0, 10) };
      }
    }
  }

  return {
    success: true,
    privacy: 'progress-only',
    members,
    flatProgress,
    progress: flatProgress,
    otherBadges,
  };
}

/** 清洗寫入 vsbadge 的進度陣列（嚴禁夾帶任何個人資料欄位）。 */
export function sanitizeSaveChanges(changes, fallbackConfirmer = '') {
  if (!Array.isArray(changes)) return [];
  const out = [];
  for (const c of changes) {
    if (!c || typeof c !== 'object') continue;
    const ymis = String(c.ymis || c.scoutId || '').trim().slice(0, 32);
    const itemId = String(c.itemId || '').trim().slice(0, 64);
    const date = String(c.date || '').trim().slice(0, 10);
    if (!ymis || !itemId || (!c.uncomplete && !/^\d{4}-\d{2}-\d{2}$/.test(date))) continue;
    out.push({
      ymis,
      itemId,
      date: c.uncomplete ? '' : date,
      uncomplete: Boolean(c.uncomplete),
      confirmer: String(c.confirmer || fallbackConfirmer || '').trim().slice(0, 60),
      ...(c.note ? { note: String(c.note).trim().slice(0, 200) } : {}),
    });
  }
  return out;
}

export function sanitizeOtherBadgeRecords(records) {
  if (!Array.isArray(records)) return [];
  const out = [];
  for (const r of records) {
    if (!r || typeof r !== 'object') continue;
    const ymis = String(r.ymis || r.scoutId || '').trim().slice(0, 32);
    const badgeId = String(r.badgeId || '').trim().slice(0, 64);
    const date = String(r.date || '').trim().slice(0, 10);
    if (!ymis || !badgeId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    out.push({
      ymis,
      badgeId,
      badgeName: String(r.badgeName || badgeId).trim().slice(0, 80),
      date,
      cert: String(r.cert || '').trim().slice(0, 60),
    });
  }
  return out;
}

export default async function handler(req, res) {
  const origin = resolveVsBadgeOrigin();
  const localRegistry = getLocalTroopRegistry();

  if (req.method === 'GET') {
    const troops = Object.create(null);
    for (const [id, t] of Object.entries(localRegistry)) {
      troops[id] = { name: t.name, ...(t.en ? { en: t.en } : {}) };
    }
    try {
      const up = await fetch(`${origin}/api/troops`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(12000),
      });
      if (up.ok) {
        const json = await up.json().catch(() => null);
        if (json?.troops && typeof json.troops === 'object') {
          for (const [id, info] of Object.entries(json.troops)) {
            if (!troops[id] && info && typeof info === 'object' && info.name) {
              troops[id] = { name: String(info.name), ...(info.en ? { en: String(info.en) } : {}) };
            }
          }
        }
      }
    } catch {
      /* 若離線或上游不可達，仍回傳本機已設定的旅團清單 */
    }
    return sendJson(res, 200, {
      success: true,
      origin,
      privacy: 'progress-only',
      troops,
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return sendJson(res, 405, { success: false, error: '只支援 GET 或 POST' });
  }

  const body = await readBody(req);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return sendJson(res, 400, { success: false, error: '請求格式錯誤' });
  }

  const action = String(body.action || '').trim();
  const troopId = String(body.troopId || '').trim();
  const rawData = body.data && typeof body.data === 'object' && !Array.isArray(body.data) ? body.data : {};

  if (!ALLOWED_ACTIONS.has(action)) {
    return sendJson(res, 403, {
      success: false,
      error: 'VSBOOK 只支援同步訓練進度（不錄入或修改任何個人資料）',
    });
  }
  if (!/^[0-9A-Za-z_-]{1,32}$/.test(troopId)) {
    return sendJson(res, 400, { success: false, error: '請選擇有效的旅團編號' });
  }

  let outboundData = {};
  if (action === 'login') {
    const login_id = String(rawData.login_id || '').trim().slice(0, 120);
    const password = String(rawData.password || '');
    if (!login_id || !password) {
      return sendJson(res, 400, { success: false, error: '請輸入 vsbadge 領袖帳號及密碼' });
    }
    outboundData = { login_id, password };
  } else {
    const token = String(rawData.token || '').trim();
    if (token.length < 4 || token.length > 4096) {
      return sendJson(res, 401, { success: false, error: '尚未登入 vsbadge 或登入已過期' });
    }
    if (action === 'logout' || action === 'load') {
      outboundData = { token };
    } else if (action === 'save') {
      const confirmer = String(rawData.confirmer || '').trim().slice(0, 60);
      const changes = sanitizeSaveChanges(rawData.changes, confirmer);
      if (!changes.length) {
        return sendJson(res, 400, { success: false, error: '沒有有效的進度項目需要寫入' });
      }
      outboundData = { token, confirmer, changes };
    } else if (action === 'saveOtherBadge') {
      const records = sanitizeOtherBadgeRecords(rawData.records);
      if (!records.length) {
        return sendJson(res, 400, { success: false, error: '沒有有效的其他獎章進度需要寫入' });
      }
      outboundData = { token, records };
    }
  }

  try {
    const directTroop = localRegistry[troopId];
    let rawJson = null;

    if (directTroop) {
      let up;
      if (action === 'load') {
        const qs = new URLSearchParams({ action: 'load', apikey: directTroop.apikey, token: outboundData.token });
        up = await fetch(`${directTroop.backend}?${qs.toString()}`, {
          method: 'GET',
          redirect: 'follow',
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } else {
        up = await fetch(directTroop.backend, {
          method: 'POST',
          redirect: 'follow',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ ...outboundData, action, apikey: directTroop.apikey }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      }
      rawJson = await up.json().catch(() => null);
    } else {
      const up = await fetch(`${origin}/api/proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8', Accept: 'application/json' },
        body: JSON.stringify({ troopId, action, data: outboundData }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      rawJson = await up.json().catch(() => null);
    }

    if (!rawJson || typeof rawJson !== 'object') {
      return sendJson(res, 502, { success: false, error: 'vsbadge 後端回應格式異常，請稍後重試' });
    }

    if (action === 'load') {
      return sendJson(res, 200, sanitizeLoadResponse(rawJson));
    }

    if (action === 'login' && rawJson.success) {
      return sendJson(res, 200, {
        success: true,
        token: rawJson.token,
        user: {
          name: String(rawJson.user?.name || '').trim(),
          role: String(rawJson.user?.role || '').trim(),
        },
      });
    }

    return sendJson(res, 200, rawJson);
  } catch (e) {
    const timeout = e && (e.name === 'TimeoutError' || e.name === 'AbortError');
    return sendJson(res, timeout ? 504 : 502, {
      success: false,
      error: timeout ? '連接 vsbadge 後端逾時，請稍後重試' : '暫時無法連接 vsbadge 雲端後端，可先使用純進度 JSON 匯入／匯出',
    });
  }
}
