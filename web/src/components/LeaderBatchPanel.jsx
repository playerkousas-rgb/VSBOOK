import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BADGE_SYLLABUS,
  ITEM_INDEX,
  SIGNABLE_ITEMS,
  buildVsBadgeBatchPayload,
  normalizeScoutId,
  parseVsBadgeRoster,
  rosterMemberStats,
  sameScoutId,
  today,
} from '@shared/book.js';
import { QR_LIMIT, encodeBatchSignoff, encodeSignoff } from '@shared/transfer.js';
import { download, slugify } from '../bookStore.js';
import { useLang } from '../i18n.jsx';
import { qrSvg } from '../qr.js';
import { shrinkSignature } from '../signature.js';
import { Icon, useToast } from '../ui.jsx';
import { SignModal } from './Ink.jsx';

export const LEADER_ROSTER_KEY = 'vsbook.leader.roster.v1';
const VSBADGE_SESSION_KEY = 'vsbook.vsbadge.session.v1';

export function readLeaderRoster() {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(LEADER_ROSTER_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeLeaderRoster(roster) {
  try {
    window.sessionStorage.setItem(LEADER_ROSTER_KEY, JSON.stringify(roster || []));
  } catch {
    /* ignore */
  }
}

function readVsBadgeSession() {
  try {
    return JSON.parse(window.sessionStorage.getItem(VSBADGE_SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

function writeVsBadgeSession(sess) {
  try {
    if (!sess) window.sessionStorage.removeItem(VSBADGE_SESSION_KEY);
    else window.sessionStorage.setItem(VSBADGE_SESSION_KEY, JSON.stringify(sess));
  } catch {
    /* ignore */
  }
}

const STAGE_TABS = [
  { id: 'L1', zh: '會員章', en: 'Membership' },
  { id: 'L2', zh: '深資童軍肩章', en: 'Epaulettes' },
  { id: 'L3', zh: '深資童軍獎章', en: 'Venture Award' },
  { id: 'L4', zh: '榮譽童軍獎章', en: 'Dragon Award' },
  { id: 'OT', zh: '其他獎章', en: 'Other Badges' },
];

export default function LeaderBatchPanel({ onSwitchToScanner }) {
  const { isEn } = useLang();
  const { push } = useToast();
  const fileRef = useRef(null);

  const [roster, setRoster] = useState(() => readLeaderRoster());
  const [selectedMembers, setSelectedMembers] = useState(() => new Set(readLeaderRoster().map((m) => m.scoutId)));
  const [memberFilter, setMemberFilter] = useState('');
  const [expandedMember, setExpandedMember] = useState('');
  const [quickIds, setQuickIds] = useState('');

  // vsbadge 雲端連線狀態
  const [troops, setTroops] = useState({});
  const [troopId, setTroopId] = useState(() => readVsBadgeSession()?.troopId || '');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [session, setSession] = useState(() => readVsBadgeSession());
  const [cloudBusy, setCloudBusy] = useState(false);
  const [showCloudLogin, setShowCloudLogin] = useState(false);

  // 一簽簽發狀態
  const [stageTab, setStageTab] = useState('L1');
  const [itemSearch, setItemSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState(() => new Set());
  const [doneDate, setDoneDate] = useState(() => today());
  const [leader, setLeader] = useState(null);
  const [openSign, setOpenSign] = useState(false);
  const [withSig, setWithSig] = useState(true);
  const [qrTarget, setQrTarget] = useState('ALL');
  const [qrResult, setQrResult] = useState(null);
  const [qrSvgMarkup, setQrSvgMarkup] = useState('');
  const [qrBusy, setQrBusy] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);

  const updateRoster = (next, autoSelectNew = true) => {
    setRoster(next);
    writeLeaderRoster(next);
    if (autoSelectNew) {
      setSelectedMembers((prev) => {
        const out = new Set(prev);
        next.forEach((m) => out.add(m.scoutId));
        return out;
      });
    }
  };

  // 載入 vsbadge 已登記旅團列表
  useEffect(() => {
    let alive = true;
    fetch('/api/vsbadge')
      .then((r) => r.json())
      .then((d) => {
        if (!alive || !d?.troops) return;
        setTroops(d.troops);
        if (!troopId) {
          const first = Object.keys(d.troops)[0];
          if (first) setTroopId(first);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const mergeRosterList = (incoming) => {
    const map = new Map();
    roster.forEach((m) => {
      map.set(m.scoutId, {
        ...m,
        progress: { ...(m.progress || {}) },
        otherBadges: { ...(m.otherBadges || {}) },
      });
    });
    incoming.forEach((inc) => {
      let key = inc.scoutId;
      for (const existingKey of map.keys()) {
        if (sameScoutId(existingKey, inc.scoutId)) {
          key = existingKey;
          break;
        }
      }
      const prev = map.get(key) || {
        scoutId: key,
        label: '',
        role: 'member',
        joinDate: '',
        progress: {},
        otherBadges: {},
      };
      map.set(key, {
        ...prev,
        label: inc.label || prev.label || '',
        joinDate: inc.joinDate || prev.joinDate || '',
        progress: { ...prev.progress, ...(inc.progress || {}) },
        otherBadges: { ...prev.otherBadges, ...(inc.otherBadges || {}) },
      });
    });
    const merged = [...map.values()].sort((a, b) => String(a.scoutId).localeCompare(String(b.scoutId)));
    updateRoster(merged, true);
    return merged.length;
  };

  const loadFromVsBadgeCloud = async (activeSession = session) => {
    if (!activeSession?.token || !activeSession?.troopId) return;
    setCloudBusy(true);
    try {
      const r = await fetch('/api/vsbadge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          troopId: activeSession.troopId,
          action: 'load',
          data: { token: activeSession.token },
        }),
      });
      const json = await r.json();
      if (!json?.success) {
        if (r.status === 401) {
          setSession(null);
          writeVsBadgeSession(null);
        }
        throw new Error(json?.error || (isEn ? 'Failed to load troop progress' : '讀取全團進度失敗'));
      }
      const parsed = parseVsBadgeRoster(json);
      updateRoster(parsed.members, true);
      push(
        isEn
          ? `Loaded ${parsed.members.length} members' progress from vsbadge`
          : `已從 vsbadge 載入 ${parsed.members.length} 位成員進度（不含個人資料）`,
      );
    } catch (e) {
      push(e.message || (isEn ? 'Failed to connect vsbadge' : '連接 vsbadge 失敗'), 'error');
    } finally {
      setCloudBusy(false);
    }
  };

  const handleCloudLogin = async (e) => {
    e.preventDefault();
    const cleanTroop = troopId.trim();
    if (!cleanTroop || !loginId.trim() || !password) {
      push(isEn ? 'Enter troop ID, leader ID and password' : '請填寫旅團編號、領袖帳號及密碼', 'error');
      return;
    }
    setCloudBusy(true);
    try {
      const r = await fetch('/api/vsbadge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          troopId: cleanTroop,
          action: 'login',
          data: { login_id: loginId.trim(), password },
        }),
      });
      const json = await r.json();
      if (!json?.success || !json?.token) {
        throw new Error(json?.error || (isEn ? 'Login failed' : '登入 vsbadge 失敗'));
      }
      const nextSess = {
        troopId: cleanTroop,
        troopName: troops[cleanTroop]?.name || cleanTroop,
        token: json.token,
        leaderName: json.user?.name || loginId.trim(),
        role: json.user?.role || 'leader',
      };
      setSession(nextSess);
      writeVsBadgeSession(nextSess);
      setPassword('');
      setShowCloudLogin(false);
      await loadFromVsBadgeCloud(nextSess);
    } catch (err) {
      push(err.message || (isEn ? 'Login failed' : '登入失敗'), 'error');
    } finally {
      setCloudBusy(false);
    }
  };

  const handleImportJson = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result || '{}'));
        const parsed = parseVsBadgeRoster(data);
        if (parsed.troopId && !troopId) setTroopId(parsed.troopId);
        const total = mergeRosterList(parsed.members);
        push(
          isEn
            ? `Loaded ${parsed.members.length} members (total ${total})`
            : `已載入 ${parsed.members.length} 位成員純進度（現共 ${total} 人）`,
        );
      } catch (err) {
        push(err.message || (isEn ? 'Invalid vsbadge JSON' : '無法解析 vsbadge 進度檔'), 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleAddQuickIds = () => {
    const ids = quickIds
      .split(/[\s,，;；\n]+/)
      .map(normalizeScoutId)
      .filter(Boolean);
    if (!ids.length) return;
    const added = ids.map((sid) => ({
      scoutId: sid,
      label: '',
      role: 'member',
      joinDate: '',
      progress: {},
      otherBadges: {},
    }));
    const total = mergeRosterList(added);
    setQuickIds('');
    push(
      isEn
        ? `Added ${ids.length} Scout IDs (${total} total)`
        : `已加入 ${ids.length} 個成員編號（現共 ${total} 人，無須個人資料）`,
    );
  };

  const rosterWithStats = useMemo(
    () =>
      roster.map((m) => ({
        ...m,
        stats: rosterMemberStats(m.progress, m.otherBadges),
      })),
    [roster],
  );

  const filteredRoster = useMemo(() => {
    const q = memberFilter.trim().toLowerCase();
    if (!q) return rosterWithStats;
    return rosterWithStats.filter(
      (m) => m.scoutId.toLowerCase().includes(q) || (m.label && m.label.toLowerCase().includes(q)),
    );
  }, [rosterWithStats, memberFilter]);

  const chosenScoutIds = useMemo(
    () => roster.filter((m) => selectedMembers.has(m.scoutId)).map((m) => m.scoutId),
    [roster, selectedMembers],
  );

  const chosenItemIds = useMemo(
    () => SIGNABLE_ITEMS.filter((it) => selectedItems.has(it.id)).map((it) => it.id),
    [selectedItems],
  );

  const visibleStageItems = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    return SIGNABLE_ITEMS.filter((it) => {
      if (!q && it.badgeId !== stageTab) return false;
      if (!q) return true;
      return (
        it.id.toLowerCase().includes(q) ||
        (it.name && it.name.toLowerCase().includes(q)) ||
        (it.en && it.en.toLowerCase().includes(q))
      );
    });
  }, [stageTab, itemSearch]);

  // 產生「一簽簽發所有成員」通用二維碼（或個別成員二維碼）
  useEffect(() => {
    let alive = true;
    if (!leader || chosenScoutIds.length === 0 || chosenItemIds.length === 0) {
      setQrResult(null);
      setQrSvgMarkup('');
      return () => {
        alive = false;
      };
    }
    setQrBusy(true);
    (async () => {
      const png = withSig ? await shrinkSignature(leader.png) : null;
      const items = chosenItemIds.map((id) => ({
        id,
        date: doneDate || today(),
        assessor: leader.name,
      }));
      const res =
        qrTarget === 'ALL'
          ? await encodeBatchSignoff({
              targets: chosenScoutIds,
              leader: { ...leader, png },
              items,
              note: isEn ? 'VSBOOK One-Sign Batch Sign-off' : 'VSBOOK 領袖一簽簽發',
            })
          : await encodeSignoff({
              member: { scoutId: qrTarget, nameZh: '' },
              leader: { ...leader, png },
              items,
              note: isEn ? 'VSBOOK One-Sign Batch Sign-off' : 'VSBOOK 領袖一簽簽發',
            });
      if (!alive) return;
      if (res.tooBig && withSig) {
        setWithSig(false);
        return;
      }
      setQrResult(res);
      setQrSvgMarkup(res.tooBig ? '' : qrSvg(res.value, { cell: 4 }));
    })()
      .catch(() => {
        if (alive) {
          setQrResult(null);
          setQrSvgMarkup('');
        }
      })
      .finally(() => {
        if (alive) setQrBusy(false);
      });
    return () => {
      alive = false;
    };
  }, [leader, chosenScoutIds, chosenItemIds, doneDate, withSig, qrTarget, isEn]);

  // 將已簽發進度套入領袖畫面上的即時矩陣（只更新純進度，不碰本機紀錄冊）
  const applyBatchToLocalRoster = () => {
    const safeDate = doneDate || today();
    const targetSet = new Set(chosenScoutIds);
    const next = roster.map((m) => {
      if (!targetSet.has(m.scoutId)) return m;
      const progress = { ...(m.progress || {}) };
      const otherBadges = { ...(m.otherBadges || {}) };
      chosenItemIds.forEach((id) => {
        progress[id] = safeDate;
        if (ITEM_INDEX[id]?.isOtherBadge) otherBadges[id] = safeDate;
      });
      return { ...m, progress, otherBadges };
    });
    updateRoster(next, false);
  };

  const handleSyncToVsBadgeCloud = async () => {
    if (!session?.token || !session?.troopId) {
      setShowCloudLogin(true);
      push(isEn ? 'Sign in to vsbadge first to write to cloud' : '請先登入 vsbadge 旅團後端再執行雲端寫入', 'error');
      return;
    }
    if (!leader || !chosenScoutIds.length || !chosenItemIds.length) return;

    const batch = buildVsBadgeBatchPayload({
      troopId: session.troopId,
      confirmer: leader.name || session.leaderName || '',
      scoutIds: chosenScoutIds,
      itemIds: chosenItemIds,
      date: doneDate || today(),
      existingRoster: roster,
    });

    setSyncBusy(true);
    try {
      if (batch.changes.length > 0) {
        const r1 = await fetch('/api/vsbadge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            troopId: session.troopId,
            action: 'save',
            data: {
              token: session.token,
              confirmer: leader.name || session.leaderName || '',
              changes: batch.changes,
            },
          }),
        });
        const j1 = await r1.json();
        if (!j1?.success) throw new Error(j1?.error || (isEn ? 'Cloud save failed' : '寫入 vsbadge 失敗'));
      }
      if (batch.otherBadgeRecords.length > 0) {
        const r2 = await fetch('/api/vsbadge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            troopId: session.troopId,
            action: 'saveOtherBadge',
            data: {
              token: session.token,
              records: batch.otherBadgeRecords,
            },
          }),
        });
        const j2 = await r2.json();
        if (!j2?.success) throw new Error(j2?.error || (isEn ? 'Other badges save failed' : '寫入其他獎章失敗'));
      }
      applyBatchToLocalRoster();
      const count = batch.changes.length + batch.otherBadgeRecords.length;
      push(
        isEn
          ? `Synced ${count} progress records to vsbadge`
          : `已一鍵同步 ${count} 筆純進度至 vsbadge 後端（零個人資料）`,
      );
    } catch (err) {
      push(err.message || (isEn ? 'Failed to write to vsbadge' : '寫入 vsbadge 後端失敗'), 'error');
    } finally {
      setSyncBusy(false);
    }
  };

  const handleExportProgressJson = () => {
    const activeScoutIds = chosenScoutIds.length ? chosenScoutIds : roster.map((m) => m.scoutId);
    const batch = buildVsBadgeBatchPayload({
      troopId: session?.troopId || troopId || '',
      confirmer: leader?.name || session?.leaderName || '',
      scoutIds: leader && chosenItemIds.length ? activeScoutIds : [],
      itemIds: leader ? chosenItemIds : [],
      date: doneDate || today(),
      existingRoster: roster,
    });
    if (leader && chosenScoutIds.length && chosenItemIds.length) {
      applyBatchToLocalRoster();
    }
    const stamp = doneDate || today();
    download(`vsbadge-progress-only-${slugify(session?.troopId || troopId || 'unit')}-${stamp}.json`, batch.json);
    push(
      isEn
        ? 'Exported progress-only JSON for vsbadge'
        : '已匯出 vsbadge 純進度 JSON（不含任何個人資料）',
    );
  };

  const toggleMember = (sid) =>
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      return next;
    });

  const toggleItem = (id) =>
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const troopEntries = Object.entries(troops);

  return (
    <div className="batchwb">
      {/* 1. 私隱與 vsbadge 後端連線列 */}
      <section className="batchwb__card">
        <div className="batchwb__top">
          <div>
            <span className="batchwb__seal">
              <Icon name="verified" size={13} />{' '}
              {isEn
                ? 'PROGRESS ONLY · ZERO PERSONAL PARTICULARS'
                : '只錄入進度 · 絕不錄入個人資料'}
            </span>
            <h2>
              {isEn
                ? 'vsbadge Troop Progress Overview & One-Sign Batch Sign-off'
                : 'vsbadge 全團進度總覽 · 一簽簽發所有成員'}
            </h2>
            <p className="batchwb__sub">
              {isEn
                ? 'Cooperates directly with vsbadge as backend: inspect every member’s L1–L4 progress at once, sign once, and issue sign-offs to all selected members without recording personal data.'
                : '直接配合兄弟系統 vsbadge 作為進度後端：一次過檢視全團成員四階進度，領袖簽名一次即可簽發所有成員核簽碼及同步純進度。'}
            </p>
          </div>

          <div className="batchwb__actions">
            {session ? (
              <>
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  disabled={cloudBusy}
                  onClick={() => loadFromVsBadgeCloud(session)}
                >
                  <Icon name="check" size={14} />{' '}
                  {cloudBusy
                    ? isEn
                      ? 'Syncing…'
                      : '同步中…'
                    : isEn
                      ? `Reload ${session.troopName}`
                      : `重新載入（${session.troopName}）`}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => {
                    setSession(null);
                    writeVsBadgeSession(null);
                    push(isEn ? 'Disconnected from vsbadge' : '已登出 vsbadge 連線');
                  }}
                >
                  {isEn ? 'Disconnect' : '登出後端'}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn--gold btn--sm"
                onClick={() => setShowCloudLogin((v) => !v)}
              >
                <Icon name="seal" size={14} />{' '}
                {isEn ? 'Connect vsbadge Backend' : '連接 vsbadge 雲端後端'}
              </button>
            )}

            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={handleImportJson} />
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => fileRef.current?.click()}>
              <Icon name="upload" size={14} /> {isEn ? 'Load vsbadge JSON' : '載入 vsbadge 進度檔'}
            </button>

            {onSwitchToScanner && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={onSwitchToScanner}>
                <Icon name="qr" size={14} /> {isEn ? 'Scan Member QR to Add' : '掃描成員 QR 加入名單'}
              </button>
            )}
          </div>
        </div>

        {showCloudLogin && !session && (
          <form className="batchwb__login" onSubmit={handleCloudLogin}>
            <div className="batchwb__loginrow">
              <label>
                <span>{isEn ? 'Unit / Group' : '所屬旅團'}</span>
                {troopEntries.length > 0 ? (
                  <select value={troopId} onChange={(e) => setTroopId(e.target.value)}>
                    {troopEntries.map(([id, info]) => (
                      <option key={id} value={id}>
                        {id} · {isEn && info.en ? info.en : info.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={troopId}
                    onChange={(e) => setTroopId(e.target.value)}
                    placeholder={isEn ? 'e.g. 0082' : '旅團編號（如 0082）'}
                  />
                )}
              </label>
              <label>
                <span>{isEn ? 'vsbadge Leader ID / Email' : 'vsbadge 領袖帳號／電郵'}</span>
                <input
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  autoComplete="username"
                  placeholder={isEn ? 'Leader account' : '領袖或執委登入帳號'}
                />
              </label>
              <label>
                <span>{isEn ? 'Password' : '密碼'}</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
              </label>
              <button type="submit" className="btn btn--primary btn--sm" disabled={cloudBusy}>
                {cloudBusy
                  ? isEn
                    ? 'Connecting…'
                    : '連線中…'
                  : isEn
                    ? 'Sign in & Load All'
                    : '登入並載入全團進度'}
              </button>
            </div>
          </form>
        )}

        <div className="batchwb__quickadd">
          <input
            type="text"
            value={quickIds}
            onChange={(e) => setQuickIds(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddQuickIds();
              }
            }}
            placeholder={
              isEn
                ? 'Quick-add Scout IDs without personal info (e.g. 25081420, 26001234)…'
                : '免個人資料快速加入成員編號（輸入一個或多個 SCOUT ID，以空白或逗號分隔）…'
            }
          />
          <button type="button" className="btn btn--ghost btn--sm" onClick={handleAddQuickIds}>
            {isEn ? 'Add IDs' : '加入編號'}
          </button>
          {roster.length > 0 && (
            <button
              type="button"
              className="linkbtn"
              onClick={() => {
                updateRoster([], false);
                setSelectedMembers(new Set());
              }}
            >
              {isEn ? 'Clear Roster' : '清空名單'}
            </button>
          )}
        </div>
      </section>

      {/* 2. 全團成員進度總覽矩陣 */}
      <section className="batchwb__card">
        <div className="batchwb__secbar">
          <div>
            <h3>
              {isEn
                ? `All Members' Progress (${roster.length})`
                : `全團成員進度一覽（共 ${roster.length} 人 · 已揀選 ${chosenScoutIds.length} 人）`}
            </h3>
          </div>
          {roster.length > 0 && (
            <div className="batchwb__secbtns">
              <input
                type="search"
                className="batchwb__search"
                value={memberFilter}
                onChange={(e) => setMemberFilter(e.target.value)}
                placeholder={isEn ? 'Filter by Scout ID…' : '搜尋成員編號或顯示名稱…'}
              />
              <button
                type="button"
                className="linkbtn"
                onClick={() => setSelectedMembers(new Set(roster.map((m) => m.scoutId)))}
              >
                {isEn ? 'Select All' : '全選成員'}
              </button>
              <span>·</span>
              <button type="button" className="linkbtn" onClick={() => setSelectedMembers(new Set())}>
                {isEn ? 'None' : '全不選'}
              </button>
            </div>
          )}
        </div>

        {roster.length === 0 ? (
          <div className="batchwb__empty">
            <Icon name="qr" size={28} />
            <p>
              {isEn
                ? 'Connect vsbadge backend, load a vsbadge JSON file, scan member progress QRs, or enter Scout IDs above to view all members at once.'
                : '請在上方連接 vsbadge 雲端後端、載入 vsbadge 進度檔、掃描成員二維碼或輸入童軍成員編號，即可一次過檢視全團進度。'}
            </p>
          </div>
        ) : (
          <div className="batchtable-wrap">
            <table className="batchtable">
              <thead>
                <tr>
                  <th style={{ width: '36px' }}>
                    <input
                      type="checkbox"
                      aria-label={isEn ? 'Select all members' : '全選所有成員'}
                      checked={chosenScoutIds.length === roster.length && roster.length > 0}
                      onChange={(e) =>
                        setSelectedMembers(e.target.checked ? new Set(roster.map((m) => m.scoutId)) : new Set())
                      }
                    />
                  </th>
                  <th>{isEn ? 'Scout ID' : '童軍成員編號'}</th>
                  <th>{isEn ? 'Membership' : '會員章'}</th>
                  <th>{isEn ? 'Epaulettes' : '肩章'}</th>
                  <th>{isEn ? 'Venture' : '深資獎章'}</th>
                  <th>{isEn ? 'Dragon' : '榮譽獎章'}</th>
                  <th>{isEn ? 'Total' : '總進度'}</th>
                  <th style={{ width: '68px' }} />
                </tr>
              </thead>
              <tbody>
                {filteredRoster.map((m) => {
                  const checked = selectedMembers.has(m.scoutId);
                  const open = expandedMember === m.scoutId;
                  const entries = Object.entries(m.progress || {}).sort((a, b) => a[0].localeCompare(b[0]));
                  return (
                    <React.Fragment key={m.scoutId}>
                      <tr className={checked ? 'is-selected' : ''}>
                        <td>
                          <input type="checkbox" checked={checked} onChange={() => toggleMember(m.scoutId)} />
                        </td>
                        <td>
                          <strong className="batchtable__id">{m.scoutId}</strong>
                          {m.label && <span className="batchtable__label">{m.label}</span>}
                        </td>
                        <td>
                          <span className={`stagepill${m.stats.l1.percent === 100 ? ' is-done' : ''}`}>
                            {m.stats.l1.done}/{m.stats.l1.total}
                          </span>
                        </td>
                        <td>
                          <span className={`stagepill${m.stats.l2.percent === 100 ? ' is-done' : ''}`}>
                            {m.stats.l2.done}/{m.stats.l2.total}
                          </span>
                        </td>
                        <td>
                          <span className={`stagepill${m.stats.l3.percent === 100 ? ' is-done' : ''}`}>
                            {m.stats.l3.done}/{m.stats.l3.total}
                          </span>
                        </td>
                        <td>
                          <span className={`stagepill${m.stats.l4.percent === 100 ? ' is-done' : ''}`}>
                            {m.stats.l4.done}/{m.stats.l4.total}
                          </span>
                        </td>
                        <td>
                          <b className="batchtable__pct">{m.stats.percent}%</b>
                          {m.stats.otDone > 0 && (
                            <small className="batchtable__ot">+{m.stats.otDone}</small>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="linkbtn"
                            onClick={() => setExpandedMember(open ? '' : m.scoutId)}
                          >
                            {open ? (isEn ? 'Hide' : '收起') : isEn ? 'Items' : '明細'}
                          </button>
                        </td>
                      </tr>
                      {open && (
                        <tr className="batchtable__detail">
                          <td colSpan={8}>
                            {entries.length === 0 ? (
                              <span className="tiny">
                                {isEn ? 'No completed items recorded yet.' : '暫無已完成進度紀錄。'}
                              </span>
                            ) : (
                              <div className="batchdetail">
                                {entries.map(([itemId, date]) => {
                                  const meta = ITEM_INDEX[itemId];
                                  return (
                                    <span key={itemId} className="batchdetail__chip">
                                      <b>{isEn && meta?.en ? meta.en : meta?.name || itemId}</b>
                                      <em>{date}</em>
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 3. 一簽簽發所有成員 */}
      <section className="batchwb__card">
        <div className="batchwb__secbar">
          <div>
            <h3>
              <Icon name="seal" size={16} />{' '}
              {isEn
                ? `Sign Once · Issue for All Selected Members (${chosenScoutIds.length} members × ${chosenItemIds.length} items)`
                : `一簽簽發所有成員（已揀選 ${chosenScoutIds.length} 位成員 × ${chosenItemIds.length} 項進度）`}
            </h3>
          </div>
          <label className="batchwb__date">
            <span>{isEn ? 'Completion Date' : '完成日期'}</span>
            <input type="date" value={doneDate} max={today()} onChange={(e) => setDoneDate(e.target.value)} />
          </label>
        </div>

        <div className="batchtabs">
          {STAGE_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`batchtab${stageTab === t.id && !itemSearch ? ' is-on' : ''}`}
              onClick={() => {
                setStageTab(t.id);
                setItemSearch('');
              }}
            >
              {isEn ? t.en : t.zh}
            </button>
          ))}
          <input
            type="search"
            className="batchwb__search"
            value={itemSearch}
            onChange={(e) => setItemSearch(e.target.value)}
            placeholder={isEn ? 'Search syllabus items…' : '搜尋考驗細項或編號…'}
          />
          {chosenItemIds.length > 0 && (
            <button type="button" className="linkbtn" onClick={() => setSelectedItems(new Set())}>
              {isEn ? 'Clear Items' : '清空已選細項'}
            </button>
          )}
        </div>

        <div className="batchitems">
          {visibleStageItems.map((it) => {
            const on = selectedItems.has(it.id);
            return (
              <label key={it.id} className={`batchitem${on ? ' is-on' : ''}`}>
                <input type="checkbox" checked={on} onChange={() => toggleItem(it.id)} />
                <span>
                  <strong>{isEn && it.en ? it.en : it.name}</strong>
                  <small>
                    {it.id} · {isEn && it.segmentEn ? it.segmentEn : it.segmentName}
                  </small>
                </span>
              </label>
            );
          })}
        </div>

        {/* 領袖一次簽名區 */}
        <div className="batchsign">
          <div className="batchsign__pad">
            {leader ? (
              <div className="signpanel__sig">
                {leader.png && <img src={leader.png} alt={isEn ? 'Leader signature' : '領袖簽名'} />}
                <span>{[leader.name, leader.title, leader.at].filter(Boolean).join(' · ')}</span>
                <button type="button" className="linkbtn" onClick={() => setOpenSign(true)}>
                  {isEn ? 'Re-sign' : '重簽'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn--gold"
                onClick={() => setOpenSign(true)}
              >
                <Icon name="pen" size={15} />{' '}
                {isEn
                  ? 'Sign Once as Leader / Assessor'
                  : '領袖簽名一次（同時簽發全體已選成員）'}
              </button>
            )}
          </div>

          {leader && chosenScoutIds.length > 0 && chosenItemIds.length > 0 && (
            <div className="batchsign__out">
              <div className="batchsign__qrbox">
                <div className="batchsign__qrhead">
                  <strong>
                    {isEn
                      ? 'Universal Return QR (All Selected Members Scan This Same QR)'
                      : '全體通用核簽回傳碼（所有已選成員直接掃描同一張 QR）'}
                  </strong>
                  <select value={qrTarget} onChange={(e) => setQrTarget(e.target.value)}>
                    <option value="ALL">
                      {isEn
                        ? `Universal QR (${chosenScoutIds.length} members)`
                        : `全體通用碼（共 ${chosenScoutIds.length} 位成員共用）`}
                    </option>
                    {chosenScoutIds.map((sid) => (
                      <option key={sid} value={sid}>
                        {isEn ? `Individual: ${sid}` : `個別成員：${sid}`}
                      </option>
                    ))}
                  </select>
                </div>

                {qrBusy && !qrSvgMarkup && (
                  <p className="qrstatus">{isEn ? 'Generating Batch Return QR…' : '正在產生一簽通用回傳碼…'}</p>
                )}
                {qrSvgMarkup && <div className="qrpanel__code" dangerouslySetInnerHTML={{ __html: qrSvgMarkup }} />}
                {qrResult?.tooBig && (
                  <p className="form-error">
                    {isEn
                      ? 'Too many IDs for a single QR — pick an individual member above or untick signature ink.'
                      : '單張二維碼容量已滿，請取消勾選簽名墨跡圖片，或在上方切換個別成員顯示。'}
                  </p>
                )}
                {qrResult && (
                  <div className="qrmeter">
                    <span className={`qrmeter__bar${qrResult.tooBig ? ' is-over' : ''}`}>
                      <i style={{ width: `${Math.min(100, (qrResult.chars / QR_LIMIT) * 100)}%` }} />
                    </span>
                    <span className="tiny">
                      {qrResult.chars} / {QR_LIMIT}
                    </span>
                  </div>
                )}

                <label className="signpanel__withsig">
                  <input type="checkbox" checked={withSig} onChange={(e) => setWithSig(e.target.checked)} />
                  <span>{isEn ? 'Include signature ink image in QR' : '連同手寫簽名墨跡放入回傳碼'}</span>
                </label>

                <div className="batchsign__btns">
                  {qrResult && !qrResult.tooBig && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(qrResult.value);
                          push(isEn ? 'Batch return code copied' : '已複製全體核簽回傳碼');
                        } catch {
                          push(isEn ? 'Clipboard blocked' : '瀏覽器未允許複製', 'error');
                        }
                      }}
                    >
                      <Icon name="copy" size={14} />{' '}
                      {isEn ? 'Copy Batch Return Code' : '複製全體回傳碼'}
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    disabled={syncBusy}
                    onClick={handleSyncToVsBadgeCloud}
                  >
                    <Icon name="verified" size={14} />{' '}
                    {syncBusy
                      ? isEn
                        ? 'Writing to vsbadge…'
                        : '寫入中…'
                      : isEn
                        ? 'Write Progress to vsbadge Cloud'
                        : '一鍵同步純進度回 vsbadge 雲端'}
                  </button>

                  <button type="button" className="btn btn--ghost btn--sm" onClick={handleExportProgressJson}>
                    <Icon name="download" size={14} />{' '}
                    {isEn ? 'Export Progress-Only JSON' : '匯出 vsbadge 純進度檔'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {openSign && (
        <SignModal
          title={isEn ? 'Leader / Assessor One-Sign Batch Sign-off' : '領袖／主考一次簽名（簽發全體已選成員）'}
          defaultName={leader?.name || session?.leaderName || ''}
          defaultTitle={leader?.title || (isEn ? 'Venture Scout Leader' : '深資童軍團長')}
          requireName
          onSave={(v) => {
            setLeader(v);
            setOpenSign(false);
          }}
          onClose={() => setOpenSign(false)}
        />
      )}
    </div>
  );
}
