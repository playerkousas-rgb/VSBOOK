import React, { useEffect, useState } from 'react';
import {
  FORM_META,
  FORM_ORDER,
  PT19_CHECKLIST,
  PT20_CHECKLIST,
  buildFormValues,
  formReadiness,
} from '@shared/forms.js';
import { useBook } from '../bookContext.js';
import Write from '../components/Write.jsx';
import { Icon } from '../ui.jsx';
import { Link } from '../router.jsx';
import { useLang } from '../i18n.jsx';

function usePrintPreview() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    document.documentElement.toggleAttribute('data-print-preview', on);
    return () => document.documentElement.removeAttribute('data-print-preview');
  }, [on]);
  return [on, () => setOn((v) => !v)];
}

function useFormEditor(formId) {
  const { book, update } = useBook();
  const values = buildFormValues(book, formId);
  const set = (key, val) => {
    update((b) => ({
      ...b,
      forms: {
        ...(b.forms || {}),
        [formId]: { ...(b.forms?.[formId] || {}), [key]: val },
      },
    }));
  };
  return [values, set];
}

function FCell({ label, en, k, values, set, type = 'text', span = 1, placeholder = '' }) {
  return (
    <div className={`ptcell ptcell--s${span}`}>
      <span className="ptcell__lbl">
        {label} {en && <em>{en}</em>}
      </span>
      <div className="ptcell__val">
        <Write value={values[k] || ''} onChange={(v) => set(k, v)} type={type} compact placeholder={placeholder} label={label} />
      </div>
    </div>
  );
}

/* ============================================================
   表格總覽頁 (/forms)
   ============================================================ */

