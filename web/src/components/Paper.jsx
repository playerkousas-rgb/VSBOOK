import React from 'react';
import { SECTIONS, PAGE_TOTAL, allStats } from '@shared/book.js';
import { Crest, Icon, Modal, cx } from '../ui.jsx';
import { navigate } from '../router.jsx';
import { useLang } from '../i18n.jsx';
import { useBook } from '../bookContext.js';
import { LegalLine } from './Legal.jsx';

export function Sheet({ id, no, title, en, children, className = '', dense = false, badge }) {
  const { isEn } = useLang();
  return (
    <article className={cx('sheet', dense && 'sheet--dense', className)} data-page={id} data-badge={badge || undefined}>
      <span className="sheet__gutter" aria-hidden="true" />
      <span className="sheet__watermark" aria-hidden="true">
        <Crest size={136} />
      </span>
      <header className="sheet__head">
        <span className="sheet__run">
          {isEn ? (
            'VENTURE SCOUT RECORD BOOK'
          ) : (
            <>
              深資童軍紀錄冊 <em>VENTURE SCOUT RECORD BOOK</em>
            </>
          )}
        </span>
        {no !== '—' && (
          <span className="sheet__pageno">
            {isEn ? `PAGE ${no} / ${PAGE_TOTAL}` : `第 ${no} 頁 · 共 ${PAGE_TOTAL} 頁`}
          </span>
        )}
      </header>
      <div className="sheet__titlebar">
        <h1>
          {isEn && en ? en : title}
          {!isEn && en && <em>{en}</em>}
        </h1>
        <span className="sheet__rule" aria-hidden="true" />
      </div>
      <div className="sheet__body">{children}</div>
      <footer className="sheet__foot">
        <span>SCOUT ASSOCIATION OF HONG KONG</span>
        <span>{no !== '—' ? `P.${no}` : 'DIGITAL'}</span>
      </footer>
    </article>
  );
}

export function Spread({ section, right, className = '', dense = false }) {
  const meta = SECTIONS.find((s) => s.id === section) || {};
  return (
    <Sheet
      id={section}
      no={meta.page}
      title={meta.label || ''}
      en={meta.en || ''}
      className={className}
      dense={dense}
      badge={meta.badge}
    >
      {right}
    </Sheet>
  );
}

export function Pager({ current, onOpenIndex }) {
  const { isEn } = useLang();
  const idx = SECTIONS.findIndex((s) => s.id === current);
  const prev = idx > 0 ? SECTIONS[idx - 1] : null;
  const next = idx >= 0 && idx < SECTIONS.length - 1 ? SECTIONS[idx + 1] : null;
  const cur = SECTIONS[idx];

  return (
    <nav className="pager" aria-label={isEn ? 'Page navigation' : '翻頁導航'}>
      <button
        type="button"
        className="pager__btn"
        onClick={() => (prev ? navigate(`/p/${prev.id}`) : navigate('/'))}
      >
        <Icon name="back" size={15} />
        <span>
          {prev
            ? prev.page === '—'
              ? isEn
                ? prev.en
                : prev.label
              : isEn
                ? `P.${prev.page}`
                : `第 ${prev.page} 頁`
            : isEn
              ? 'Cover'
              : '封面'}
        </span>
      </button>

      <button type="button" className="pager__mid" onClick={onOpenIndex}>
        <strong>
          {cur?.page === '—' ? (isEn ? 'Digital' : '數位頁') : isEn ? `Page ${cur?.page} / ${PAGE_TOTAL}` : `第 ${cur?.page} / ${PAGE_TOTAL} 頁`}
        </strong>
        <small>{isEn ? cur?.en : cur?.label}</small>
      </button>

      <button
        type="button"
        className="pager__btn pager__btn--next"
        disabled={!next}
        onClick={() => next && navigate(`/p/${next.id}`)}
      >
        <span>
          {next
            ? next.page === '—'
              ? isEn
                ? next.en
                : next.label
              : isEn
                ? `P.${next.page}`
                : `第 ${next.page} 頁`
            : isEn
              ? 'End'
              : '最末頁'}
        </span>
        <Icon name="chevron" size={15} />
      </button>
    </nav>
  );
}

export function IndexSheet({ open, onClose, current }) {
  const { book } = useBook();
  const { isEn } = useLang();
  if (!open) return null;
  const stats = allStats(book);

  const groups = [
    { title: isEn ? 'Overview & Personal Record (pp. 1–8)' : '個人資料・續期・誓詞規律（第 1–8 頁）', ids: ['contents', 'p01', 'p02', 'p03', 'p04', 'p05', 'p06', 'p07', 'p08'] },
    { title: isEn ? 'Membership Badge & Epaulettes (pp. 9–13)' : '會員章・深資童軍肩章（第 9–13 頁）', ids: ['p09', 'p10', 'p11', 'p12', 'p13'] },
    { title: isEn ? 'Venture Scout Award · 4 Badges (pp. 14–20)' : '深資童軍獎章・四段章（第 14–20 頁）', ids: ['p14', 'p15', 'p16', 'p17', 'p18', 'p19', 'p20'] },
    { title: isEn ? 'Dragon Scout Award · 4 Bars (pp. 21–33)' : '榮譽童軍獎章・四金帶（第 21–33 頁）', ids: ['p21', 'p22', 'p23', 'p24', 'p25', 'p26', 'p27', 'p28', 'p29', 'p30', 'p31', 'p32', 'p33'] },
    { title: isEn ? 'Other Badges, Experiences & Sync (pp. 34–40)' : '其他獎章・經驗・遠足・數位附錄（第 34–40 頁）', ids: ['p34', 'p35', 'p36', 'p37', 'p38', 'p39', 'p40', 'appendix'] },
  ];

  return (
    <Modal
      onClose={onClose}
      eyebrow={isEn ? 'RECORD BOOK INDEX' : '深資童軍紀錄冊 · 40 頁目錄'}
      title={isEn ? 'Jump to Any Page' : '快速跳頁'}
      subtitle={
        isEn
          ? `${stats.done} / ${stats.total} progressive milestones recorded`
          : `目前已記錄 ${stats.done} / ${stats.total} 個進度里程碑`
      }
      wide
    >
      <div className="idxbadges">
        {stats.badges.map((b) => (
          <div key={b.badge.id} className={cx('idxbadge', b.percent === 100 && 'is-done')}>
            <strong>{isEn ? b.badge.en : b.badge.name}</strong>
            <span>
              {b.done}/{b.total} ({b.percent}%)
            </span>
          </div>
        ))}
      </div>

      <div className="idxgroups">
        {groups.map((grp) => (
          <section key={grp.title} className="idxgroup">
            <h3>{grp.title}</h3>
            <div className="indexlist">
              {grp.ids.map((id) => {
                const s = SECTIONS.find((x) => x.id === id);
                if (!s) return null;
                return (
                  <button
                    type="button"
                    key={s.id}
                    className={cx('indexitem', current === s.id && 'is-active')}
                    onClick={() => {
                      navigate(`/p/${s.id}`);
                      onClose();
                    }}
                  >
                    <span className="indexitem__no">{s.page === '—' ? '★' : `P.${s.page}`}</span>
                    <span className="indexitem__label">{isEn ? s.en : s.label}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <LegalLine className="modal__legal" />
    </Modal>
  );
}
