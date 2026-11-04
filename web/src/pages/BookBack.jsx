import React, { useRef, useState } from 'react';
import {
  APP_VERSION,
  OTHER_BADGES,
  PRINT_PAGES,
  demoBook,
  exportForVsBadge,
  importFromVsBadge,
  newBook,
  today,
  uid,
} from '@shared/book.js';
import { useBook, useField } from '../bookContext.js';
import { Bilingual, Grid, H, Line, P, Page, Rows } from '../components/Form.jsx';
import Write from '../components/Write.jsx';
import { download, slugify } from '../bookStore.js';
import { compressBookMedia, imageSizeLabel, storageUsage } from '../storageHealth.js';
import { Icon, useToast } from '../ui.jsx';
import { Link } from '../router.jsx';
import { useLang } from '../i18n.jsx';
import { LegalNote } from '../components/Legal.jsx';

/* ============================================================
   第 34–40 頁：其他獎章、WOSM 獎章、其他經驗、遠足及海外活動
   ============================================================ */

export function P34() {
  const { update } = useBook();
  const [swaDate, setSwaDate] = useField('pages.p34.swaCompletedDate');
  const [faDate, setFaDate] = useField('pages.p34.faCompletedDate');

  const syncOt = (id, date) => {
    update((b) => ({
      ...b,
      progress: {
        ...(b.progress || {}),
        [id]: { ...(b.progress?.[id] || {}), date: date || '', at: new Date().toISOString() },
      },
    }));
  };

  return (
    <Page id="p34">
      <H en="OTHER BADGES">其他獎章</H>

      <Bilingual as="h3" className="secsub" zh="寰宇童軍章" en="SCOUTS OF THE WORLD AWARD" />
      <Grid cols={2}>
        <Line label="「探索」課程證書日期" en="Date of SWA – Discovery Certificate" type="date" path="pages.p34.swaDiscoveryDate" />
        <Line label="「探索」課程證書編號" en="Certificate No. of SWA – Discovery" path="pages.p34.swaDiscoveryCert" />
        <Line label="完成「自願服務」日期" en="Date of Completion of SWA – Volunteer Service" type="date" path="pages.p34.swaServiceDate" />
        <div className="frow">
          <span className="frow__label">
            完成寰宇童軍章日期 <em>Date of Completion</em>
          </span>
          <span className="frow__value">
            <Write
              type="date"
              value={swaDate}
              onChange={(d) => {
                setSwaDate(d);
                syncOt('OT-WORLD-SW-AWARD', d);
              }}
              label="完成寰宇童軍章日期"
            />
          </span>
        </div>
      </Grid>

      <Bilingual as="h3" className="secsub" zh="深資童軍急救章" en="VENTURE SCOUT FIRST AID BADGE" />
      <Grid cols={2}>
        <div className="frow">
          <span className="frow__label">
            完成日期 <em>Date of Completion</em>
          </span>
          <span className="frow__value">
            <Write
              type="date"
              value={faDate}
              onChange={(d) => {
                setFaDate(d);
                syncOt('OT-FA', d);
              }}
              label="完成深資童軍急救章日期"
            />
          </span>
        </div>
        <Line label="證書編號" en="Certificate Number" path="pages.p34.faCertNo" />
        <Line label="覆修日期" en="Date of Renewal" type="date" path="pages.p34.faRenewalDate" />
        <Line label="覆修證書編號" en="Renewal Certificate Number" path="pages.p34.faRenewalCertNo" />
      </Grid>
    </Page>
  );
}

export function P35() {
  const { update } = useBook();
  const [linkDate, setLinkDate] = useField('pages.p35.completedDate');

  return (
    <Page id="p35">
      <H en="ROVER SCOUT LINK BADGE">樂行童軍先修章</H>
      <div className="awardbox">
        <Grid cols={2}>
          <div className="frow">
            <span className="frow__label">
              完成日期 <em>Date of Completion</em>
            </span>
            <span className="frow__value">
              <Write
                type="date"
                value={linkDate}
                onChange={(d) => {
                  setLinkDate(d);
                  update((b) => ({
                    ...b,
                    progress: {
                      ...(b.progress || {}),
                      'OT-ROVER-LINK': { ...(b.progress?.['OT-ROVER-LINK'] || {}), date: d || '' },
                    },
                  }));
                }}
                label="樂行童軍先修章完成日期"
              />
            </span>
          </div>
          <Line label="證書編號" en="Certificate Number" path="pages.p35.certNo" placeholder="樂行童軍先修章證書編號" />
        </Grid>
      </div>
    </Page>
  );
}

