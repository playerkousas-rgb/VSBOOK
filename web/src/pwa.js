export const UPDATE_EVENT = 'vsbook:update';
export const UPDATED_EVENT = 'vsbook:updated';

let refreshing = false;
let pendingVersion = '';
let registration = null;

/** 讀取伺服器上最新一版的版號（不經快取），供更新提示顯示「v1.0.1 → v1.0.2」。 */
async function peekRemoteVersion() {
  try {
    const res = await fetch('/index.html', { cache: 'no-store' });
    if (!res.ok) return '';
    const html = await res.text();
    const hit = /<meta\s+name=["']app-version["']\s+content=["']([^"']+)["']/i.exec(html);
    return hit ? hit[1] : '';
  } catch {
    return '';
  }
}

function announce(version) {
  if (version) pendingVersion = version;
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: { version: pendingVersion } }));
}

/** 檢查是否有新版本正在等候接手（waiting），有就發更新提示。 */
async function checkWaiting(reg) {
  if (!reg) return;
  if (reg.waiting && navigator.serviceWorker.controller) {
    const version = await peekRemoteVersion();
    announce(version);
  }
}

/** 一次完整的「主動查更新」：向伺服器抓 sw.js，發現新版本即進入 waiting。 */
async function checkForUpdate(reg) {
  if (!reg) return;
  try {
    await reg.update();
  } catch {
    /* 離線時忽略 */
  }
  await checkWaiting(reg);
}

export function registerPwa() {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  if (!import.meta.env.PROD) return;

  // 首次安裝時 SW 會 clients.claim()，同樣觸發 controllerchange；
  // 只有「本來已有舊版 SW 在控制」才是真正的版本交替，才需要自動重載。
  const hadController = Boolean(navigator.serviceWorker.controller);

  // 新 SW 接手後自動重載一次，用戶全程不用刪除 APP、不用重裝
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing || !hadController) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener('load', async () => {
    try {
      registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

      // 已安裝一段時間後才開新版本：舊 SW 仍在前台，新的已安裝並在 waiting
      await checkWaiting(registration);

      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            peekRemoteVersion().then((v) => announce(v));
          }
        });
      });

      // 由背景切回前景即主動查更新（用戶加到主畫面後最常用的回來方式）
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkForUpdate(registration);
      });
      window.addEventListener('focus', () => checkForUpdate(registration));
      window.addEventListener('online', () => checkForUpdate(registration));

      // 長開不關的平板／桌面：每 30 分鐘自動查一次，免用戶手動重開
      setInterval(() => checkForUpdate(registration), 30 * 60 * 1000);
    } catch {
      /* offline SW optional on unsupported origins */
    }
  });
}

/** 用戶按下「立即更新」：通知 waiting 的 SW 接手，controllerchange 會自動重載。 */
export async function applyPwaUpdate() {
  try {
    const reg = registration || (await navigator.serviceWorker.getRegistration());
    if (reg?.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      // 保險：若 controllerchange 因瀏覽器差異未觸發，3 秒後自行重載
      setTimeout(() => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      }, 3000);
      return;
    }
    if (reg) {
      await reg.update();
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        return;
      }
    }
  } catch {
    /* fall through to reload */
  }
  window.location.reload();
}

export const pendingUpdateVersion = () => pendingVersion;
