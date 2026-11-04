import React, { useRef, useState } from 'react';
import { useBook } from '../bookContext.js';
import { useToast, Icon, Modal } from '../ui.jsx';
import { download, clearBook, slugify } from '../bookStore.js';
import { APP_VERSION, demoBook, importFromVsBadge, newBook, today } from '@shared/book.js';
import { LegalNote } from './Legal.jsx';
import { navigate } from '../router.jsx';
import { useLang } from '../i18n.jsx';

export default function MenuDialog({ open, onClose, onShowQr }) {
  const { book, replace } = useBook();
  const { isEn } = useLang();
  const { push } = useToast();
  const backupRef = useRef(null);
  const vsRef = useRef(null);
  const [showAbout, setShowAbout] = useState(false);
  const [showHome, setShowHome] = useState(false);

  if (!open) return null;

  const backup = () => {
    download(`vsbook-${slugify(book.member?.nameZh || book.member?.nameEn)}-${today()}.json`, book);
    push(isEn ? 'Backup exported' : '已匯出備份檔案');
  };

  const importBackup = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!data?.member) throw new Error('這不是 VSBOOK 備份檔');
        if (!window.confirm('匯入備份會覆蓋目前這本紀錄冊，確定嗎？')) return;
        replace(newBook(data));
        push('備份已還原');
        onClose();
      } catch (e) {
        push(e.message || '檔案格式不正確', 'error');
      }
    };
    reader.readAsText(file);
  };

  const importBadge = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        const draft = structuredClone(book);
        const result = importFromVsBadge(data, draft);
        draft.member = result.member;
        replace(newBook(draft));
        push(`已從 vsbadge 匯入 ${result.imported} 項進度（${result.matchedBy}）`);
        navigate('/p/p09');
        onClose();
      } catch (e) {
        push(e.message || '無法讀取 vsbadge 檔案', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <Modal onClose={onClose} eyebrow="MENU" title={isEn ? 'Record Book Options' : '紀錄冊選項'}>
      <div className="menu">
        <button type="button" className="menu__item menu__item--accent" onClick={() => setShowHome((v) => !v)}>
          <Icon name={showHome ? 'down' : 'download'} size={18} />
          <span>
            <strong>{isEn ? 'Add to home screen' : '加到手機主畫面'}</strong>
            <em>
              {isEn
                ? 'One tap to open; no certificate, no fee, no server.'
                : '一按即開，毋須憑證、毋須付費、毋須伺服器'}
            </em>
          </span>
        </button>

        {showHome && (
          <div className="menuguide">
            <ol>
              <li>
                <b>iPhone</b>：用 <b>Safari</b> 開啟本頁 → 底部「分享」→「加入主畫面」→「新增」。
              </li>
              <li>
                <b>Android</b>：用 <b>Chrome</b> 開啟本頁 → 右上三點 →「安裝應用程式」或「加到主畫面」。
              </li>
            </ol>
            <p>
              {isEn
                ? 'Works like a native app afterwards: full screen, no login, works offline.'
                : '之後同 App 一樣：全螢幕、毋須登入、離線照用。'}
            </p>
          </div>
        )}

        <button
          type="button"
          className="menu__item menu__item--accent"
          onClick={() => {
            onClose();
            navigate('/scan');
          }}
        >
          <Icon name="qr" size={18} />
          <span>
            <strong>{isEn ? 'Scan QR Code' : '掃描二維碼'}</strong>
            <em>{isEn ? 'Leaders scan member QR; members scan leader Return QR' : '領袖掃成員紀錄冊；成員掃領袖的核簽回傳碼'}</em>
          </span>
        </button>

        <button type="button" className="menu__item" onClick={() => onShowQr?.()}>
          <Icon name="qr" size={18} />
          <span>
            <strong>{isEn ? 'Show QR Code (for Leader)' : '出示二維碼（給領袖掃描）'}</strong>
            <em>{isEn ? 'Pick what to share each time; nothing selected by default' : '每次自行剔選要傳送的資料，預設不傳任何內容'}</em>
          </span>
        </button>

        <button
          type="button"
          className="menu__item"
          onClick={() => {
            onClose();
            navigate('/forms');
          }}
        >
          <Icon name="seal" size={18} />
          <span>
            <strong>{isEn ? '3 Official Forms (One-Click)' : '三張官方申請表（一鍵生成）'}</strong>
            <em>{isEn ? 'PT/65, PT/19, PT/20 auto-filled from your record book' : 'PT/65、PT/19、PT/20，個人資料及考核紀錄自動填入'}</em>
          </span>
        </button>

        <button
          type="button"
          className="menu__item"
          onClick={() => {
            onClose();
            navigate('/print');
          }}
        >
          <Icon name="print" size={18} />
          <span>
            <strong>{isEn ? 'Print whole book / Save PDF' : '列印整本 / 儲存 PDF'}</strong>
            <em>
              {isEn
                ? '40 sheets, one per record-book page; page numbers match the paper edition.'
                : '40 頁一次過，每頁對應紙本一頁（頁碼印在右上角，可直接對回 PDF）。'}
            </em>
          </span>
        </button>

        <button type="button" className="menu__item" onClick={backup}>
          <Icon name="download" size={18} />
          <span>
            <strong>{isEn ? 'Export Backup' : '匯出備份'}</strong>
            <em>{isEn ? 'Download full record-book JSON for cloud backup or device transfer' : '下載完整紀錄冊 JSON，可存雲端或換機還原'}</em>
          </span>
        </button>

        <button type="button" className="menu__item" onClick={() => backupRef.current?.click()}>
          <Icon name="upload" size={18} />
          <span>
            <strong>{isEn ? 'Import Backup' : '匯入備份'}</strong>
            <em>{isEn ? 'Restore from a VSBOOK backup JSON' : '從 VSBOOK 備份檔還原'}</em>
          </span>
        </button>

        <button type="button" className="menu__item" onClick={() => vsRef.current?.click()}>
          <Icon name="link" size={18} />
          <span>
            <strong>{isEn ? 'Import Progress from vsbadge' : '從 vsbadge 匯入進度'}</strong>
            <em>{isEn ? 'Read vsbadge members / progress JSON' : '讀取 vsbadge 的 members／progress JSON'}</em>
          </span>
        </button>

        <button
          type="button"
          className="menu__item"
          onClick={() => {
            onClose();
            navigate('/p/appendix');
          }}
        >
          <Icon name="book" size={18} />
          <span>
            <strong>{isEn ? 'Digital Appendix & Storage Health' : '數位附錄與儲存健康'}</strong>
            <em>{isEn ? 'Export vsbadge JSON, shrink photos/ink, inspect storage' : '匯出 vsbadge 進度檔、壓縮相片墨跡及查看容量'}</em>
          </span>
        </button>

        <button
          type="button"
          className="menu__item"
          onClick={() => {
            if (!window.confirm('載入示範紀錄冊會覆蓋目前內容，確定嗎？')) return;
            replace(demoBook());
            push('已載入示範紀錄冊');
            navigate('/p/contents');
            onClose();
          }}
        >
          <Icon name="book" size={18} />
          <span>
            <strong>{isEn ? 'Load Demo Record Book' : '載入示範紀錄冊'}</strong>
            <em>{isEn ? 'Explore all features with sample Venture Scout records' : '以張芷晴的示範資料試玩所有功能'}</em>
          </span>
        </button>

        <button type="button" className="menu__item" onClick={() => setShowAbout((v) => !v)}>
          <Icon name="info" size={18} />
          <span>
            <strong>{isEn ? 'About VSBOOK' : '關於 VSBOOK'}</strong>
            <em>{isEn ? 'Version, local storage policy & legal notice' : '版本、資料儲存方式及聲明'}</em>
          </span>
        </button>

        {showAbout && (
          <div className="about">
            <p>
              <strong>VSBOOK {APP_VERSION}</strong> · 深資童軍電子紀錄冊。所有內容只儲存在你這部裝置的瀏覽器
              （localStorage），零伺服器上傳。出示二維碼或複製唯讀連結時，資料皆以壓縮字串封裝於二維碼或網址 <code>#</code> 內。
            </p>
            <p>
              訓練綱要結構及項目編號對應 <code>vsbadge</code>（2026 年第十一版深資童軍訓練綱要），可雙向交換進度資料。
              正式使用前請自行核對綱要版本。
            </p>
            <LegalNote compact />
          </div>
        )}

        <button
          type="button"
          className="menu__item menu__item--danger"
          onClick={() => {
            if (!window.confirm('清除本機紀錄冊？所有未備份的內容會永久消失。')) return;
            clearBook();
            replace(null);
            navigate('/');
            onClose();
            push('已清除本機紀錄冊');
          }}
        >
          <Icon name="trash" size={18} />
          <span>
            <strong>{isEn ? 'Clear Local Record Book' : '清除本機紀錄冊'}</strong>
            <em>{isEn ? 'Permanently delete unbacked-up data on this device' : '永久刪除此裝置上的紀錄冊資料'}</em>
          </span>
        </button>

        <input ref={backupRef} type="file" accept="application/json,.json" hidden onChange={(e) => importBackup(e.target.files?.[0])} />
        <input ref={vsRef} type="file" accept="application/json,.json" hidden onChange={(e) => importBadge(e.target.files?.[0])} />
      </div>
    </Modal>
  );
}