function QuickBadgeAdder({ listPath, filterFn }) {
  const { update } = useBook();
  const { isEn } = useLang();
  const [pick, setPick] = useState('');
  const options = OTHER_BADGES.filter(filterFn);

  const addPicked = (id) => {
    const meta = OTHER_BADGES.find((o) => o.id === id);
    if (!meta) return;
    const d = today();
    update((b) => {
      const next = structuredClone(b);
      const arr = Array.isArray(next[listPath]) ? next[listPath].slice() : [];
      arr.push({ id: uid('ob'), badge: `${meta.name}${meta.en ? ` ${meta.en}` : ''}`, certNo: '', date: d });
      next[listPath] = arr;
      next.progress = next.progress || {};
      if (!next.progress[id]?.date) next.progress[id] = { date: d };
      return next;
    });
    setPick('');
  };

  return (
    <div className="subselect">
      <label>
        <span>{isEn ? 'Quick-insert official badge (syncs with vsbadge)' : '快速帶入官方獎章名稱（同步 vsbadge 進度）'}</span>
        <select
          value={pick}
          onChange={(e) => {
            setPick(e.target.value);
            if (e.target.value) addPicked(e.target.value);
          }}
        >
          <option value="">{isEn ? '— Select a badge to append —' : '— 揀選獎章自動加入下一列 —'}</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {isEn && o.en ? o.en : o.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function P36() {
  return (
    <Page id="p36" dense>
      <H en="BADGES FROM THE WOSM">世界童軍組織推出的獎章</H>
      <QuickBadgeAdder listPath="wosmBadges" filterFn={(o) => o.id.includes('WORLD') || o.id === 'OT-ENV'} />
      <Rows
        path="wosmBadges"
        min={8}
        dense
        addLabel="加一個獎章"
        cols={[
          { k: 'badge', label: '獎章', en: 'Badge', width: 2 },
          { k: 'certNo', label: '證書編號', en: 'Certificate Number', width: 1.3 },
          { k: 'date', label: '完成日期', en: 'Date of Completion', type: 'date', width: 1.1 },
        ]}
      />
    </Page>
  );
}

export function P37() {
  return (
    <Page id="p37" dense>
      <H en="OTHER BADGES (I)">其他獎章（一）</H>
      <QuickBadgeAdder listPath="otherBadges1" filterFn={(o) => !o.id.includes('WORLD') && o.id !== 'OT-ENV'} />
      <Rows
        path="otherBadges1"
        min={8}
        dense
        addLabel="加一個獎章"
        cols={[
          { k: 'badge', label: '獎章', en: 'Badge', width: 2 },
          { k: 'certNo', label: '證書編號', en: 'Certificate Number', width: 1.3 },
          { k: 'date', label: '完成日期', en: 'Date of Completion', type: 'date', width: 1.1 },
        ]}
      />
    </Page>
  );
}

export function P38() {
  return (
    <Page id="p38" dense>
      <H en="OTHER BADGES (II)">其他獎章（二）</H>
      <Rows
        path="otherBadges2"
        min={8}
        dense
        addLabel="加一個獎章"
        cols={[
          { k: 'badge', label: '獎章', en: 'Badge', width: 2 },
          { k: 'certNo', label: '證書編號', en: 'Certificate Number', width: 1.3 },
          { k: 'date', label: '完成日期', en: 'Date of Completion', type: 'date', width: 1.1 },
        ]}
      />
    </Page>
  );
}

export function P39() {
  return (
    <Page id="p39" dense>
      <H en="ADDITIONAL EXPERIENCES">其他經驗</H>
      <P en="Record any other experiences you have gained, and qualifications obtained in this Section, including but not limited to the activities you participated in, the special tasks you were responsible for in the Unit, and positions held in the Executive Committee.">
        在此紀錄你在深資童軍支部所獲得之其他經驗，包括但不限於參加之活動、在深資童軍團所負責之特別任務、在執行委員會所擔任之職位等。
      </P>
      <Rows
        path="additional"
        min={7}
        dense
        addLabel="加一項經驗"
        cols={[
          { k: 'period', label: '時段', en: 'Period', width: 1.1, placeholder: '2026-01 至 2026-09' },
          { k: 'item', label: '項目', en: 'Items', width: 1.4, placeholder: '執委會職位／活動名稱' },
          { k: 'desc', label: '描述', en: 'Descriptions', width: 2.2, rows: 2 },
        ]}
      />
    </Page>
  );
}

export function P40() {
  return (
    <Page id="p40" dense>
      <H en="EXPEDITIONS AND OVERSEAS ACTIVITIES">遠足及海外活動</H>
      <P en="Record any expeditions and international activities you have participated in Hong Kong or overseas in this Section.">
        在此紀錄你在本港或海外進行遠足或參與國際童軍活動。
      </P>
      <Rows
        path="expeditions"
        min={7}
        dense
        addLabel="加一次遠足或海外活動"
        cols={[
          { k: 'period', label: '時段', en: 'Period', width: 1.1, placeholder: '2026-08-21 至 08-23' },
          { k: 'item', label: '項目', en: 'Items', width: 1.4, placeholder: '遠足路線／海外活動' },
          { k: 'desc', label: '描述', en: 'Descriptions', width: 2.2, rows: 2 },
        ]}
      />
    </Page>
  );
}

/* ============================================================
   數位附錄：vsbadge 互通 · 完整備份 · 本機儲存健康 · 示範資料
   ============================================================ */

export function AppendixPage() {
  const { book, replace } = useBook();
  const { push } = useToast();
  const { isEn } = useLang();
  const backupInput = useRef(null);
  const vsbadgeInput = useRef(null);
  const [shrinking, setShrinking] = useState(false);

  const usage = storageUsage(book);
  const pct = Math.max(1, Math.round(usage.ratio * 100));

  const onRestoreFull = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const parsed = JSON.parse(String(r.result || '{}'));
        if (!parsed || typeof parsed !== 'object' || !parsed.member) {
          throw new Error('這不是完整的 VSBOOK 備份檔（如為 vsbadge 進度檔請用下方按鈕）');
        }
        replace(newBook(parsed));
        push(isEn ? 'Full record book restored' : '已成功還原完整紀錄冊備份');
      } catch (err) {
        push(err.message || '讀取備份失敗', 'error');
      }
    };
    r.readAsText(file);
  };

  const onImportVsBadge = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const parsed = JSON.parse(String(r.result || '{}'));
        const res = importFromVsBadge(parsed, book);
        replace(res.book);
        push(
          isEn
            ? `Imported ${res.imported} items (${res.matchedBy})`
            : `已匯入 ${res.imported} 項進度（對齊方式：${res.matchedBy}）`,
        );
      } catch (err) {
        push(err.message || '匯入 vsbadge 失敗', 'error');
      }
    };
    r.readAsText(file);
  };

  return (
    <Page id="appendix">
      <H en="DIGITAL APPENDIX · SYNC & BACKUP">數位附錄 · 進度互通與備份</H>

      <section className="appxcard">
        <h3>
          <Icon name="verified" size={16} /> {isEn ? 'Bidirectional Sync with vsbadge' : '與 vsbadge 進度雙向互通（2026 第十一版）'}
        </h3>
        <p className="tiny">
          {isEn
            ? 'Uses identical Scout ID and L1–L4 / OT-* item codes. Importing never overwrites existing signatures.'
            : '共用同一童軍成員編號（Scout ID）與 L1–L4／OT-* 項目編號；匯入時只填補新進度，不會覆蓋本機已有的日期與領袖簽名。'}
        </p>
        <div className="appxbtns">
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => {
              const payload = exportForVsBadge(book);
              download(`vsbook-for-vsbadge-${slugify(book.member?.scoutId || book.member?.nameZh)}.json`, payload);
              push(isEn ? 'Exported vsbadge JSON' : '已匯出可餵給 vsbadge 的進度 JSON');
            }}
          >
            <Icon name="download" size={14} /> {isEn ? 'Export for vsbadge' : '匯出給 vsbadge'}
          </button>
          <input ref={vsbadgeInput} type="file" accept="application/json,.json" hidden onChange={onImportVsBadge} />
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => vsbadgeInput.current?.click()}>
            <Icon name="upload" size={14} /> {isEn ? 'Import from vsbadge' : '從 vsbadge 匯入進度'}
          </button>
        </div>
      </section>

      <section className="appxcard">
        <h3>
          <Icon name="lock" size={16} /> {isEn ? 'Full Device Backup & Transfer' : '完整紀錄冊備份與換機轉移'}
        </h3>
        <p className="tiny">
          {isEn
            ? 'Exports all 40 pages, photos, handwriting and signatures into a single local JSON file.'
            : '連同全部 40 頁文字、近照、手寫墨跡及簽名完整打包成單一 JSON 檔案，方便自行存檔或轉移到新手機。'}
        </p>
        <div className="appxbtns">
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => {
              download(`vsbook-backup-${slugify(book.member?.nameZh || book.member?.scoutId)}-${today()}.json`, book);
              push(isEn ? 'Full backup downloaded' : '已下載完整紀錄冊備份 JSON');
            }}
          >
            <Icon name="download" size={14} /> {isEn ? 'Export Full Backup' : '匯出完整備份 JSON'}
          </button>
          <input ref={backupInput} type="file" accept="application/json,.json" hidden onChange={onRestoreFull} />
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => backupInput.current?.click()}>
            <Icon name="upload" size={14} /> {isEn ? 'Restore Backup' : '還原備份 JSON'}
          </button>
        </div>
      </section>

      <section className="appxcard">
        <h3>
          <Icon name="image" size={16} /> {isEn ? 'Local Storage Health' : '本機儲存健康檢查'}
        </h3>
        <div className="qrmeter">
          <span className={`qrmeter__bar${usage.ratio > 0.8 ? ' is-over' : ''}`}>
            <i style={{ width: `${pct}%` }} />
          </span>
          <span className="tiny">
            {usage.kb} KB / 5,120 KB ({pct}%) · {usage.images.length} {isEn ? 'images/signatures' : '張相片或墨跡'}
          </span>
        </div>
        {usage.images.length > 0 && (
          <ul className="imglist">
            {usage.images.slice(0, 5).map((img) => (
              <li key={img.path}>
                <span>{img.label}</span>
                <b>{imageSizeLabel(img.chars)}</b>
              </li>
            ))}
          </ul>
        )}
        <div className="appxbtns">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={shrinking || usage.images.length === 0}
            onClick={async () => {
              setShrinking(true);
              try {
                const { book: next, savedKB } = await compressBookMedia(book);
                replace(next);
                push(savedKB > 0 ? `已壓縮釋放 ${savedKB} KB` : '所有圖片與墨跡已是最佳大小');
              } finally {
                setShrinking(false);
              }
            }}
          >
            {shrinking ? '壓縮中…' : isEn ? 'Compress All Photos & Ink' : '一鍵壓縮相片與手寫墨跡'}
          </button>
        </div>
      </section>

      <section className="appxcard">
        <h3>
          <Icon name="info" size={16} /> {isEn ? 'Sample Book & Reset' : '示範資料與重設'} ({APP_VERSION})
        </h3>
        <div className="appxbtns">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => {
              if (window.confirm(isEn ? 'Replace current book with sample data?' : '確定載入示範紀錄冊？目前未匯出的內容會被取代。')) {
                replace(demoBook());
                push('已載入示範紀錄冊');
              }
            }}
          >
            {isEn ? 'Load Sample Book' : '載入示範紀錄冊'}
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => {
              if (window.confirm(isEn ? 'Clear all local data and start blank?' : '確定清空本機紀錄冊並重新建立空白冊？請先確認已匯出備份。')) {
                replace(newBook());
                push('已重設為空白紀錄冊');
              }
            }}
          >
            {isEn ? 'Reset to Blank Book' : '清空重設為空白冊'}
          </button>
        </div>
      </section>

      <LegalNote />
    </Page>
  );
}

/* ============================================================
   整本 40 頁列印模式 (/print)
   ============================================================ */

export function PrintBook({ pages }) {
  const { isEn } = useLang();
  return (
    <div className="printall">
      <div className="printall__bar no-print">
        <Link to="/p/p01" className="btn btn--ghost btn--sm">
          <Icon name="back" size={14} /> {isEn ? 'Back to Book' : '返回紀錄冊'}
        </Link>
        <span>
          {isEn
            ? `All ${PRINT_PAGES.length} Official Pages (A4 Portrait)`
            : `整本《深資童軍紀錄冊》共 ${PRINT_PAGES.length} 頁列印預覽`}
        </span>
        <button type="button" className="btn btn--gold btn--sm" onClick={() => window.print()}>
          <Icon name="print" size={14} /> {isEn ? 'Print / Save PDF' : '列印／存成 PDF'}
        </button>
      </div>

      {PRINT_PAGES.map((sec) => {
        const Comp = pages[sec.id];
        if (!Comp) return null;
        return (
          <div key={sec.id} className="printall__one">
            <Comp />
          </div>
        );
      })}
    </div>
  );
}
