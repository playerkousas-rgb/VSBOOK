import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon, Modal, cx } from '../ui.jsx';
import { SignaturePad } from './Ink.jsx';
import { shrinkInk } from '../signature.js';
import { useLang } from '../i18n.jsx';

export const isInkValue = (v) => Boolean(v && typeof v === 'object' && typeof v.ink === 'string');
export const plainText = (v) => (isInkValue(v) ? '' : typeof v === 'string' ? v : '');

const MAX = 15;
const MIN = 8;
const STEP = 0.5;

function fitText(el, max = MAX) {
  if (!el) return;
  let size = max;
  el.style.fontSize = `${size}px`;
  const overflow = () => el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2;
  let guard = 32;
  while (size > MIN && overflow() && guard-- > 0) {
    size -= STEP;
    el.style.fontSize = `${size}px`;
  }
}

export default function Write({
  value = '',
  onChange,
  multiline = false,
  rows = 2,
  type = 'text',
  placeholder = '',
  className = '',
  label,
  compact = false,
  align,
  max = MAX,
}) {
  const { isEn } = useLang();
  const [editing, setEditing] = useState(false);
  const [zoom, setZoom] = useState(false);
  const fieldRef = useRef(null);
  const inputRef = useRef(null);

  const commit = useCallback((next) => onChange?.(next), [onChange]);

  useLayoutEffect(() => {
    if (!editing && !isInkValue(value)) fitText(fieldRef.current, max);
  }, [value, editing, max, multiline, rows]);

  useEffect(() => {
    const el = fieldRef.current;
    if (!el || editing) return;
    const parent = el.parentElement;
    if (!parent || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => fitText(el, max));
    ro.observe(parent);
    return () => ro.disconnect();
  }, [editing, max]);

  if (type === 'date') {
    return (
      <span className={cx('write write--date', !value && 'is-empty', className)}>
        <input
          className="write__date"
          type="date"
          value={value || ''}
          onChange={(e) => commit(e.target.value)}
          aria-label={label || placeholder || (isEn ? 'Date' : '日期')}
        />
      </span>
    );
  }

  const openZoom = (e) => {
    e.stopPropagation();
    setEditing(false);
    setZoom(true);
  };

  return (
    <>
      <span
        className={cx(
          'write',
          multiline && 'write--multi',
          compact && 'write--compact',
          !value && 'is-empty',
          editing && 'is-editing',
          className,
        )}
        style={multiline ? { '--rows': rows } : undefined}
        onClick={() => {
          if (editing) return;
          if (isInkValue(value)) setZoom(true);
          else setEditing(true);
        }}
        onDoubleClick={openZoom}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (!editing && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            if (isInkValue(value)) setZoom(true);
            else setEditing(true);
          }
        }}
        aria-label={label || placeholder || (isEn ? 'Edit field' : '點擊填寫')}
      >
        {editing ? (
          multiline ? (
            <textarea
              ref={(el) => {
                inputRef.current = el;
                if (el) fitText(el, max);
              }}
              className="write__input write__fit"
              autoFocus
              defaultValue={plainText(value)}
              placeholder={placeholder}
              onChange={(e) => {
                commit(e.target.value);
                fitText(e.target, max);
              }}
              onBlur={() => setEditing(false)}
            />
          ) : (
            <input
              ref={(el) => {
                inputRef.current = el;
                if (el) fitText(el, max);
              }}
              className="write__input write__fit"
              autoFocus
              defaultValue={plainText(value)}
              placeholder={placeholder}
              onChange={(e) => {
                commit(e.target.value);
                fitText(e.target, max);
              }}
              onBlur={() => setEditing(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur();
              }}
            />
          )
        ) : isInkValue(value) ? (
          <img className="write__ink" src={value.ink} alt={label || '手寫墨跡'} />
        ) : (
          <span
            className="write__fit write__text"
            ref={fieldRef}
            title={plainText(value) || undefined}
            style={align ? { textAlign: align } : undefined}
          >
            {plainText(value) || <em className="write__ph">{placeholder || (isEn ? 'Tap to fill' : '點擊填寫')}</em>}
          </span>
        )}

        {!editing && (
          <button
            type="button"
            className="write__zoom"
            onClick={openZoom}
            aria-label={isEn ? 'Expand editor' : '放大打字或手寫'}
            title={isEn ? 'Type or Handwrite' : '放大打字／手寫'}
          >
            <Icon name="expand" size={11} />
          </button>
        )}
      </span>

      {zoom && (
        <Modal
          onClose={() => setZoom(false)}
          eyebrow={isEn ? 'WRITE / INK' : '放大輸入 · 打字或手寫'}
          title={label || (isEn ? 'Edit Field' : '填寫欄位')}
          subtitle={
            isEn
              ? 'Text automatically scales to fit the box. You can also switch to stylus/finger handwriting.'
              : '字數多時會自動縮字貼合格線；亦可切換至觸控手寫模式。'
          }
          wide
        >
          <ZoomEditor
            value={value}
            multiline={multiline}
            rows={multiline ? Math.max(rows, 6) : 1}
            placeholder={placeholder}
            onSave={(next) => {
              commit(next);
              setZoom(false);
            }}
            onCancel={() => setZoom(false)}
          />
        </Modal>
      )}
    </>
  );
}

function ZoomEditor({ value, multiline, rows, placeholder, onSave, onCancel }) {
  const { isEn } = useLang();
  const initialInk = isInkValue(value) ? value.ink : null;
  const [tab, setTab] = useState(initialInk ? 'ink' : 'type');
  const [draft, setDraft] = useState(plainText(value));
  const [ink, setInk] = useState(initialInk);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (tab !== 'ink') return onSave(draft);
    if (!ink) return onSave('');
    setSaving(true);
    try {
      const small = await shrinkInk(ink, { maxW: 640, maxH: 140 });
      onSave({ ink: small || ink });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="zoomtabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'type'} className={cx('zoomtab', tab === 'type' && 'is-on')} onClick={() => setTab('type')}>
          <Icon name="edit" size={14} /> {isEn ? 'Type' : '鍵盤打字'}
        </button>
        <button type="button" role="tab" aria-selected={tab === 'ink'} className={cx('zoomtab', tab === 'ink' && 'is-on')} onClick={() => setTab('ink')}>
          <Icon name="pen" size={14} /> {isEn ? 'Handwrite' : '觸控手寫'}
        </button>
      </div>

      {tab === 'type' ? (
        multiline ? (
          <textarea
            className="zoomfield"
            autoFocus
            rows={rows}
            value={draft}
            placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)}
          />
        ) : (
          <input
            className="zoomfield"
            autoFocus
            value={draft}
            placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save();
              if (e.key === 'Escape') onCancel();
            }}
          />
        )
      ) : (
        <SignaturePad onInk={setInk} />
      )}

      <div className="modal__actions">
        {Boolean(value) && (
          <button type="button" className="btn btn--ghost" onClick={() => onSave('')}>
            {isEn ? 'Clear Field' : '清空欄位'}
          </button>
        )}
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          {isEn ? 'Cancel' : '取消'}
        </button>
        <button type="button" className="btn btn--primary" onClick={save} disabled={saving}>
          <Icon name="check" size={15} /> {saving ? (isEn ? 'Saving…' : '處理中…') : isEn ? 'Done' : '完成'}
        </button>
      </div>
    </>
  );
}
