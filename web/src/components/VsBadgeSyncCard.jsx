import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  collectPendingForVsBadge,
  exportForVsBadge,
  importFromVsBadge,
  isDemoBook,
  scoutId,
} from '@shared/book.js';
import { useBook } from '../bookContext.js';
import { download, slugify } from '../bookStore.js';
import { useLang } from '../i18n.jsx';
import { Icon, useToast } from '../ui.jsx';

const VSBADGE_MEMBER_SESSION_KEY = 'vsbook.vsbadge.member.v1';

function readMemberSession() {
  try {
    return JSON.parse(window.sessionStorage.getItem(VSBADGE_MEMBER_SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

function writeMemberSession(sess) {
  try {
    if (!sess) window.sessionStorage.removeItem(VSBADGE_MEMBER_SESSION_KEY);
    else window.sessionStorage.setItem(VSBADGE_MEMBER_SESSION_KEY, JSON.stringify(sess));
  } catch {
    /* ignore */
  }
}

export default function VsBadgeSyncCard({ readOnly = false }) {
  const { book, replace } = useBook();
  const { push } = useToast();
  const { isEn } = useLang();
  const fileRef = useRef(null);

  const mySid = scoutId(book?.member);
  const [troops, setTroops] = useState({});
  const [badgeOrigin, setBadgeOrigin] = useState('https://vsbadge.vercel.app');
  const [upstreamOk, setUpstreamOk] = useState(false);
  const [loadingTroops, setLoadingTroops] = useState(false);
  const [troopId, setTroopId] = useState(() => readMemberSession()?.troopId || '');
  const [loginYmis, setLoginYmis] = useState(() => mySid || readMemberSession()?.ymis || '');
  const [password, setPassword] = useState('');
  const [session, setSession] = useState(() => readMemberSession());
  const [showLogin, setShowLogin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [remoteConfirmed, setRemoteConfirmed] = useState({});
  const [remotePendingIds, setRemotePendingIds] = useState([]);

  useEffect(() => {
    if (mySid && !loginYmis) setLoginYmis(mySid);
  }, [mySid, loginYmis]);

  const refreshTroops = async () => {
    setLoadingTroops(true);
    try {
      const response = await fetch('/api/vsbadge');
      const data = await response.json();
      if (!data?.troops || typeof data.troops !== 'object') throw new Error('Invalid troop list');
      setTroops(data.troops);
      setBadgeOrigin(data.origin || 'https://vsbadge.vercel.app');
      setUpstreamOk(data.upstreamOk === true);
      if (!troopId || troopId === '__NOT_FOUND__') {
        const first = Object.keys(data.troops)[0];
        if (first) setTroopId(first);
      }
    } catch {
      setUpstreamOk(false);
    } finally {
      setLoadingTroops(false);
    }
  };

  useEffect(() => {
    refreshTroops();
    // Fetch the troop list once on card mount; the manual refresh button calls the same function.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasBadgeSession = Boolean(session?.token && session?.ymis);
  const demoBlocked = isDemoBook(book);
  const confirmedInBookCount = useMemo(
    () =>
      Object.values(book?.progress || {}).filter(
        (p) => p?.date && (p.confirmedByBadge || p.signature?.png || p.signedAt),
      ).length,
    [book],
  );

  const pendingToSubmit = useMemo(
    () => collectPendingForVsBadge(book, remoteConfirmed, remotePendingIds),
    [book, remoteConfirmed, remotePendingIds],
  );

  const pullConfirmedFromCloud = async (activeSession = session) => {
    if (!activeSession?.token || !activeSession?.troopId || !activeSession?.ymis) return;
    if (readOnly) {
      push(isEn ? 'Exit Leader Mode to update your personal book' : '領袖只讀模式下不會修改本機紀錄冊', 'error');
      return;
    }
    setBusy(true);
    try {
      const r = await fetch('/api/vsbadge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          troopId: activeSession.troopId,
          action: 'load',
          data: { token: activeSession.token, ymis: activeSession.ymis },
        }),
      });
      const json = await r.json();
      if (!json?.success) {
        if (r.status === 401) {
          setSession(null);
          writeMemberSession(null);
        }
        throw new Error(json?.error || (isEn ? 'Failed to fetch from vsbadge' : '讀取 vsbadge 失敗'));
      }

      const confirmedMap = {
        ...(json.progress?.[activeSession.ymis] || {}),
        ...(json.otherBadges?.[activeSession.ymis] || {}),
      };
      const pendingIds = (json.pendingRequests || []).map((x) => x.item_id).filter(Boolean);
      setRemoteConfirmed(confirmedMap);
      setRemotePendingIds(pendingIds);

      const res = importFromVsBadge(json, book);
      replace(res.book);
      push(
        isEn
          ? `Imported ${res.imported} leader-confirmed items${res.skippedPending ? ` (${res.skippedPending} unconfirmed skipped)` : ''}`
          : `已無條件錄入 ${res.imported} 項領袖已核實進度${
              res.skippedPending ? `（另有 ${res.skippedPending} 項待領袖核實，未錄入）` : ''
            }`,
      );
    } catch (err) {
      push(err.message || (isEn ? 'Sync failed' : '同步失敗'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (troopId === '__NOT_FOUND__') return;
    const cleanTroop = troopId.trim();
    const cleanYmis = (loginYmis || mySid || '').trim();
    if (!cleanTroop || !cleanYmis || !password) {
      push(
        isEn
          ? 'Enter Group ID, your Scout ID and vsbadge password'
          : '請填寫旅團編號、你的童軍成員編號及 vsbadge 密碼',
        'error',
      );
      return;
    }
    setBusy(true);
    try {
      const r = await fetch('/api/vsbadge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          troopId: cleanTroop,
          action: 'login',
          data: { login_id: cleanYmis, password },
        }),
      });
      const json = await r.json();
      if (!json?.success || !json?.token) {
        throw new Error(json?.error || (isEn ? 'Sign-in failed' : '登入 vsbadge 失敗'));
      }
      const nextSess = {
        troopId: cleanTroop,
        troopName: troops[cleanTroop]?.name || cleanTroop,
        token: json.token,
        ymis: json.ymis || cleanYmis,
      };
      setSession(nextSess);
      writeMemberSession(nextSess);
      setPassword('');
      setShowLogin(false);
      if (!readOnly) {
        await pullConfirmedFromCloud(nextSess);
      } else {
        push(isEn ? 'Connected to vsbadge' : '已連接 vsbadge');
      }
    } catch (err) {
      push(err.message || (isEn ? 'Sign-in failed' : '登入失敗'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const submitBookProgressAsPending = async () => {
    if (demoBlocked) {
      push(
        isEn
          ? 'Demo sample data cannot be submitted to the live system. Reset to a blank book and fill in real records first.'
          : '示範樣本不可送交正式系統：請先清空重設為空白冊並填入真實紀錄',
        'error',
      );
      return;
    }
    if (!session?.token || !session?.troopId || !session?.ymis) {
      setShowLogin(true);
      push(
        isEn
          ? 'Sign in to your vsbadge account first'
          : '請先連接你的 vsbadge 帳戶，再送交待核實進度',
        'error',
      );
      return;
    }
    if (pendingToSubmit.length === 0) {
      push(
        isEn
          ? 'All recorded items are already confirmed or pending in vsbadge'
          : '紀錄冊內的項目均已在 vsbadge 核實或等候領袖批核，無須重複送出',
      );
      return;
    }
    setBusy(true);
    try {
      const r = await fetch('/api/vsbadge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          troopId: session.troopId,
          action: 'submitPending',
          data: {
            token: session.token,
            ymis: session.ymis,
            items: pendingToSubmit,
          },
        }),
      });
      const json = await r.json();
      if (!json?.success) {
        throw new Error(json?.error || (isEn ? 'Submission failed' : '送交失敗'));
      }
      setRemotePendingIds((prev) => [
        ...new Set([...prev, ...pendingToSubmit.map((x) => x.itemId)]),
      ]);
      push(
        isEn
          ? `Sent ${json.submitted} items to vsbadge as Pending Leader Confirmation`
          : `已將 ${json.submitted} 項進度送交 vsbadge「待領袖核實」（領袖 CONFIRM 後即可錄入回紀錄冊）`,
      );
    } catch (err) {
      push(err.message || (isEn ? 'Failed to submit to vsbadge' : '送交 vsbadge 失敗'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const onImportFile = (e) => {
    if (!session?.token || !session?.ymis) {
      if (e?.target) e.target.value = '';
      push(isEn ? 'Connect and sign in to BADGE before importing a progress file.' : '請先連接並登入 BADGE 帳戶，方可匯入進度檔。', 'error');
      return;
    }
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (readOnly) {
      push(isEn ? 'Exit Leader Mode to import into your book' : '領袖只讀模式下不可匯入修改本機紀錄冊', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        const res = importFromVsBadge(parsed, book);
        replace(res.book);
        push(
          isEn
            ? `Imported ${res.imported} leader-confirmed items${res.skippedPending ? ` (${res.skippedPending} unconfirmed skipped)` : ''}`
            : `已錄入 ${res.imported} 項領袖已核實進度${
                res.skippedPending ? `（已略過 ${res.skippedPending} 項未核實項目）` : ''
              }`,
        );
      } catch (err) {
        push(err.message || (isEn ? 'Import failed' : '匯入 vsbadge 失敗'), 'error');
      }
    };
    reader.readAsText(file);
  };

  const onExportFile = () => {
    if (!session?.token || !session?.ymis) {
      push(isEn ? 'Connect and sign in to BADGE before exporting a progress file.' : '請先連接並登入 BADGE 帳戶，方可匯出進度檔。', 'error');
      return;
    }
    if (demoBlocked) {
      push(isEn ? 'Demo sample data cannot be exported to the live system.' : '示範樣本不可匯出至正式系統：請先清空重設為空白冊並填入真實紀錄', 'error');
      return;
    }
    const payload = exportForVsBadge(book, session.troopId || troopId || '');
    download(`vsbook-pending-for-vsbadge-${slugify(mySid || 'member')}.json`, payload);
    push(isEn ? 'Exported Pending progress file (zero personal data)' : '已匯出「待領袖核實」純進度檔（不含個人資料）');
  };

  const troopEntries = Object.entries(troops);

  return (
    <section className="appxcard vsbsync">
      <h3>
        <Icon name="verified" size={16} />{' '}
        {isEn
          ? 'Sync Progress with vsbadge (Progress Only · Zero Personal Data)'
          : '與 vsbadge 同步個人進度（只同步進度 · 不錄入個人資料）'}
      </h3>
      <p className="tiny">
        {isEn
          ? 'Saves typing twice: BOOK → vsbadge always submits as “Pending Leader Confirmation” (cannot self-confirm); vsbadge → BOOK unconditionally trusts leader-confirmed items and ignores unconfirmed ones.'
          : '免除在紀錄冊與 vsbadge 重複輸入：由 BOOK 送往 vsbadge 一律轉為「待領袖核實（pending）」，必須由領袖在 vsbadge 內 CONFIRM；由 vsbadge 錄入回 BOOK 時，只無條件相信領袖已核實的資料，未核實項目絕不錄入。'}
      </p>

      {demoBlocked && (
        <div className="vsbsync__demo" role="note">
          <Icon name="lock" size={17} />
          <div>
            <strong>{isEn ? 'Demo sample — submission to the live system is blocked' : '示範樣本 — 已封鎖送交正式系統'}</strong>
            <p>{isEn ? 'Fictitious demo data must never sync to vsbadge. Reset to a blank book and fill in real records before submitting.' : '虛構示範資料絕不可同步至 vsbadge 正式系統；送交前請先清空重設為空白冊並填入真實紀錄。'}</p>
          </div>
        </div>
      )}

      <div className="vsbsync__stats">
        <span>
          <b>{confirmedInBookCount}</b>{' '}
          {isEn ? 'Confirmed / Signed in BOOK' : '項已獲核實／領袖簽署'}
        </span>
        <span>
          <b>{pendingToSubmit.length}</b>{' '}
          {isEn ? 'Unconfirmed in BOOK (Ready to Submit)' : '項本機新填（待送交 vsbadge 核實）'}
        </span>
        {remotePendingIds.length > 0 && (
          <span>
            <b>{remotePendingIds.length}</b>{' '}
            {isEn ? 'Waiting for Leader in vsbadge' : '項正在 vsbadge 等候領袖 CONFIRM'}
          </span>
        )}
      </div>

      {/* 雲端直連 vsbadge */}
      <div className="appxbtns">
        {hasBadgeSession ? (
          <>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              disabled={busy || readOnly}
              onClick={() => pullConfirmedFromCloud(session)}
            >
              <Icon name="download" size={14} />{' '}
              {isEn
                ? 'Pull Leader-Confirmed from vsbadge'
                : '從 vsbadge 錄入「領袖已核實」進度'}
            </button>
            <button
              type="button"
              className="btn btn--gold btn--sm"
              disabled={busy || pendingToSubmit.length === 0 || demoBlocked}
              onClick={submitBookProgressAsPending}
            >
              <Icon name="upload" size={14} />{' '}
              {isEn
                ? `Submit to vsbadge as Pending (${pendingToSubmit.length})`
                : `送交 vsbadge 待領袖核實（${pendingToSubmit.length} 項）`}
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={busy}
              onClick={() => {
                setSession(null);
                writeMemberSession(null);
                setRemoteConfirmed({});
                setRemotePendingIds([]);
                push(isEn ? 'Signed out of vsbadge' : '已中斷 vsbadge 連線');
              }}
            >
              {isEn ? `Disconnect (${session.ymis})` : `登出（${session.ymis}）`}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn btn--gold btn--sm"
            onClick={() => setShowLogin((v) => !v)}
          >
            <Icon name="link" size={14} />{' '}
            {isEn ? 'Connect My vsbadge Account' : '連接我的 vsbadge 帳戶（一鍵同步）'}
          </button>
        )}
      </div>

      {!hasBadgeSession && troopEntries.length === 0 && (
        <div className="vsbsync__notfound" role="status">
          <p>{isEn ? 'No registered groups were found. Register your group and open member accounts in vsbadge first.' : '目前讀取不到已登記旅團。請先在 BADGE 完成旅團登記及成員開戶。'}</p>
          <div className="vsbsync__actions">
            <button type="button" className="btn btn--ghost btn--sm" onClick={refreshTroops} disabled={loadingTroops}>
              <Icon name="refresh" size={14} /> {loadingTroops ? (isEn ? 'Loading…' : '讀取中…') : (isEn ? 'Reload troop list' : '重新讀取旅團清單')}
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowLogin(true)}>
              {isEn ? 'Enter Group ID manually' : '手動輸入旅團編號'}
            </button>
            <a className="btn btn--gold btn--sm" href={badgeOrigin} target="_blank" rel="noopener noreferrer">
              <Icon name="external" size={14} /> {isEn ? 'Open vsbadge' : '前往 BADGE 開戶'}
            </a>
          </div>
        </div>
      )}

      {!hasBadgeSession && troopEntries.length > 0 && (
        <p className="vsbsync__liststatus" role="status">
          {upstreamOk
            ? (isEn ? `Automatically loaded ${troopEntries.length} registered groups from vsbadge.` : `已自動讀取 ${troopEntries.length} 個 BADGE 已登記旅團，可直接選取。`)
            : (isEn ? 'Showing configured groups; the vsbadge list could not be refreshed.' : '目前顯示可用旅團；未能成功連線讀取 BADGE 最新清單。')}
          <button type="button" className="vsbsync__refresh" onClick={refreshTroops} disabled={loadingTroops}>
            <Icon name="refresh" size={14} /> {isEn ? 'Refresh' : '重新讀取'}
          </button>
        </p>
      )}

      {!hasBadgeSession && troopId === '__NOT_FOUND__' && (
        <div className="vsbsync__notfound" role="status">
          <p>{isEn ? 'If your group is not listed, complete group registration and create your member account in vsbadge first.' : '請先在 BADGE 完成旅團登記及成員開戶，之後返回選取旅團並登入。'}</p>
          <a className="btn btn--gold btn--sm" href={badgeOrigin} target="_blank" rel="noopener noreferrer">
            <Icon name="external" size={14} /> {isEn ? 'Go to vsbadge registration' : '前往 BADGE 旅團登記及開戶'}
          </a>
        </div>
      )}

      {showLogin && !hasBadgeSession && (
        <form className="vsbsync__login" onSubmit={handleLogin}>
          <div className="vsbsync__fields">
            <label>
              <span>{isEn ? 'Registered group' : '所屬已登記旅團'}</span>
              {troopEntries.length > 0 ? (
                <select value={troopId} onChange={(e) => setTroopId(e.target.value)}>
                  {troopEntries.map(([id, info]) => (
                    <option key={id} value={id}>{id} · {isEn && info.en ? info.en : info.name}</option>
                  ))}
                  <option value="__NOT_FOUND__">{isEn ? "Can't find my group — BADGE registration" : '找不到我的旅團（前往 BADGE 開戶）'}</option>
                </select>
              ) : (
                <input type="text" value={troopId === '__NOT_FOUND__' ? '' : troopId} onChange={(e) => setTroopId(e.target.value)} placeholder={isEn ? 'e.g. 0082' : '手動輸入旅團編號（如 0082）'} />
              )}
            </label>
            {troopId !== '__NOT_FOUND__' && <>
              <label>
                <span>{isEn ? 'My Scout ID' : '我的童軍成員編號'}</span>
                <input type="text" inputMode="numeric" value={loginYmis} onChange={(e) => setLoginYmis(e.target.value)} placeholder={isEn ? '10-digit Scout ID' : '童軍成員編號'} />
              </label>
              <label>
                <span>{isEn ? 'vsbadge Password' : 'BADGE 密碼'}</span>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="••••••••" />
              </label>
              <button type="submit" className="btn btn--primary btn--sm" disabled={busy}>
                {busy ? (isEn ? 'Connecting…' : '連線中…') : (isEn ? 'Connect & Sync Confirmed' : '登入並錄入已核實進度')}
              </button>
            </>}
          </div>
        </form>
      )}

      {/* BADGE 進度檔匯出／匯入只限已登入帳戶；完整 BOOK 備份仍可離線使用。 */}
      {hasBadgeSession ? (
        <div className="appxbtns vsbsync__files">
          <button type="button" className="btn btn--ghost btn--sm" disabled={demoBlocked} onClick={onExportFile}>
            <Icon name="download" size={14} /> {isEn ? 'Export Pending Progress File' : '匯出「待領袖核實」進度檔'}
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onImportFile} />
          <button type="button" className="btn btn--ghost btn--sm" disabled={readOnly} onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={14} /> {isEn ? 'Import Leader-Confirmed Progress' : '匯入「領袖已核實」進度檔'}
          </button>
        </div>
      ) : (
        <div className="vsbsync__locked" role="note">
          <Icon name="lock" size={17} />
          <div>
            <strong>{isEn ? 'BADGE progress-file exchange is locked' : 'BADGE 進度檔匯出／匯入已鎖定'}</strong>
            <p>{isEn ? 'Connect and sign in to your BADGE account to exchange progress files. The full BOOK backup below remains available offline.' : '須先連接並登入 BADGE 帳戶，方可匯出或匯入 BADGE 進度檔；下方「完整備份 JSON／還原備份 JSON」仍可完全離線使用。'}</p>
          </div>
        </div>
      )}

    </section>
  );
}
