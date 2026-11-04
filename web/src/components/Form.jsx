import React, { useState } from 'react';
import { useBook, useField, getPath } from '../bookContext.js';
import { Spread } from './Paper.jsx';
import Write from './Write.jsx';
import { SignatureBlock, SignModal } from './Ink.jsx';
import { today } from '@shared/book.js';
import { useLang, englishOf, addLabelFor, termFor } from '../i18n.jsx';
import { Icon, cx } from '../ui.jsx';

export function Page({ id, children, className = '', dense = false }) {
  return <Spread section={id} dense={dense} right={<div className={cx('pg', className)}>{children}</div>} />;
}

export function H({ no, children, en, sub, progress }) {
  const { isEn } = useLang();
  return (
    <div className="pghead">
      <h2 className="pghead__title">
        {no && <span className="pghead__no">{no}</span>}
        <span>{isEn && en ? en : children}</span>
        {!isEn && en && <em className="pghead__en">{en}</em>}
        {progress && <ProgressPill ids={progress} />}
      </h2>
      {sub && <p className="pghead__sub">{sub}</p>}
    </div>
  );
}

function ProgressPill({ ids }) {
  const { book } = useBook();
  const done = ids.filter((id) => getPath(book, `progress.${id}`)?.date).length;
  const all = done === ids.length && ids.length > 0;
  return (
    <span className={cx('pgprog', all && 'is-complete')}>
      <span className="pgprog__bar">
        <i style={{ width: `${ids.length ? (done / ids.length) * 100 : 0}%` }} />
      </span>
      <span className="pgprog__num">
        {done}/{ids.length}
      </span>
    </span>
  );
}

export function P({ children, en, className = '' }) {
  const { isEn } = useLang();
  if (isEn && en) {
    return (
      <div className={cx('pgpara pgpara--en', className)}>
        <p>{en}</p>
      </div>
    );
  }
  return (
    <div className={cx('pgpara', className)}>
      <p>{children}</p>
      {en && <p className="pgpara__en">{en}</p>}
    </div>
  );
}

export function Note({ children, en }) {
  const { isEn } = useLang();
  return (
    <div className="pgnote">
      <p>{isEn && en ? en : children}</p>
      {!isEn && en && <p className="pgnote__en">{en}</p>}
    </div>
  );
}

export function Bilingual({ zh, en, as: Tag = 'h3', className = '' }) {
  const { isEn } = useLang();
  if (isEn) return <Tag className={className}>{en || zh}</Tag>;
  return (
    <Tag className={className}>
      {zh} {en && <em>{en}</em>}
    </Tag>
  );
}

export function Line({ label, en, path, type = 'text', rows = 1, wide, hint, placeholder, max, transform }) {
  const [value, setRaw] = useField(path);
  const { isEn } = useLang();
  const set = (next) => setRaw(transform ? transform(next) : next);
  return (
    <div className={cx('frow', wide && 'frow--wide')}>
      <span className="frow__label">
        {isEn ? en || englishOf(label) || termFor('en', label) : label}
        {!isEn && en && <em>{en}</em>}
      </span>
      <span className="frow__value">
        <Write
          value={value}
          onChange={set}
          type={type}
          multiline={rows > 1}
          rows={rows}
          max={max}
          placeholder={placeholder}
          label={isEn && en ? en : label}
        />
        {hint && <small className="frow__hint">{hint}</small>}
      </span>
    </div>
  );
}

export function Area({ label, en, path, rows = 5, placeholder }) {
  const [value, set] = useField(path);
  const { isEn } = useLang();
  return (
    <div className="fareas">
      <span className="frow__label">
        {isEn ? en || englishOf(label) : label}
        {!isEn && en && <em>{en}</em>}
      </span>
      <Write
        value={value}
        onChange={set}
        multiline
        rows={rows}
        placeholder={placeholder}
        label={isEn && en ? en : label}
        className="write--area"
      />
    </div>
  );
}

export function Grid({ cols = 2, children, className = '' }) {
  return <div className={cx('fgrid', `fgrid--${cols}`, className)}>{children}</div>;
}

