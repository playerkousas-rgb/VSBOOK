import React, { useEffect, useState } from 'react';
import { Icon, Modal, useToast } from '../ui.jsx';
import { useBook } from '../bookContext.js';
import { qrSvg } from '../qr.js';
import { QR_LIMIT, TRANSFER_OPTIONS, encodeTransfer } from '@shared/transfer.js';
import { useLang } from '../i18n.jsx';

export default function ShowQrDialog({ open, onClose }) {
  const { book } = useBook();
  const { push } = useToast();
  const { isEn } = useLang();
  const [selected, setSelected] = useState([]);
  const [result, setResult] = useState(null);
  const [svg, setSvg] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setSelected([]);
      setResult(null);
      setSvg('');
      setError('');
    }
  }, [open]);

  useEffect(() => {
    let alive = true;
    if (!open || selected.length === 0) {
      setResult(null);
      setSvg('');
      return () => {
        alive = false;
      };
    }
    setBusy(true);
    setError('');
    encodeTransfer(book, selected)
      .then((res) => {
        if (!alive) return;
        setResult(res);
        if (!res.tooBig) {
          setSvg(qrSvg(res.value, { cell: 5 }));
        } else {
          setSvg('');
        }
      })
      .catch((e) => alive && setError(e.message || '未能產生二維碼'))
      .finally(() => alive && setBusy(false));
    return () => {
      alive = false;
    };
  }, [open, selected, book]);

  if (!open) return null;

  const toggle = (key) =>
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const ratio = result ? Math.min(100, Math.round((result.chars / QR_LIMIT) * 100)) : 0;
  const heavyChosen = TRANSFER_OPTIONS.filter((o) => o.heavy && selected.includes(o.key)).map((o) => o.label);

  return (
    <Modal
      onClose={onClose}
      eyebrow={isEn ? 'SHOW RECORD VIA QR' : '當面出示紀錄冊 · 零伺服器二維碼'}
      title={isEn ? 'Choose Sections to Present' : '揀選今次要給領袖查閱的內容'}
      subtitle={
        isEn
          ? 'Unselected by default for privacy. Leader scans via /scan to inspect and sign off.'
          : '為保護私隱，每次打開預設全不選；剔選「個人及旅團資料＋訓練綱要進度」即可讓領袖掃描核簽。'
      }
      wide
    >
      <div className="qrquick">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => setSelected(['particulars', 'progress', 'summaries'])}
        >
          {isEn ? 'Preset: For Leader Sign-off' : '常用組合：給領袖核簽（個人＋進度＋簡述）'}
        </button>
        {selected.length > 0 && (
          <button type="button" className="linkbtn" onClick={() => setSelected([])}>
            {isEn ? 'Clear all' : '全部取消'}
          </button>
        )}
      </div>

      <div className="qrgrid">
        {TRANSFER_OPTIONS.map((opt) => (
          <label key={opt.key} className={`qropt${selected.includes(opt.key) ? ' is-on' : ''}`}>
            <input type="checkbox" checked={selected.includes(opt.key)} onChange={() => toggle(opt.key)} />
            <span>
              <strong>
                {isEn ? opt.en : opt.label}
                {opt.sensitive && <b className="qropt__tag">{isEn ? 'Private' : '私隱'}</b>}
                {opt.heavy && <b className="qropt__tag qropt__tag--heavy">{isEn ? 'Large' : '大檔'}</b>}
              </strong>
              <small>{opt.hint}</small>
            </span>
          </label>
        ))}
      </div>

      <div className="qrpanel">
        {selected.length === 0 && (
          <div className="qrpanel__empty">
            <Icon name="qr" size={34} />
            <p>{isEn ? 'Tick at least one section above to generate QR code.' : '請先在上方剔選最少一項要傳送的資料。'}</p>
          </div>
        )}

        {selected.length > 0 && busy && !result && <p className="qrstatus">{isEn ? 'Compressing…' : '正在本機壓縮資料…'}</p>}

        {result && !result.tooBig && svg && (
          <div className="qrpanel__code" dangerouslySetInnerHTML={{ __html: svg }} />
        )}

        {result?.tooBig && (
          <div className="qrpanel__warn">
            <Icon name="alert" size={16} />
            <div>
              <strong>{isEn ? 'Exceeds Single QR Capacity' : '超出單張二維碼容量上限'}</strong>
              <p>
                {isEn
                  ? 'Please untick heavy image items or use JSON export in Digital Appendix.'
                  : '相片或大量手寫墨跡超出單張二維碼容量；請先取消大檔項目，或改用「複製唯讀連結」／匯出 JSON。'}
              </p>
              {heavyChosen.length > 0 && <p className="tiny">建議先取消：{heavyChosen.join('、')}</p>}
            </div>
          </div>
        )}

        {error && <p className="form-error">{error}</p>}

        {result && (
          <div className="qrmeter">
            <span className={`qrmeter__bar${result.tooBig ? ' is-over' : ''}`}>
              <i style={{ width: `${ratio}%` }} />
            </span>
            <span className="tiny">
              {result.chars} / {QR_LIMIT} chars · {result.compressed ? (isEn ? 'gzip compressed' : 'gzip 已壓縮') : 'raw'}
            </span>
          </div>
        )}
      </div>

      <div className="modal__actions">
        <button
          type="button"
          className="btn btn--ghost"
          disabled={!result}
          onClick={async () => {
            try {
              const link = `${window.location.origin}/#v=${encodeURIComponent(result.value)}`;
              await navigator.clipboard.writeText(link);
              push(isEn ? 'Copied zero-server read-only link (#v=...)' : '已複製純前端唯讀連結（# 內封裝，不經伺服器）');
            } catch {
              push(isEn ? 'Clipboard blocked by browser' : '瀏覽器未允許複製', 'error');
            }
          }}
        >
          <Icon name="link" size={14} /> {isEn ? 'Copy Read-Only Link' : '複製唯讀連結'}
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          disabled={!result}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(result.value);
              push(isEn ? 'Copied VS1 code' : '已複製 VS1 二維碼字串');
            } catch {
              push(isEn ? 'Clipboard blocked by browser' : '瀏覽器未允許複製', 'error');
            }
          }}
        >
          <Icon name="copy" size={14} /> {isEn ? 'Copy Code' : '複製代碼'}
        </button>
        <button type="button" className="btn btn--primary" onClick={onClose}>
          {isEn ? 'Done' : '完成'}
        </button>
      </div>
    </Modal>
  );
}