export function FormsIndex() {
  const { book } = useBook();
  const { isEn } = useLang();

  return (
    <div className="formsindex">
      <div className="formsindex__head">
        <div>
          <span className="eyebrow">OFFICIAL FORMS · AUTO-FILLED</span>
          <h1>{isEn ? '3 Official Venture Scout Forms' : '三張官方表格（自動由紀錄冊帶入）'}</h1>
          <p>
            {isEn
              ? 'Personal particulars, Scout ID, HKID first-4-char prefix, dates and signatures are auto-populated from your record book. Tap any box to fine-tune before A4 printing.'
              : '個人摘要、Scout ID、香港身份證首四碼、各段章／金帶完成日期及申請人簽名均由紀錄冊自動帶入；列印前仍可點擊任何格線微調。'}
          </p>
        </div>
        <div className="formsindex__btns">
          <Link to="/p/p01" className="btn btn--ghost btn--sm">
            <Icon name="back" size={14} /> {isEn ? 'Back to Book' : '返回紀錄冊'}
          </Link>
          <Link to="/forms/all" className="btn btn--gold btn--sm">
            <Icon name="print" size={14} /> {isEn ? 'Open All 3 Forms' : '一次過預覽全部三張'}
          </Link>
        </div>
      </div>

      <div className="formcards">
        {FORM_ORDER.map((id) => {
          const meta = FORM_META[id];
          const check = formReadiness(book, id);
          return (
            <article key={id} className="formcard">
              <div className="formcard__top">
                <span className="formcard__code">{meta.code}</span>
                <span className={`formcard__status${check.ready ? ' is-ready' : ''}`}>
                  {check.ready
                    ? isEn
                      ? 'Ready to Print'
                      : '資料齊備'
                    : isEn
                      ? `${check.missing.length} fields pending`
                      : `尚有 ${check.missing.length} 項待填`}
                </span>
              </div>
              <h2>{isEn ? meta.en : meta.title}</h2>
              {!isEn && <p className="formcard__en">{meta.en}</p>}
              <p className="formcard__when">{meta.when}</p>
              <p className="tiny">{meta.duplexNote}</p>

              {!check.ready && (
                <p className="formcard__missing">
                  <strong>{isEn ? 'Pending: ' : '待補填：'}</strong>
                  {check.missing.join('、')}
                </p>
              )}

              <div className="formcard__actions">
                <Link to={`/forms/${id}`} className="btn btn--primary btn--sm">
                  <Icon name="file" size={14} /> {isEn ? `Open ${meta.short} (${meta.pages}p)` : `開啟 ${meta.short}（共 ${meta.pages} 頁）`}
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   FORM PT/65 (8/2026) — 考驗計劃（1 頁）
   ============================================================ */

function FormPT65() {
  const { book } = useBook();
  const [v, set] = useFormEditor('pt65');

  return (
    <article className="a4sheet">
      <header className="pthead">
        <div>
          <strong>香港童軍總會 Scout Association of Hong Kong</strong>
          <h1>深資童軍獎章及榮譽童軍獎章考驗計劃</h1>
          <p>Planning for Assessment of the Venture Scout Award and the Dragon Scout Award</p>
        </div>
        <span className="pthead__code">FORM PT/65 (8/2026)</span>
      </header>

      <h2 className="ptsec">(1) 個人摘要 Personal Particulars</h2>
      <div className="ptgrid">
        <FCell label="姓名（中文）" en="Name (Chinese)" k="nameZh" values={v} set={set} span={2} />
        <FCell label="姓名（英文）" en="Name (English)" k="nameEn" values={v} set={set} span={2} />
        <FCell label="出生日期" en="Date of Birth" k="dob" values={v} set={set} type="date" />
        <FCell label="年齡" en="Age" k="age" values={v} set={set} />
        <FCell label="性別" en="Gender" k="gender" values={v} set={set} />
        <FCell label="童軍成員編號" en="Scout ID" k="scoutId" values={v} set={set} />
        <FCell label="通訊地址（中文）" en="Address (Chinese)" k="addressZh" values={v} set={set} span={4} />
        <FCell label="通訊地址（英文）" en="Address (English)" k="addressEn" values={v} set={set} span={4} />
        <FCell label="所屬單位（旅）" en="Unit (Group)" k="group" values={v} set={set} span={2} />
        <FCell label="（區）" en="(District)" k="district" values={v} set={set} />
        <FCell label="（地域）" en="(Region)" k="region" values={v} set={set} />
        <FCell label="電郵地址" en="Email Address" k="email" values={v} set={set} span={2} />
        <FCell label="聯絡電話" en="Contact No." k="phone" values={v} set={set} span={2} />
        <FCell label="會員章簽發日期" en="Date of Membership Badge Issued" k="mbDate" values={v} set={set} type="date" span={2} />
        <FCell label="深資童軍肩章簽發日期" en="Date of Epaulettes Issued" k="epDate" values={v} set={set} type="date" span={2} />
      </div>

      <h2 className="ptsec">(2) 考驗計劃 Assessment Planning — 深資童軍獎章 Venture Scout Award</h2>
      <table className="pttable">
        <thead>
          <tr>
            <th style={{ width: '18%' }}>段章 Badges</th>
            <th>所選擇考驗之內容 Assessment Details</th>
            <th style={{ width: '15%' }}>由 From</th>
            <th style={{ width: '15%' }}>至 To</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>活動策劃 Project</strong></td>
            <td><Write value={v.l3ProjectDetail} onChange={(x) => set('l3ProjectDetail', x)} compact label="活動策劃段章內容" /></td>
            <td><Write value={v.l3ProjectFrom} onChange={(x) => set('l3ProjectFrom', x)} type="date" compact label="由" /></td>
            <td><Write value={v.l3ProjectTo} onChange={(x) => set('l3ProjectTo', x)} type="date" compact label="至" /></td>
          </tr>
          <tr>
            <td><strong>社會服務 Service (I)</strong></td>
            <td><Write value={v.l3Service1Detail} onChange={(x) => set('l3Service1Detail', x)} compact placeholder="選修部分(I)：急救／拯溺(I)" label="社會服務I" /></td>
            <td><Write value={v.l3Service1From} onChange={(x) => set('l3Service1From', x)} type="date" compact label="由" /></td>
            <td><Write value={v.l3Service1To} onChange={(x) => set('l3Service1To', x)} type="date" compact label="至" /></td>
          </tr>
          <tr>
            <td><strong>社會服務 Service (II)</strong></td>
            <td><Write value={v.l3Service2Detail} onChange={(x) => set('l3Service2Detail', x)} compact placeholder="選修部分(II)：消防／拯溺(II)／手語／精神健康急救／SOUL Keeper／共融大使" label="社會服務II" /></td>
            <td><Write value={v.l3Service2From} onChange={(x) => set('l3Service2From', x)} type="date" compact label="由" /></td>
            <td><Write value={v.l3Service2To} onChange={(x) => set('l3Service2To', x)} type="date" compact label="至" /></td>
          </tr>
          <tr>
            <td><strong>多元技能 Activity</strong></td>
            <td><Write value={[v.l3ActCat, v.l3ActDetail].filter(Boolean).join(' · ')} onChange={(x) => set('l3ActDetail', x)} compact placeholder="範疇及考驗內容" label="多元技能段章" /></td>
            <td><Write value={v.l3ActFrom} onChange={(x) => set('l3ActFrom', x)} type="date" compact label="由" /></td>
            <td><Write value={v.l3ActTo} onChange={(x) => set('l3ActTo', x)} type="date" compact label="至" /></td>
          </tr>
          <tr>
            <td><strong>戶外探險 Exploration</strong></td>
            <td><Write value={[v.l3ExpTraining, v.l3ExpElective].filter(Boolean).join(' · ')} onChange={(x) => set('l3ExpElective', x)} compact placeholder="認可前設訓練及探險旅程選項" label="戶外探險段章" /></td>
            <td><Write value={v.l3ExpFrom} onChange={(x) => set('l3ExpFrom', x)} type="date" compact label="由" /></td>
            <td><Write value={v.l3ExpTo} onChange={(x) => set('l3ExpTo', x)} type="date" compact label="至" /></td>
          </tr>
        </tbody>
      </table>

      <h2 className="ptsec">榮譽童軍獎章 Dragon Scout Award</h2>
      <table className="pttable">
        <thead>
          <tr>
            <th style={{ width: '18%' }}>金帶 Bars</th>
            <th>所選擇考驗之內容 Assessment Details</th>
            <th style={{ width: '15%' }}>由 From</th>
            <th style={{ width: '15%' }}>至 To</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>活動策劃 Project</strong></td>
            <td><Write value={v.l4ProjDetail} onChange={(x) => set('l4ProjDetail', x)} compact placeholder="活動策劃金帶計劃內容" label="活動策劃金帶" /></td>
            <td><Write value={v.l4ProjFrom} onChange={(x) => set('l4ProjFrom', x)} type="date" compact label="由" /></td>
            <td><Write value={v.l4ProjTo} onChange={(x) => set('l4ProjTo', x)} type="date" compact label="至" /></td>
          </tr>
          <tr>
            <td><strong>社會服務 Service</strong></td>
            <td><Write value={v.l4ServDetail} onChange={(x) => set('l4ServDetail', x)} compact placeholder="童軍及社區服務／志願服務／寰宇童軍計劃" label="社會服務金帶" /></td>
            <td><Write value={v.l4ServFrom} onChange={(x) => set('l4ServFrom', x)} type="date" compact label="由" /></td>
            <td><Write value={v.l4ServTo} onChange={(x) => set('l4ServTo', x)} type="date" compact label="至" /></td>
          </tr>
          <tr>
            <td><strong>多元技能 Activity (甲)</strong></td>
            <td><Write value={[v.l4ActCatA, v.l4ActDetailA].filter(Boolean).join(' · ')} onChange={(x) => set('l4ActDetailA', x)} compact placeholder="第一範疇及內容" label="多元技能金帶甲" /></td>
            <td><Write value={v.l4ActFromA} onChange={(x) => set('l4ActFromA', x)} type="date" compact label="由" /></td>
            <td><Write value={v.l4ActToA} onChange={(x) => set('l4ActToA', x)} type="date" compact label="至" /></td>
          </tr>
          <tr>
            <td><strong>多元技能 Activity (乙)</strong></td>
            <td><Write value={[v.l4ActCatB, v.l4ActDetailB].filter(Boolean).join(' · ')} onChange={(x) => set('l4ActDetailB', x)} compact placeholder="第二不同範疇及內容" label="多元技能金帶乙" /></td>
            <td><Write value={v.l4ActFromB} onChange={(x) => set('l4ActFromB', x)} type="date" compact label="由" /></td>
            <td><Write value={v.l4ActToB} onChange={(x) => set('l4ActToB', x)} type="date" compact label="至" /></td>
          </tr>
          <tr>
            <td><strong>戶外探險 Exploration</strong></td>
            <td><Write value={v.l4ExpElective} onChange={(x) => set('l4ExpElective', x)} compact placeholder="四日三夜或以上探險旅程" label="戶外探險金帶" /></td>
            <td><Write value={v.l4ExpFrom} onChange={(x) => set('l4ExpFrom', x)} type="date" compact label="由" /></td>
            <td><Write value={v.l4ExpTo} onChange={(x) => set('l4ExpTo', x)} type="date" compact label="至" /></td>
          </tr>
        </tbody>
      </table>

      <div className="ptsignrow">
        <div className="ptsignbox">
          <span>深資童軍簽署 Signature of Venture Scout：</span>
          {book.holderSignature?.png ? <img src={book.holderSignature.png} alt="簽署" /> : <em className="ptblank">（列印後親筆簽署或於第 1 頁簽名）</em>}
        </div>
        <div className="ptsignbox">
          <span>提交／修訂日期 Submission / Revision Date：</span>
          <Write value={v.applicantDate} onChange={(x) => set('applicantDate', x)} type="date" compact label="提交日期" />
        </div>
      </div>
    </article>
  );
}

/* ============================================================
   共用背面簽批頁與第 3 頁查閱清單（PT/19 及 PT/20）
   ============================================================ */

function ReturnAddressLabels({ values, set }) {
  return (
    <div className="ptreturn">
      <div className="ptreturn__title">請用正楷填寫回郵地址 Please fill in return address using BLOCK LETTERS</div>
      <div className="ptreturn__cols">
        {[0, 1, 2].map((i) => (
          <div key={i} className="ptreturn__box">
            <div>
              <small>姓名 Name：</small>
              <Write value={values.returnName} onChange={(x) => set('returnName', x)} compact label="回郵姓名" />
            </div>
            <div>
              <small>地址 Address：</small>
              <Write value={values.returnAddress} onChange={(x) => set('returnAddress', x)} multiline rows={2} compact label="回郵地址" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EndorsementBackPage({ code, awardZh, awardEn, values, set, rallyNote = false }) {
  const { book } = useBook();
  return (
    <article className="a4sheet">
      <header className="pthead pthead--compact">
        <strong>{code} · 第 2 頁（背面須與第 1 頁雙面列印於同一張紙）</strong>
        <span>{awardZh} ({awardEn})</span>
      </header>

      <div className="ptendorse">
        <div className="ptendorse__box">
          <h3>申請者簽署 Applicant’s Signature</h3>
          <p>茲證明上述資料正確無訛。I hereby declare that the above information is true to my fullest understanding.</p>
          <div className="ptendorse__sig">
            {book.holderSignature?.png ? <img src={book.holderSignature.png} alt="申請人簽署" /> : <span>簽署 Signature：＿＿＿＿＿＿＿＿</span>}
          </div>
          <div className="ptendorse__foot">
            <span>日期 Date：</span>
            <Write value={values.applicantDate} onChange={(x) => set('applicantDate', x)} type="date" compact label="申請日期" />
          </div>
        </div>

        <div className="ptendorse__box">
          <h3>提名 Nomination（旅長／深資童軍團長 GSL/VSL）</h3>
          <p>茲經核證上述資料正確無誤，並提名申請人獲取{awardZh}。</p>
          <div className="ptendorse__stamp">簽署及旅印／團印 Group/Venture Stamp</div>
          <div className="ptendorse__foot">
            <span>姓名 Name：</span>
            <Write value={values.nominatorName} onChange={(x) => set('nominatorName', x)} compact label="提名人姓名" />
            <span>日期 Date：＿＿＿＿＿＿</span>
          </div>
        </div>

        <div className="ptendorse__box">
          <h3>推薦 Recommendation（區總監 District Commissioner）</h3>
          <p>茲推薦申請人獲取{awardZh}。</p>
          <div className="ptendorse__stamp">區總監簽署及區印 District Stamp</div>
          <div className="ptendorse__foot">
            <span>姓名 Name：＿＿＿＿＿＿＿＿</span>
            <span>日期 Date：＿＿＿＿＿＿</span>
          </div>
        </div>

        <div className="ptendorse__box">
          <h3>批核／推薦 Approval（地域總監 Regional Commissioner）</h3>
          <p>茲批准／推薦上述申請。</p>
          <div className="ptendorse__stamp">地域總監簽署及地域印 Regional Stamp</div>
          <div className="ptendorse__foot">
            <span>姓名 Name：＿＿＿＿＿＿＿＿</span>
            <span>日期 Date：＿＿＿＿＿＿</span>
          </div>
        </div>

        <div className="ptendorse__box">
          <h3>確認 Confirmation（青少年活動總監 Programme Commissioner）</h3>
          <p>茲確認上述申請。I hereby confirm the above application.</p>
          <div className="ptendorse__stamp">青少年活動署印 Programme Branch Stamp</div>
          <div className="ptendorse__foot">
            <span>姓名 Name：＿＿＿＿＿＿＿＿</span>
            <span>日期 Date：＿＿＿＿＿＿</span>
          </div>
        </div>

        <div className="ptendorse__box ptendorse__box--office">
          <h3>辦事處專用 Office Use Only</h3>
          <p>收表日期 Received Date：＿＿＿＿＿＿＿＿</p>
          <p>證書號碼 Certificate No.：＿＿＿＿＿＿＿＿</p>
          <p>查核 Checked：＿＿＿＿ · 發出日期 Issue Date：＿＿＿＿</p>
          <p>備註 Remarks：＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿</p>
        </div>
      </div>

      <div className="ptnotes">
        <h4>申請辦法及個人資料備註 Application Procedures &amp; Remarks</h4>
        <ol>
          <li>本表格第 1 及第 2 頁必須雙面列印於同一張 A4 紙上，經旅長／團長提名、區總監及地域總監簽批後，連同紀錄冊相關頁次及證書影印本交總會青少年活動署。</li>
          {rallyNote && (
            <li>
              <strong>大會操截數提示：</strong>全年均接受申請；如於每年 <strong>9 月 15 日或以前</strong>呈交到總會青少年活動署，證書將安排於該年香港童軍大會操頒發。
            </li>
          )}
          <li>表格內填報的個人資料純屬自願，僅供香港童軍總會處理有關獎章申請用途；一般情況下申請表將於審批完成後 2 年銷毀。</li>
        </ol>
      </div>
    </article>
  );
}

function ChecklistPage({ code, list, formId }) {
  const { book, update } = useBook();
  const manual = book.forms?.[`${formId}_chk`] || {};

  const toggle = (key, current) => {
    update((b) => ({
      ...b,
      forms: {
        ...(b.forms || {}),
        [`${formId}_chk`]: { ...(b.forms?.[`${formId}_chk`] || {}), [key]: !current },
      },
    }));
  };

  return (
    <article className="a4sheet">
      <header className="pthead pthead--compact">
        <strong>{code} · 第 3 頁 · 查閱清單 Checklist</strong>
        <span>請於方格內填上 ✓ 號 Please ✓ in the appropriate boxes</span>
      </header>

      <table className="pttable pttable--chk">
        <thead>
          <tr>
            <th>證明文件 Documentary Evidence</th>
            <th style={{ width: '11%' }}>申請人 Applicant</th>
            <th style={{ width: '9%' }}>區 District</th>
            <th style={{ width: '9%' }}>地域 Region</th>
            <th style={{ width: '9%' }}>總會 AHQ</th>
          </tr>
        </thead>
        <tbody>
          {list.map((row) => {
            const checked = manual[row.key] !== undefined ? manual[row.key] : row.auto(book);
            return (
              <tr key={row.key}>
                <td>
                  <strong>{row.zh}</strong>
                  <div className="tiny">{row.en}</div>
                </td>
                <td className="ptchkcell" onClick={() => toggle(row.key, checked)} role="button" tabIndex={0}>
                  <span className="ptchkbox">{checked ? '✓' : ''}</span>
                </td>
                <td className="ptchkcell"><span className="ptchkbox" /></td>
                <td className="ptchkcell"><span className="ptchkbox" /></td>
                <td className="ptchkcell"><span className="ptchkbox" /></td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="ptfollow">
        <div>
          <strong>區 District 跟進紀錄</strong>
          <p>□ 已核對證明文件正本 · □ 證明文件齊備妥當</p>
          <p>□ 區總監推薦 · □ 轉交地域辦事處</p>
          <p>經手人 Handled by：＿＿＿＿＿＿ 日期 Date：＿＿＿＿＿＿</p>
        </div>
        <div>
          <strong>地域 Region 跟進紀錄</strong>
          <p>□ 證明文件齊備妥當 · □ 地域總監批核／推薦</p>
          <p>□ 轉交青少年活動署辦事處</p>
          <p>經手人 Handled by：＿＿＿＿＿＿ 日期 Date：＿＿＿＿＿＿</p>
        </div>
        <div>
          <strong>青少年活動署 Programme Branch</strong>
          <p>□ 證明文件齊備妥當</p>
          <p>經手人 Handled by：＿＿＿＿＿＿ 日期 Date：＿＿＿＿＿＿</p>
        </div>
      </div>
    </article>
  );
}

/* ============================================================
   FORM PT/19 (10/2026) — 深資童軍獎章申請表（3 頁）
   ============================================================ */

function FormPT19() {
  const { book } = useBook();
  const [v, set] = useFormEditor('pt19');

  return (
    <>
      <article className="a4sheet">
        <header className="pthead">
          <div>
            <strong>香港童軍總會 Scout Association of Hong Kong</strong>
            <h1>深資童軍獎章及證書申請表</h1>
            <p>Application Form for the Venture Scout Award and Certificate</p>
          </div>
          <div className="pthead__right">
            <span className="pthead__code">FORM PT/19 (10/2026)</span>
            <div className="ptphoto">
              {book.member?.photo ? <img src={book.member.photo} alt="近照" /> : <span>近照<br />Recent Photo</span>}
            </div>
          </div>
        </header>

        <h2 className="ptsec">(1) 個人摘要 Personal Particulars（*身份證只需填首四位如 A123）</h2>
        <div className="ptgrid">
          <FCell label="姓名（中文）" en="Name (Chinese)" k="nameZh" values={v} set={set} span={2} />
          <FCell label="姓名（英文）" en="Name (English)" k="nameEn" values={v} set={set} />
          <FCell label="身份證號碼首四位*" en="HKID First 4*" k="hkidPrefix" values={v} set={set} placeholder="A123" />
          <FCell label="出生日期" en="Date of Birth" k="dob" values={v} set={set} type="date" />
          <FCell label="年齡" en="Age" k="age" values={v} set={set} />
          <FCell label="性別" en="Gender" k="gender" values={v} set={set} />
          <FCell label="童軍成員編號" en="Scout ID" k="scoutId" values={v} set={set} />
          <FCell label="通訊地址（中文）" en="Address (Chinese)" k="addressZh" values={v} set={set} span={4} />
          <FCell label="通訊地址（英文）" en="Address (English)" k="addressEn" values={v} set={set} span={4} />
          <FCell label="所屬單位（旅）" en="Unit (Group)" k="group" values={v} set={set} span={2} />
          <FCell label="（區）" en="(District)" k="district" values={v} set={set} />
          <FCell label="（地域）" en="(Region)" k="region" values={v} set={set} />
          <FCell label="聯絡電話" en="Contact No." k="phone" values={v} set={set} span={2} />
          <FCell label="電郵地址" en="Email Address" k="email" values={v} set={set} span={2} />
          <FCell label="會員章簽發日期" en="Issue Date of Membership Badge" k="mbDate" values={v} set={set} type="date" span={2} />
          <FCell label="深資童軍肩章簽發日期" en="Date of Epaulettes Issued" k="epDate" values={v} set={set} type="date" span={2} />
        </div>

        <h2 className="ptsec">(2) 完成項目 Completed Items</h2>
        <table className="pttable">
          <thead>
            <tr>
              <th style={{ width: '20%' }}>段章 Badges</th>
              <th>所選擇考驗之內容 Assessment Details</th>
              <th style={{ width: '18%' }}>完成日期 Date of Completion</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>活動策劃 Project</strong></td>
              <td><Write value={v.l3ProjectDetail} onChange={(x) => set('l3ProjectDetail', x)} compact label="活動策劃段章" /></td>
              <td><Write value={v.l3ProjectDate} onChange={(x) => set('l3ProjectDate', x)} type="date" compact label="完成日期" /></td>
            </tr>
            <tr>
              <td><strong>社會服務 Service — 選修(I)</strong></td>
              <td><Write value={v.l3Service1Detail} onChange={(x) => set('l3Service1Detail', x)} compact label="社會服務I" /></td>
              <td><Write value={v.l3Service1Date} onChange={(x) => set('l3Service1Date', x)} type="date" compact label="完成日期" /></td>
            </tr>
            <tr>
              <td><strong>社會服務 Service — 選修(II)</strong></td>
              <td><Write value={v.l3Service2Detail} onChange={(x) => set('l3Service2Detail', x)} compact label="社會服務II" /></td>
              <td><Write value={v.l3Service2Date} onChange={(x) => set('l3Service2Date', x)} type="date" compact label="完成日期" /></td>
            </tr>
            <tr>
              <td><strong>多元技能 Activity</strong></td>
              <td><Write value={[v.l3ActCat, v.l3ActDetail].filter(Boolean).join(' · ')} onChange={(x) => set('l3ActDetail', x)} compact label="多元技能段章" /></td>
              <td><Write value={v.l3ActDate} onChange={(x) => set('l3ActDate', x)} type="date" compact label="完成日期" /></td>
            </tr>
            <tr>
              <td><strong>戶外探險 — 認可訓練</strong></td>
              <td><Write value={v.l3ExpTraining} onChange={(x) => set('l3ExpTraining', x)} compact placeholder="認可遠足／海上旅程訓練（如需要）" label="認可訓練" /></td>
              <td><Write value={v.l3ExpTrainingDate} onChange={(x) => set('l3ExpTrainingDate', x)} type="date" compact label="訓練完成日期" /></td>
            </tr>
            <tr>
              <td><strong>戶外探險 — 旅程選項</strong></td>
              <td><Write value={v.l3ExpElective} onChange={(x) => set('l3ExpElective', x)} compact label="戶外探險選項" /></td>
              <td><Write value={v.l3ExpDate} onChange={(x) => set('l3ExpDate', x)} type="date" compact label="旅程完成日期" /></td>
            </tr>
          </tbody>
        </table>

        <ReturnAddressLabels values={v} set={set} />
      </article>

      <EndorsementBackPage code="FORM PT/19 (10/2026)" awardZh="深資童軍獎章" awardEn="Venture Scout Award" values={v} set={set} />
      <ChecklistPage code="FORM PT/19 (10/2026)" list={PT19_CHECKLIST} formId="pt19" />
    </>
  );
}

/* ============================================================
   FORM PT/20 (10/2026) — 榮譽童軍獎章申請表（3 頁）
   ============================================================ */

function FormPT20() {
  const { book } = useBook();
  const [v, set] = useFormEditor('pt20');

  return (
    <>
      <article className="a4sheet">
        <header className="pthead">
          <div>
            <strong>香港童軍總會 Scout Association of Hong Kong</strong>
            <h1>榮譽童軍獎章及證書申請表</h1>
            <p>Application Form for the Dragon Scout Award and Certificate</p>
          </div>
          <div className="pthead__right">
            <span className="pthead__code">FORM PT/20 (10/2026)</span>
            <div className="ptphoto">
              {book.member?.photo ? <img src={book.member.photo} alt="近照" /> : <span>近照<br />Recent Photo</span>}
            </div>
          </div>
        </header>

        <h2 className="ptsec">(1) 個人摘要 Personal Particulars（*身份證只需填首四位如 A123）</h2>
        <div className="ptgrid">
          <FCell label="姓名（中文）" en="Name (Chinese)" k="nameZh" values={v} set={set} span={2} />
          <FCell label="姓名（英文）" en="Name (English)" k="nameEn" values={v} set={set} />
          <FCell label="身份證號碼首四位*" en="HKID First 4*" k="hkidPrefix" values={v} set={set} placeholder="A123" />
          <FCell label="出生日期" en="Date of Birth" k="dob" values={v} set={set} type="date" />
          <FCell label="年齡" en="Age" k="age" values={v} set={set} />
          <FCell label="性別" en="Gender" k="gender" values={v} set={set} />
          <FCell label="童軍成員編號" en="Scout ID" k="scoutId" values={v} set={set} />
          <FCell label="通訊地址（中文）" en="Address (Chinese)" k="addressZh" values={v} set={set} span={4} />
          <FCell label="通訊地址（英文）" en="Address (English)" k="addressEn" values={v} set={set} span={4} />
          <FCell label="所屬單位（旅）" en="Unit (Group)" k="group" values={v} set={set} span={2} />
          <FCell label="（區）" en="(District)" k="district" values={v} set={set} />
          <FCell label="（地域）" en="(Region)" k="region" values={v} set={set} />
          <FCell label="聯絡電話" en="Contact No." k="phone" values={v} set={set} span={2} />
          <FCell label="電郵地址" en="Email Address" k="email" values={v} set={set} span={2} />
          <FCell label="深資童軍獎章證書號碼" en="Venture Scout Award Cert. No." k="vsaCertNo" values={v} set={set} span={2} />
          <FCell label="證書發出日期" en="Certificate Issue Date" k="vsaDate" values={v} set={set} type="date" span={2} />
        </div>

        <h2 className="ptsec">(2) 完成項目 Completed Items（榮譽童軍金帶 Bars）</h2>
        <table className="pttable">
          <thead>
            <tr>
              <th style={{ width: '22%' }}>金帶 Bars</th>
              <th>所選擇考驗之內容 Assessment Details</th>
              <th style={{ width: '18%' }}>完成日期 Date of Completion</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>活動策劃 Project</strong></td>
              <td><Write value={v.l4ProjDetail} onChange={(x) => set('l4ProjDetail', x)} compact label="活動策劃金帶" /></td>
              <td><Write value={v.l4ProjDate} onChange={(x) => set('l4ProjDate', x)} type="date" compact label="完成日期" /></td>
            </tr>
            <tr>
              <td><strong>社會服務 Service</strong></td>
              <td><Write value={v.l4ServDetail} onChange={(x) => set('l4ServDetail', x)} compact label="社會服務金帶" /></td>
              <td><Write value={v.l4ServDate} onChange={(x) => set('l4ServDate', x)} type="date" compact label="完成日期" /></td>
            </tr>
            <tr>
              <td><strong>多元技能 Activity（範疇甲）</strong></td>
              <td><Write value={[v.l4ActCatA, v.l4ActDetailA].filter(Boolean).join(' · ')} onChange={(x) => set('l4ActDetailA', x)} compact label="多元技能金帶範疇甲" /></td>
              <td><Write value={v.l4ActDateA} onChange={(x) => set('l4ActDateA', x)} type="date" compact label="完成日期" /></td>
            </tr>
            <tr>
              <td><strong>多元技能 Activity（範疇乙）</strong></td>
              <td><Write value={[v.l4ActCatB, v.l4ActDetailB].filter(Boolean).join(' · ')} onChange={(x) => set('l4ActDetailB', x)} compact label="多元技能金帶範疇乙" /></td>
              <td><Write value={v.l4ActDateB} onChange={(x) => set('l4ActDateB', x)} type="date" compact label="完成日期" /></td>
            </tr>
            <tr>
              <td><strong>探險 — 認可前設訓練</strong></td>
              <td><Write value={v.l4ExpTraining} onChange={(x) => set('l4ExpTraining', x)} compact placeholder="認可遠足／海上旅程訓練（如需要）" label="認可訓練" /></td>
              <td><Write value={v.l4ExpTrainingDate} onChange={(x) => set('l4ExpTrainingDate', x)} type="date" compact label="訓練完成日期" /></td>
            </tr>
            <tr>
              <td><strong>探險 — 旅程選項</strong></td>
              <td><Write value={v.l4ExpElective} onChange={(x) => set('l4ExpElective', x)} compact label="探險金帶旅程" /></td>
              <td><Write value={v.l4ExpDate} onChange={(x) => set('l4ExpDate', x)} type="date" compact label="完成日期" /></td>
            </tr>
          </tbody>
        </table>

        <ReturnAddressLabels values={v} set={set} />
      </article>

      <EndorsementBackPage
        code="FORM PT/20 (10/2026)"
        awardZh="榮譽童軍獎章"
        awardEn="Dragon Scout Award"
        values={v}
        set={set}
        rallyNote
      />
      <ChecklistPage code="FORM PT/20 (10/2026)" list={PT20_CHECKLIST} formId="pt20" />
    </>
  );
}

export function FormDoc({ id }) {
  const { isEn } = useLang();
  const [preview, togglePreview] = usePrintPreview();
  const meta = FORM_META[id];
  if (!meta) return <FormsIndex />;

  return (
    <div className="formdoc">
      <div className="formdoc__bar no-print">
        <Link to="/forms" className="btn btn--ghost btn--sm">
          <Icon name="back" size={14} /> {isEn ? 'All Forms' : '全部表格'}
        </Link>
        <div className="formdoc__tabs">
          {FORM_ORDER.map((fid) => (
            <Link key={fid} to={`/forms/${fid}`} className={`formtab${fid === id ? ' is-on' : ''}`}>
              {FORM_META[fid].short}
            </Link>
          ))}
        </div>
        <div className="formdoc__acts">
          <button type="button" className={`btn btn--ghost btn--sm${preview ? ' is-on' : ''}`} onClick={togglePreview}>
            {preview ? (isEn ? 'Resume Editing' : '返回填寫') : isEn ? 'Print Preview' : '預覽列印效果'}
          </button>
          <button type="button" className="btn btn--gold btn--sm" onClick={() => window.print()}>
            <Icon name="print" size={14} /> {isEn ? 'Print A4' : 'A4 列印／存 PDF'}
          </button>
        </div>
      </div>

      <p className="formdoc__hint no-print">
        <Icon name="info" size={14} /> <span>{meta.duplexNote}</span>
      </p>

      {id === 'pt65' ? <FormPT65 /> : id === 'pt19' ? <FormPT19 /> : <FormPT20 />}
    </div>
  );
}

export function FormsAll() {
  const { isEn } = useLang();
  const [preview, togglePreview] = usePrintPreview();
  return (
    <div className="formdoc">
      <div className="formdoc__bar no-print">
        <Link to="/forms" className="btn btn--ghost btn--sm">
          <Icon name="back" size={14} /> {isEn ? 'Back' : '返回表格總覽'}
        </Link>
        <strong>{isEn ? 'All 3 Official Forms (7 A4 Pages Total)' : '全部三張官方表格（共 7 頁 A4）'}</strong>
        <div className="formdoc__acts">
          <button type="button" className={`btn btn--ghost btn--sm${preview ? ' is-on' : ''}`} onClick={togglePreview}>
            {preview ? (isEn ? 'Resume Editing' : '返回填寫') : isEn ? 'Print Preview' : '預覽列印效果'}
          </button>
          <button type="button" className="btn btn--gold btn--sm" onClick={() => window.print()}>
            <Icon name="print" size={14} /> {isEn ? 'Print All' : '一次過列印'}
          </button>
        </div>
      </div>
      <FormPT65 />
      <FormPT19 />
      <FormPT20 />
    </div>
  );
}
