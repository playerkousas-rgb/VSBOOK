import React, { useState } from 'react';
import { EMBED_ACK_KEY, isEmbedded, standaloneHost, standaloneUrl } from '@shared/embed.js';
import { today } from '@shared/book.js';
import { download, slugify } from '../bookStore.js';
import { useLang } from '../i18n.jsx';
import { Icon, useToast } from '../ui.jsx';

// Cross-site iframe storage is partitioned by the browser. These notices appear
// only inside a frame; the standalone layout and record-book data stay unchanged.
const readAck = () => {
  try {
    return window.sessionStorage.getItem(EMBED_ACK_KEY) === '1';
  } catch {
    return false;
  }
};

const writeAck = () => {
  try {
    window.sessionStorage.setItem(EMBED_ACK_KEY, '1');
  } catch {
    // The notice can still be dismissed in memory when storage is unavailable.
  }
};

export function StandaloneLink({ className = 'btn btn--onpaper', children }) {
  return (
    <a className={className} href={standaloneUrl()} target="_blank" rel="noopener noreferrer" data-embed-standalone>
      {children}
    </a>
  );
}

export function EmbedWelcomeNote() {
  const { isEn } = useLang();
  if (!isEmbedded()) return null;
  const host = standaloneHost();
  return (
    <section className="embednote" role="note" data-embed-notice="welcome">
      <h2>{isEn ? 'Opened inside the Service Portal' : '你正在服務平台內開啟 VSBOOK'}</h2>
      <p>
        {isEn
          ? `This record book is stored separately from the standalone site (${host}). Your existing book will not appear here automatically. Browsers may also block embedded storage entirely.`
          : `平台內的紀錄冊與獨立版（${host}）分開儲存，原有資料不會自動出現在這裏；瀏覽器亦可能完全封鎖嵌入模式嘅本機儲存。`}
      </p>
      {isEn ? (
        <ol>
          <li>Open the standalone site in a new tab → Menu → “Export Backup” to download the complete JSON file.</li>
          <li>Return here, tap “Import Backup” below and choose that file. To move changes back, export a backup here and import it on the standalone site.</li>
        </ol>
      ) : (
        <ol>
          <li>喺新分頁開啟獨立版 → 選單 →「匯出備份」，下載完整 JSON 檔。</li>
          <li>返嚟呢度，按下方「匯入備份」揀該檔案。要搬返獨立版，就喺平台內匯出，再喺獨立版匯入。</li>
        </ol>
      )}
      <p className="embednote__warn">
        {isEn
          ? 'iPhone, iPad and Safari may clear embedded data after the browser closes. Export after every session; use the standalone site for long-term records. If saving is blocked, keep this page open and export before leaving.'
          : 'iPhone／iPad 及 Safari 可能喺關閉瀏覽器後清除平台內資料：每次填寫後請匯出備份，長期紀錄建議用獨立版。若顯示「未儲存」，請保持頁面開啟，離開前立即匯出。'}
      </p>
      <p>
        {isEn
          ? 'Offline use inside the portal requires an online visit here first to fill the cache, and the portal page must still be open (or support offline itself). The standalone PWA keeps its existing offline behavior.'
          : '平台內離線使用，須先喺平台內連網開啟一次建立快取，而且平台頁面要仍然開著（或平台本身支援離線）。獨立版 PWA 嘅離線功能不變。'}
      </p>
      <StandaloneLink>
        <Icon name="external" size={14} /> {isEn ? 'Open standalone site (new tab)' : '開啟獨立版（新分頁）'}
      </StandaloneLink>
    </section>
  );
}

export function EmbedRibbon({ book, canBackup = true }) {
  const { isEn } = useLang();
  const { push } = useToast();
  const [ack, setAck] = useState(readAck);
  if (!isEmbedded() || ack) return null;

  const backup = () => {
    download(`vsbook-${slugify(book?.member?.nameZh || book?.member?.nameEn)}-${today()}.json`, book);
    push(isEn ? 'Backup exported' : '已匯出備份檔案');
  };

  return (
    <div className="embedbar no-print" role="status" data-embed-notice="ribbon">
      <span>
        <strong>{isEn ? 'Inside the Service Portal' : '服務平台內嵌模式'}</strong>{' '}
        {isEn
          ? 'Stored separately from the standalone site. Export before leaving — iPhone, iPad and Safari may clear embedded data when the browser closes.'
          : '這本紀錄冊與獨立版分開儲存；離開前請匯出備份（iPhone／iPad 及 Safari 可能在關閉瀏覽器後清除）。'}
      </span>
      <span className="embedbar__actions">
        {canBackup && book && (
          <button type="button" className="embedbar__btn embedbar__btn--main" onClick={backup}>
            <Icon name="download" size={13} /> {isEn ? 'Export Backup' : '匯出備份'}
          </button>
        )}
        <StandaloneLink className="embedbar__btn">
          <Icon name="external" size={13} /> {isEn ? 'Standalone site' : '開啟獨立版'}
        </StandaloneLink>
        <button
          type="button"
          className="embedbar__btn"
          onClick={() => {
            writeAck();
            setAck(true);
          }}
        >
          {isEn ? 'Got it' : '知道了'}
        </button>
      </span>
    </div>
  );
}
