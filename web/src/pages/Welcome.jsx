import React, { useRef, useState } from 'react';
import { APP_VERSION, demoBook, importFromVsBadge, newBook } from '@shared/book.js';
import { Crest, Icon, useToast } from '../ui.jsx';
import { useLang } from '../i18n.jsx';
import { LegalNote } from '../components/Legal.jsx';
import { navigate } from '../router.jsx';

export default function Welcome({ onReady, onLeaderScan }) {
  const { isEn, toggle } = useLang();
  const { push } = useToast();
  const fileRef = useRef(null);
  const [nameZh, setNameZh] = useState('');
  const [scoutId, setScoutId] = useState('');
  const [group, setGroup] = useState('');

  const createBlank = (e) => {
    e.preventDefault();
    const b = newBook({
      member: {
        nameZh: nameZh.trim(),
        scoutId: scoutId.trim(),
        group: group.trim(),
      },
    });
    onReady(b);
    navigate('/p/p01');
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(String(reader.result || '{}'));
        if (json && json.member && typeof json.member === 'object') {
          onReady(newBook(json));
          push(isEn ? 'Record book restored' : '已還原完整紀錄冊備份');
          return;
        }
        const { book, imported } = importFromVsBadge(json, newBook());
        onReady(book);
        push(isEn ? `Imported ${imported} items from vsbadge` : `已從 vsbadge 匯入 ${imported} 項進度`);
      } catch (err) {
        push(err.message || '檔案格式未能識別', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="welcome">
      <div className="welcome__topbar">
        <span className="welcome__ver">VSBOOK {APP_VERSION}</span>
        <button type="button" className="chipbtn chipbtn--lang" onClick={toggle}>
          <Icon name="globe" size={14} /> <span>{isEn ? '中文' : 'EN'}</span>
        </button>
      </div>

      <div className="welcome__card">
        <div className="welcome__foil">
          <Crest size={58} />
          <p className="welcome__assoc">{isEn ? 'Scout Association of Hong Kong' : '香港童軍總會 · 深資童軍支部'}</p>
          <h1>{isEn ? 'Venture Scout Record Book' : '深資童軍電子紀錄冊'}</h1>
          <p className="welcome__lead">
            {isEn
              ? 'Page-for-page digital edition (pp. 1–40, 2026 11th Edition Syllabus). No login, no cloud upload — everything stays on your device.'
              : '逐頁對應紙本第 1–40 頁及 2026 年第十一版訓練綱要。毋須註冊登入、絕不上傳個人資料，離線露營照常填寫、手寫簽名及一鍵生成 PT/65・PT/19・PT/20。'}
          </p>
        </div>

        <form className="welcome__form" onSubmit={createBlank}>
          <div className="welcome__fields">
            <label>
              <span>{isEn ? 'Chinese Name (Optional)' : '中文姓名（可稍後填）'}</span>
              <input type="text" value={nameZh} onChange={(e) => setNameZh(e.target.value)} placeholder="例如：張芷晴" />
            </label>
            <label>
              <span>{isEn ? 'Scout ID (Optional)' : '童軍成員編號 Scout ID'}</span>
              <input type="text" value={scoutId} onChange={(e) => setScoutId(e.target.value)} placeholder="例如：25081420" />
            </label>
            <label>
              <span>{isEn ? 'Scout Group (Optional)' : '所屬童軍旅'}</span>
              <input type="text" value={group} onChange={(e) => setGroup(e.target.value)} placeholder="例如：港島第 28 旅" />
            </label>
          </div>
          <button type="submit" className="btn btn--gold btn--block">
            <Icon name="book" size={16} /> {isEn ? 'Create My Venture Record Book' : '建立我的深資童軍紀錄冊'}
          </button>
        </form>

        <div className="welcome__alt">
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={handleImport} />
          <button type="button" className="btn btn--ghost" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={15} /> {isEn ? 'Import Backup / vsbadge JSON' : '匯入備份或 vsbadge JSON'}
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              onReady(demoBook());
              push(isEn ? 'Loaded sample Venture Scout book' : '已載入示範紀錄冊（張芷晴 · 港島第 28 旅）');
            }}
          >
            <Icon name="verified" size={15} /> {isEn ? 'Try Sample Book' : '載入示範紀錄冊體驗'}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onLeaderScan}>
            <Icon name="camera" size={15} /> {isEn ? 'Leader Mode: Scan Member QR' : '領袖模式：直接掃描成員二維碼'}
          </button>
        </div>

        <LegalNote compact className="welcome__legal" />
      </div>
    </div>
  );
}
