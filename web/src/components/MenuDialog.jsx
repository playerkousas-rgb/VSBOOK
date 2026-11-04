import React from 'react';
import { Icon, Modal } from '../ui.jsx';
import { navigate } from '../router.jsx';
import { useLang } from '../i18n.jsx';
import { APP_VERSION } from '@shared/book.js';
import { LegalNote } from './Legal.jsx';

export default function MenuDialog({ open, onClose, onShowQr, onOpenIndex, viewMode, onToggleView }) {
  const { isEn, toggle } = useLang();
  if (!open) return null;

  const go = (to) => {
    onClose();
    navigate(to);
  };

  return (
    <Modal
      onClose={onClose}
      eyebrow={`VSBOOK ${APP_VERSION}`}
      title={isEn ? 'Tools & Navigation' : '功能選單'}
      subtitle={isEn ? '100% offline-first personal record book' : '資料 100% 留存於你的裝置，離線照常讀寫、簽名及印表'}
    >
      <div className="menugrid">
        <button type="button" className="menucard" onClick={() => { onClose(); onOpenIndex(); }}>
          <Icon name="book" size={20} />
          <div>
            <strong>{isEn ? '40-Page Contents' : '第 1–40 頁總目錄'}</strong>
            <small>{isEn ? 'Jump to any page of the book' : '逐頁跳至個人資料、段章、金帶或附錄'}</small>
          </div>
        </button>

        <button type="button" className="menucard" onClick={() => go('/forms')}>
          <Icon name="file" size={20} />
          <div>
            <strong>{isEn ? 'Official Forms PT/65 · PT/19 · PT/20' : '三張官方表格（PT/65・PT/19・PT/20）'}</strong>
            <small>{isEn ? 'Auto-filled from your record book & A4 print' : '由紀錄冊自動帶入資料，支援 A4 雙面列印'}</small>
          </div>
        </button>

        <button type="button" className="menucard" onClick={onShowQr}>
          <Icon name="qr" size={20} />
          <div>
            <strong>{isEn ? 'Present QR to Leader' : '出示二維碼（給領袖查閱／核簽）'}</strong>
            <small>{isEn ? 'Pick sections to share via offline QR' : '自選要分享的組別，零伺服器當面傳送'}</small>
          </div>
        </button>

        <button type="button" className="menucard" onClick={() => go('/scan')}>
          <Icon name="camera" size={20} />
          <div>
            <strong>{isEn ? 'Scan QR (Leader / Return Sign-off)' : '掃描二維碼（領袖核簽／成員收簽名）'}</strong>
            <small>{isEn ? 'Inspect member QR or apply leader Return QR' : '領袖掃描成員進度，或成員掃回領袖核簽單'}</small>
          </div>
        </button>

        <button type="button" className="menucard" onClick={onToggleView}>
          <Icon name="cards" size={20} />
          <div>
            <strong>
              {isEn
                ? `Layout: ${viewMode === 'card' ? 'Mobile Cards' : 'Paper Sheet'}`
                : `閱讀版面：目前為「${viewMode === 'card' ? '手機單欄卡片' : '紙本原貌'}」`}
            </strong>
            <small>{isEn ? 'Tap to switch between Paper and Card view' : '點擊切換「紙本雙線框原貌」或「手機單欄大字卡片」'}</small>
          </div>
        </button>

        <button type="button" className="menucard" onClick={() => go('/print')}>
          <Icon name="print" size={20} />
          <div>
            <strong>{isEn ? 'Print Whole Record Book (pp. 1–40)' : '整本紀錄冊列印（第 1–40 頁）'}</strong>
            <small>{isEn ? 'A4 print view of all 40 pages' : '一次過排版全部 40 頁供列印或存成 PDF'}</small>
          </div>
        </button>

        <button type="button" className="menucard" onClick={() => go('/p/appendix')}>
          <Icon name="download" size={20} />
          <div>
            <strong>{isEn ? 'vsbadge Sync, Backup & Storage Health' : 'vsbadge 進度互通・備份還原・儲存健康'}</strong>
            <small>{isEn ? 'Export/import JSON & shrink images' : '匯出匯入 JSON、一鍵壓縮相片墨跡或載入示範資料'}</small>
          </div>
        </button>

        <button
          type="button"
          className="menucard"
          onClick={() => {
            toggle();
          }}
        >
          <Icon name="globe" size={20} />
          <div>
            <strong>{isEn ? 'Switch Language: 繁體中文' : '切換語言：English'}</strong>
            <small>{isEn ? 'Bilingual Venture Scout Record Book' : '全本紀錄冊及表格支援中英雙語切換'}</small>
          </div>
        </button>
      </div>

      <LegalNote compact className="menu__legal" />
    </Modal>
  );
}