export function Sig({ label, en, path, defaultName = '', defaultTitle = '' }) {
  const [value, set] = useField(path, null);
  return <SignatureBlock label={label} en={en} value={value} onChange={set} defaultName={defaultName} defaultTitle={defaultTitle} />;
}

/** 紙本「所選項目（請圈出）」互動紅圈選擇器 */
export function CircleChoice({ label = '所選項目（請圈出）', en = 'Selected Item (Please Circle)', path, options, onSelect }) {
  const [value, set] = useField(path, '');
  const { isEn } = useLang();
  return (
    <div className="circlebox">
      <span className="frow__label">
        {isEn ? en : label}
        {!isEn && en && <em>{en}</em>}
      </span>
      <div className="circlebox__opts" role="radiogroup" aria-label={isEn ? en : label}>
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              type="button"
              key={opt.value}
              role="radio"
              aria-checked={active}
              className={cx('circleopt', active && 'is-circled')}
              onClick={() => {
                const next = active ? '' : opt.value;
                set(next);
                onSelect?.(next);
              }}
            >
              <strong>{isEn && opt.en ? opt.en : opt.zh}</strong>
              {!isEn && opt.en && <em>{opt.en}</em>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** 會員章及肩章細項簽核表（項目 Items | 主考 Initials / 簽名 | 日期 Date） */
export function AssessTable({ title, en, items, exempted = false }) {
  const { book, update } = useBook();
  const { isEn } = useLang();
  const [signItem, setSignItem] = useState(null);

  const setEntry = (id, patch) => {
    update((b) => ({
      ...b,
      progress: {
        ...(b.progress || {}),
        [id]: { ...(b.progress?.[id] || {}), ...patch, at: new Date().toISOString() },
      },
    }));
  };

  return (
    <div className={cx('asstable', exempted && 'is-exempted')}>
      {title && (
        <div className="asstable__cat">
          <strong>{isEn && en ? en : title}</strong>
          {!isEn && en && <em>{en}</em>}
          {exempted && <span className="asstable__exempttag">{isEn ? 'Exempted by Link / Standard Badge' : '已憑先修章／標準獎章豁免'}</span>}
        </div>
      )}
      <div className="asstable__head">
        <span className="asstable__c-item">{isEn ? 'Items' : '項目 Items'}</span>
        <span className="asstable__c-init">{isEn ? 'Initials' : '主考 Initials'}</span>
        <span className="asstable__c-date">{isEn ? 'Date' : '日期 Date'}</span>
      </div>
      {items.map((it) => {
        const st = book.progress?.[it.id] || {};
        const done = Boolean(st.date) || exempted;
        return (
          <div key={it.id} className={cx('assrow', done && 'is-done')}>
            <div className="assrow__item">
              <button
                type="button"
                className="itemline__tick"
                onClick={() => setEntry(it.id, { date: st.date ? '' : today() })}
                aria-label={st.date ? '取消完成' : '標記完成'}
              >
                {done ? '✓' : ''}
              </button>
              <div className="assrow__text">
                <span>
                  {it.no && <b className="assrow__no">({it.no}) </b>}
                  {isEn && it.en ? it.en : it.zh}
                </span>
                {!isEn && it.en && <em>{it.en}</em>}
              </div>
            </div>

            <div className="assrow__init" data-col={isEn ? 'Initials' : '主考'}>
              {st.signature?.png ? (
                <button type="button" className="assrow__sigbtn" onClick={() => setSignItem(it)} title={st.assessor || '主考簽名'}>
                  <img src={st.signature.png} alt="簽名" />
                  {st.assessor && <small>{st.assessor}</small>}
                </button>
              ) : (
                <div className="assrow__initwrap">
                  <Write
                    value={st.assessor || ''}
                    onChange={(v) => setEntry(it.id, { assessor: v })}
                    compact
                    placeholder={isEn ? 'Initials' : '主考姓名'}
                    label={`${it.no || ''} 主考`}
                  />
                  <button
                    type="button"
                    className="assrow__pen"
                    onClick={() => setSignItem(it)}
                    title={isEn ? 'Handwrite initials' : '手寫簽名'}
                    aria-label={isEn ? 'Sign initials' : '主考手寫簽名'}
                  >
                    <Icon name="pen" size={11} />
                  </button>
                </div>
              )}
            </div>

            <div className="assrow__date" data-col={isEn ? 'Date' : '日期'}>
              <Write
                value={st.date || ''}
                onChange={(d) => setEntry(it.id, { date: d })}
                type="date"
                compact
                label={`${it.no || ''} 日期`}
              />
            </div>
          </div>
        );
      })}

      <SignModal
        open={Boolean(signItem)}
        onClose={() => setSignItem(null)}
        title={signItem ? `${isEn ? 'Assessor Initials' : '主考簽核'} · (${signItem.no})` : ''}
        defaultName={signItem ? book.progress?.[signItem.id]?.assessor || '' : ''}
        defaultTitle={isEn ? 'Assessor / VSL' : '主考／團長'}
        onSave={(sig) => {
          if (signItem) {
            setEntry(signItem.id, {
              assessor: sig.name || book.progress?.[signItem.id]?.assessor || '',
              date: book.progress?.[signItem.id]?.date || sig.at || today(),
              signature: sig,
            });
          }
          setSignItem(null);
        }}
      />
    </div>
  );
}

/** 通用增減列數表格（第 2、3、36、37、38、39、40 頁） */
export function Rows({ path, cols, min = 4, addLabel, del = true, dense = false, cap }) {
  const [stored, set] = useField(path, []);
  const { isEn } = useLang();
  const list = Array.isArray(stored) ? stored : [];
  const total = Math.max(min, list.length);

  const setCell = (index, key, value) => {
    const next = list.slice();
    while (next.length <= index) next.push({ id: `r_${Math.random().toString(36).slice(2, 8)}` });
    next[index] = { ...(next[index] || {}), [key]: value };
    set(next);
  };

  const removeRow = (index) => set(list.filter((_, i) => i !== index));
  const add = () => set([...list, { id: `r_${Math.random().toString(36).slice(2, 8)}` }]);

  return (
    <div className={cx('pgtable', dense && 'pgtable--dense')}>
      <div className={cx('pgtable__head pgtable__row', `pgtable__row--${cols.length}`)}>
        {cols.map((c) => (
          <span key={c.k} style={c.width ? { flex: c.width } : undefined}>
            {isEn ? c.en || englishOf(c.label) || termFor('en', c.label) : c.label}
            {!isEn && c.en && <em>{c.en}</em>}
          </span>
        ))}
        {del && <span className="pgtable__delcol" />}
      </div>

      {Array.from({ length: total }).map((_, index) => (
        <div className={cx('pgtable__row', `pgtable__row--${cols.length}`)} key={list[index]?.id || `blank-${index}`}>
          {cols.map((c) => (
            <span
              className="pgtable__cell"
              key={c.k}
              data-label={isEn ? c.en || c.label : c.label}
              style={c.width ? { flex: c.width } : undefined}
            >
              <Write
                value={list[index]?.[c.k] ?? ''}
                onChange={(v) => setCell(index, c.k, v)}
                type={c.type || 'text'}
                multiline={c.rows > 1}
                rows={c.rows || 1}
                compact
                placeholder={c.placeholder || ''}
                label={isEn && c.en ? c.en : c.label}
              />
            </span>
          ))}
          {del && (
            <span className="pgtable__delcol">
              {list[index] && (
                <button type="button" className="rowdel" onClick={() => removeRow(index)} aria-label={isEn ? 'Delete row' : '刪除此列'}>
                  ×
                </button>
              )}
            </span>
          )}
        </div>
      ))}

      {addLabel !== null && (!cap || list.length < cap) && (
        <button type="button" className="addrow" onClick={add}>
          + {addLabelFor(isEn ? 'en' : 'zh', addLabel || '加一行')}
        </button>
      )}
    </div>
  );
}
