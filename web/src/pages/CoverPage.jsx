import React from 'react';
import { APP_VERSION, PAGE_TOTAL, allStats, membershipStatus } from '@shared/book.js';
import { Crest, Icon } from '../ui.jsx';
import { Link } from '../router.jsx';
import { useLang } from '../i18n.jsx';
import { LegalLine } from '../components/Legal.jsx';

export default function CoverPage({ book, onOpen, last, onContinue, onShowQr }) {
  const { isEn } = useLang();
  const stats = allStats(book);
  const mem = membershipStatus(book);
  const m = book.member || {};

  return (
    <section className="bookcover" aria-label={isEn ? 'Venture Scout Record Book Cover' : '深資童軍紀錄冊封面'}>
      <div className="bookcover__spine" aria-hidden="true" />
      <div className="bookcover__frame">
        <div className="bookcover__top">
          <span className="bookcover__edition">
            {isEn ? `2026 11TH EDITION · ${PAGE_TOTAL} PAGES` : `2026 第十一版訓練綱要 · 全冊 ${PAGE_TOTAL} 頁`}
          </span>
          <span className="bookcover__ver">{APP_VERSION}</span>
        </div>

        <div className="bookcover__emblem">
          <Crest size={78} />
          <p className="bookcover__org">香港童軍總會</p>
          <h1 className="bookcover__title">深資童軍紀錄冊</h1>
          <div className="bookcover__rule" />
          <p className="bookcover__en">SCOUT ASSOCIATION OF HONG KONG</p>
          <p className="bookcover__ensub">VENTURE SCOUT RECORD BOOK</p>
        </div>

        <div className="bookcover__holder">
          <div className="bookcover__plate">
            <div>
              <small>{isEn ? 'HOLDER' : '持有人'}</small>
              <strong>{m.nameZh || m.nameEn || (isEn ? 'Tap Open to fill your name' : '尚未填寫姓名（打開第 1 頁填寫）')}</strong>
              {m.nameZh && m.nameEn && <em>{m.nameEn}</em>}
            </div>
            <div className="bookcover__meta">
              <span>SCOUT ID: {m.scoutId || '—'}</span>
              <span>{m.group || m.unit || (isEn ? 'Unit unset' : '未填旅團')}</span>
              <span className={mem.active ? 'is-valid' : ''}>
                {mem.validUntil
                  ? isEn
                    ? `Valid till ${mem.validUntil}`
                    : `會籍有效至 ${mem.validUntil}`
                  : isEn
                    ? 'Membership renewal unset'
                    : '未填會籍續期（第 4 頁）'}
              </span>
            </div>
          </div>

          <div className="bookcover__badges">
            {stats.badges.map((b) => (
              <Link
                key={b.badge.id}
                to={b.badge.id === 'L1' ? '/p/p09' : b.badge.id === 'L2' ? '/p/p11' : b.badge.id === 'L3' ? '/p/p14' : '/p/p21'}
                className="coverstat"
              >
                <span className="coverstat__head">
                  <strong>{isEn ? b.badge.en : b.badge.name}</strong>
                  <b>{b.percent}%</b>
                </span>
                <span className="coverstat__bar">
                  <i style={{ width: `${b.percent}%` }} />
                </span>
                <small>
                  {b.done} / {b.total} {b.unitLabel ? (isEn ? '' : b.unitLabel) : isEn ? 'items' : '項'}
                </small>
              </Link>
            ))}
          </div>
        </div>

        <div className="bookcover__cta">
          <button type="button" className="btn btn--gold btn--lg" onClick={onOpen}>
            <Icon name="book" size={17} /> {isEn ? 'Open Record Book (Page 1)' : '打開紀錄冊（第 1 頁）'}
          </button>
          {last && (
            <button type="button" className="btn btn--coverghost" onClick={onContinue}>
              {isEn ? `Continue P.${last.page} · ${last.en}` : `繼續上次：第 ${last.page} 頁 · ${last.label}`}
            </button>
          )}
        </div>

        <div className="bookcover__quick">
          <Link to="/p/contents" className="coverchip">
            <Icon name="book" size={14} /> {isEn ? '40-Page Contents' : '40 頁目錄'}
          </Link>
          <Link to="/forms" className="coverchip">
            <Icon name="file" size={14} /> {isEn ? 'PT/65 · PT/19 · PT/20' : '三張官方表格'}
          </Link>
          <button type="button" className="coverchip" onClick={onShowQr}>
            <Icon name="qr" size={14} /> {isEn ? 'Present QR' : '出示二維碼'}
          </button>
          <Link to="/scan" className="coverchip">
            <Icon name="camera" size={14} /> {isEn ? 'Leader Scan' : '掃描核簽'}
          </Link>
        </div>

        <LegalLine className="bookcover__legal" />
      </div>
    </section>
  );
}
