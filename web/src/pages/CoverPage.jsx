import React from 'react';
import { allStats } from '@shared/book.js';
import { Crest, cx } from '../ui.jsx';
import { useLang } from '../i18n.jsx';
import { LegalLine } from '../components/Legal.jsx';

/**
 * 全屏深資童軍酒紅布面燙金封面（1:1 對齊 ROVERBOOK CoverPage）：
 * 整個螢幕就是紀錄冊封面（The whole screen is the cover）。
 */
export default function CoverPage({ book, onOpen, last, onContinue, onLeader }) {
  const { isEn } = useLang();
  const m = book?.member || {};
  const stats = allStats(book);

  const hint = !m.nameZh && !m.nameEn
    ? isEn
      ? 'Step 1: write your name on Page 1'
      : '第一步：寫上你的名字'
    : isEn
      ? `${stats.done} / ${stats.total} milestones · Next: ${stats.nextBadge?.badge?.en || 'All completed'}`
      : `已完成 ${stats.done} / ${stats.total} 項 · 下一步：${
          stats.nextBadge?.badge?.name ? `完成${stats.nextBadge.badge.name}` : '全部完成，等領袖簽署'
        }`;

  const medals = [
    { id: 'L1', label: isEn ? 'Membership Badge' : '會員章', short: isEn ? 'MB' : '會', earned: Boolean(book?.pages?.p10?.investitureDate || stats.badges[0]?.percent === 100) },
    { id: 'L2', label: isEn ? 'Epaulettes' : '深資童軍肩章', short: isEn ? 'EP' : '肩', earned: Boolean(book?.pages?.p13?.completedDate || stats.badges[1]?.percent === 100) },
    { id: 'L3', label: isEn ? 'Venture Scout Award' : '深資童軍獎章', short: isEn ? 'VS' : '深', earned: Boolean(book?.pages?.p20?.completedDate || stats.badges[2]?.percent === 100) },
    { id: 'L4', label: isEn ? 'Dragon Scout Award' : '榮譽童軍獎章', short: isEn ? 'DS' : '榮', earned: Boolean(book?.pages?.p33?.completedDate || stats.badges[3]?.percent === 100) },
  ];

  return (
    <div className="coverart">
      <div className="coverart__grain" aria-hidden="true" />
      <span className="coverart__frame coverart__frame--outer" aria-hidden="true" />
      <span className="coverart__frame coverart__frame--inner" aria-hidden="true" />
      <span className="coverart__spine" aria-hidden="true" />

      <div className="coverart__top">
        <Crest size={58} />
        <div>
          <strong>{isEn ? 'SCOUT ASSOCIATION OF HONG KONG' : '香港童軍總會'}</strong>
        </div>
      </div>

      <div className="coverart__center">
        {isEn ? (
          <>
            <span className="coverart__kicker">VENTURE SCOUT SECTION</span>
            <h1 className="coverart__title coverart__title--en">VENTURE SCOUT</h1>
            <h2 className="coverart__subtitle">RECORD BOOK</h2>
          </>
        ) : (
          <>
            <span className="coverart__kicker">VENTURE SCOUT</span>
            <h1 className="coverart__title">深資童軍</h1>
            <h2 className="coverart__subtitle">紀　錄　冊</h2>
          </>
        )}
      </div>

      <div className="coverart__plate">
        <span className="coverart__plate-label">{isEn ? 'HOLDER' : '持有人'}</span>
        <strong>{(isEn ? m.nameEn || m.nameZh : m.nameZh || m.nameEn) || (isEn ? 'Your Name' : '你的名字')}</strong>
        <span className="coverart__plate-sub">
          {[m.unit, m.group].filter(Boolean).join(' · ') || (isEn ? 'Venture Scout Unit' : '深資童軍團')}
        </span>
        {m.scoutId && <span className="coverart__plate-no">No. {m.scoutId}</span>}
        {hint && <span className="coverart__hint">{hint}</span>}
        <div className="coverart__badges">
          {medals.map((b) => (
            <span
              key={b.id}
              className={cx('coverart__medal', b.earned && 'is-earned')}
              title={`${b.label}${b.earned ? (isEn ? ' · Earned' : ' · 已完成') : isEn ? ' · In progress' : ' · 進行中'}`}
            >
              {b.short}
            </span>
          ))}
        </div>
      </div>

      <div className="coverart__foot">
        <span className="coverart__year">{new Date().getFullYear()}</span>
        <div className="coverart__ctas">
          <div className="coverart__ctarow">
            <button type="button" className="coverart__open" onClick={onOpen}>
              {isEn ? 'Open the record book' : '打開紀錄冊'}
            </button>
            {onLeader && (
              <button type="button" className="coverart__leader" onClick={onLeader}>
                {isEn ? 'Leader mode' : '領袖模式'}
              </button>
            )}
          </div>
          {last && (
            <button type="button" className="coverart__resume" onClick={onContinue}>
              {isEn ? `Continue · page ${last.page}` : `繼續上次 · 第 ${last.page} 頁`}{' '}
              <span>{isEn ? last.en || last.label : last.label}</span>
            </button>
          )}
        </div>
        <span className="coverart__edition">{isEn ? 'Edition XI' : '第十一版綱要'}</span>
      </div>

      <LegalLine className="coverart__legal" />
    </div>
  );
}
