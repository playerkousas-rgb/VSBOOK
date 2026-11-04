import React, { useRef, useState } from 'react';
import { useToast, Crest, Icon } from '../ui.jsx';
import { demoBook, importFromVsBadge, newBook } from '@shared/book.js';
import { persistBook } from '../bookStore.js';
import { navigate } from '../router.jsx';

export default function Welcome({ onReady, onLeaderScan }) {
  const { push } = useToast();
  const [form, setForm] = useState({
    nameZh: '',
    nameEn: '',
    scoutId: '',
    unit: '',
    group: '',
    district: '',
    region: '',
  });
  const fileRef = useRef(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const start = (book, target) => {
    persistBook(book);
    onReady(book);
    navigate(target);
  };

  const create = (e) => {
    e.preventDefault();
    if (!form.nameZh.trim() && !form.nameEn.trim()) return;
    start(newBook({ member: form }), '/p/p01');
    push('紀錄冊已建立，開始填寫吧');
  };

  const importFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (data?.member && data?.pages) {
          start(newBook(data), '/p/contents');
          push('備份已還原');
          return;
        }
        if (data?.progress || Array.isArray(data?.members) || data?.schema?.includes('vsbadge')) {
          const draft = newBook();
          const res = importFromVsBadge(data, draft);
          draft.member = res.member;
          start(newBook(draft), '/p/contents');
          push(`已從 vsbadge 匯入 ${res.imported} 項進度`);
          return;
        }
        throw new Error('這不是 VSBOOK 或 vsbadge 備份檔');
      } catch (err) {
        push(err.message || '檔案格式不正確', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="welcome">
      <div className="welcome__cover">
        <div className="coverart coverart--inline">
          <div className="coverart__grain" aria-hidden="true" />
          <span className="coverart__frame coverart__frame--outer" aria-hidden="true" />
          <span className="coverart__frame coverart__frame--inner" aria-hidden="true" />
          <span className="coverart__spine" aria-hidden="true" />
          <div className="coverart__top">
            <Crest size={50} />
            <div>
              <strong>香港童軍總會</strong>
              <em>SCOUT ASSOCIATION OF HONG KONG</em>
            </div>
          </div>
          <div className="coverart__center">
            <img className="coverart__emblem" src="/img/crest-venture.png" alt="" aria-hidden="true" />
            <span className="coverart__kicker">VENTURE SCOUT</span>
            <h1 className="coverart__title">深資童軍</h1>
            <h2 className="coverart__subtitle">紀　錄　冊</h2>
            <span className="coverart__en">RECORD BOOK</span>
          </div>
          <div className="coverart__plate">
            <span className="coverart__plate-label">持有人 HOLDER</span>
            <strong>{form.nameZh || form.nameEn || '你的名字'}</strong>
            <span className="coverart__plate-sub">{form.unit || form.group || '深資童軍團'}</span>
          </div>
        </div>
      </div>

      <div className="welcome__panel">
        <div className="welcome__brand">
          <Crest size={30} />
          <span>
            <strong>VSBOOK</strong>
            <em>深資童軍紀錄冊</em>
          </span>
        </div>

        <h1>這本紀錄冊，是你的。</h1>
        <p className="welcome__lede">
          不需要帳號、不需要登入。整本冊子存在你這部裝置；逐頁點擊就可以填寫，領袖可以即場簽名，
          亦可以生成二維碼讓領袖查看你選擇分享的章節並回簽。
        </p>

        <form className="welcome__form" onSubmit={create}>
          <div className="welcome__row">
            <label className="field">
              <span className="field__label">姓名（中文）</span>
              <input className="welcome__input" value={form.nameZh} onChange={set('nameZh')} placeholder="張芷晴" required />
            </label>
            <label className="field">
              <span className="field__label">姓名（英文）</span>
              <input className="welcome__input" value={form.nameEn} onChange={set('nameEn')} placeholder="CHEUNG Tsz-ching" />
            </label>
          </div>
          <div className="welcome__row">
            <label className="field">
              <span className="field__label">
                紀錄冊編號 <em>＝ 童軍成員編號 SCOUT ID（vsbadge 同一個號碼）</em>
              </span>
              <input
                className="welcome__input"
                value={form.scoutId}
                onChange={(e) => setForm((f) => ({ ...f, scoutId: e.target.value }))}
                placeholder="25081420"
              />
            </label>
            <label className="field">
              <span className="field__label">旅 Group</span>
              <input className="welcome__input" value={form.group} onChange={set('group')} placeholder="港島第 28 旅" />
            </label>
          </div>
          <div className="welcome__row">
            <label className="field">
              <span className="field__label">深資童軍團 Unit</span>
              <input className="welcome__input" value={form.unit} onChange={set('unit')} placeholder="港島第 28 旅深資童軍團" />
            </label>
            <label className="field">
              <span className="field__label">區 District</span>
              <input className="welcome__input" value={form.district} onChange={set('district')} placeholder="灣仔區" />
            </label>
          </div>

          <div className="welcome__actions">
            <button className="btn btn--gold btn--lg" type="submit">
              <Icon name="book" size={17} /> 建立我的紀錄冊
            </button>
            <button
              type="button"
              className="btn btn--onpaper"
              onClick={() => {
                start(demoBook(), '/p/contents');
                push('已載入示範紀錄冊');
              }}
            >
              用示範資料看看
            </button>
            <button type="button" className="btn btn--onpaper" onClick={() => fileRef.current?.click()}>
              匯入備份
            </button>
            {onLeaderScan && (
              <button type="button" className="btn btn--onpaper" onClick={onLeaderScan}>
                <Icon name="qr" size={15} /> 領袖掃描核簽
              </button>
            )}
          </div>
          <p className="welcome__fine">
            沒有「註冊」或「登入」。資料留在這部裝置；換機前請在選單匯出備份。
          </p>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => importFile(e.target.files?.[0])} />
        </form>
      </div>
    </div>
  );
}
