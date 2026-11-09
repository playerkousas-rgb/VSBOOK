import React, { useState } from 'react';
import { SECTIONS, allStats, sanitizeHkidPrefix, today, uid } from '@shared/book.js';
import { useBook, useField, useReadOnly } from '../bookContext.js';
import { Area, BadgeArt, Bilingual, Grid, H, Line, Note, P, Page, Rows, Sig } from '../components/Form.jsx';
import { PhotoPicker } from '../components/PhotoPicker.jsx';
import Write from '../components/Write.jsx';
import { SignModal } from '../components/Ink.jsx';
import { Icon, SealMark, cx } from '../ui.jsx';
import { Link } from '../router.jsx';
import { useLang } from '../i18n.jsx';

const TOC_GROUPS = [
  {
    title: '個人及支部要旨',
    en: 'Personal & Section Essentials',
    ids: ['p01', 'p02', 'p03', 'p04', 'p05', 'p06', 'p07', 'p08'],
  },
  {
    title: '會員章及深資童軍肩章',
    en: 'Membership Badge & Epaulettes',
    ids: ['p09', 'p10', 'p11', 'p12', 'p13'],
  },
  {
    title: '深資童軍獎章（四段章）',
    en: 'Venture Scout Award · 4 Badges',
    ids: ['p14', 'p15', 'p16', 'p17', 'p18', 'p19', 'p20'],
  },
  {
    title: '榮譽童軍獎章（四金帶）',
    en: 'Dragon Scout Award · 4 Bars',
    ids: ['p21', 'p22', 'p23', 'p24', 'p25', 'p26', 'p27', 'p28', 'p29', 'p30', 'p31', 'p32', 'p33'],
  },
  {
    title: '其他獎章、經驗及附錄',
    en: 'Other Badges, Records & Appendix',
    ids: ['p34', 'p35', 'p36', 'p37', 'p38', 'p39', 'p40', 'appendix'],
  },
];

/* ------------------------------------------------------------ 數位目錄頁（1:1 對齊 ROVERBOOK Contents 扉頁排版） */
export function ContentsPage() {
  const { book } = useBook();
  const { isEn } = useLang();
  const stats = allStats(book);
  const byId = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));
  const latestRenewal = (book.renewals || []).filter((r) => r?.validUntil).sort((a, b) => b.validUntil.localeCompare(a.validUntil))[0];

  return (
    <Page id="contents" className="p-contents">
      <div className="tocpage">
        <div className="tocpage__progress">
          <div className="tocring-ring" style={{ '--p': `${stats.percent}%` }}>
            <span>{stats.percent}%</span>
          </div>
          <div className="tocpage__progress-text">
            <strong>
              {isEn ? `${stats.done} / ${stats.total} items done` : `${stats.done} / ${stats.total} 項已完成`}
            </strong>
            <span>
              {stats.nextBadge?.badge?.name
                ? isEn
                  ? `Next: ${stats.nextBadge.badge.en || stats.nextBadge.badge.name} · ${stats.nextBadge.done}/${stats.nextBadge.total}`
                  : `下一枚：${stats.nextBadge.badge.name} · ${stats.nextBadge.done}/${stats.nextBadge.total}`
                : isEn
                  ? 'All complete'
                  : '全部完成'}
            </span>
          </div>
        </div>

        <p className="tocpage__intro">
          {isEn
            ? 'This digital edition follows the Venture Scout Record Book (11th Edition Syllabus) page by page, pages 1–40. Tap any line to write; text scales automatically to fit.'
            : '本電子版逐頁對應《深資童軍紀錄冊》（第十一版訓練綱要）第 1–40 頁。每一頁都可以直接點擊填寫，字體會自動縮放。'}
        </p>

        <div className="tocpage__cols">
          {TOC_GROUPS.map((g) => (
            <section key={g.title} className="tocsec">
              <h4>{isEn ? g.en : g.title}</h4>
              <ul>
                {g.ids.map((id) => {
                  const s = byId[id];
                  if (!s) return null;
                  return (
                    <li key={s.id}>
                      <Link to={`/p/${s.id}`}>
                        <span className="tocsec__no">{s.page === '—' ? (isEn ? 'App.' : '附錄') : s.page}</span>
                        <span className="tocsec__label">{isEn ? s.en || s.label : s.label}</span>
                        <Icon name="chevron" size={11} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        <div className="tocsummary">
          <div>
            <span>{isEn ? `${stats.done} / ${stats.total} training items` : `${stats.done} / ${stats.total} 項訓練細項`}</span>
            <strong>{stats.percent}%</strong>
          </div>
          <div>
            <span>{isEn ? 'Membership valid until' : '會籍有效至'}</span>
            <strong>{latestRenewal?.validUntil || (isEn ? 'Not renewed' : '未續期')}</strong>
          </div>
          <div>
            <span>{isEn ? 'Official forms' : '官方申請表'}</span>
            <Link to="/forms" className="tocsummary__formlink">
              PT/65 · 19 · 20 <Icon name="chevron" size={11} />
            </Link>
          </div>
          <Link to="/p/appendix" className="tocsummary__full">
            {isEn ? 'Digital appendix: backup · vsbadge sync · print' : '數位附錄：備份 · vsbadge 互通 · 列印'}{' '}
            <Icon name="chevron" size={12} />
          </Link>
        </div>
      </div>
    </Page>
  );
}

/* ------------------------------------------------------------ 第 1 頁：個人資料 */
export function P01() {
  const [photo, setPhoto] = useField('member.photo', null);
  const { isEn } = useLang();

  return (
    <Page id="p01">
      <H en="PERSONAL PARTICULARS">個人資料</H>

      <div className="ptop">
        <div className="ptop__photo">
          <PhotoPicker value={photo} onChange={setPhoto} />
        </div>
        <div className="ptop__id">
          <Line
            label="童軍成員編號"
            en="Scout ID"
            path="member.scoutId"
            placeholder="25081420"
            hint={isEn ? 'Shared identifier with vsbadge & PT forms' : '與 vsbadge 及 PT/65・19・20 共用同一編號'}
          />
          <Line label="姓名 (中文)" en="Name (Chinese)" path="member.nameZh" placeholder="張芷晴" />
          <Line label="(英文)" en="Name (English)" path="member.nameEn" placeholder="CHEUNG Tsz-ching" />
        </div>
      </div>

      <Grid cols={3}>
        <Line label="地域" en="Region" path="member.region" placeholder="港島地域" />
        <Line label="區" en="District" path="member.district" placeholder="灣仔區" />
        <Line label="旅" en="Group" path="member.group" placeholder="港島第 28 旅" />
      </Grid>

      <Grid cols={2}>
        <Line label="出生日期" en="Date of Birth" type="date" path="member.dob" />
        <Line label="出生地點" en="Place of Birth" path="member.placeOfBirth" placeholder="香港" />
        <Line label="聯絡電話" en="Telephone No." path="member.phone" placeholder="9234 5678" />
        <Line label="血型" en="Blood Type" path="member.bloodType" placeholder="A+" />
      </Grid>

      <Grid cols={2}>
        <Line label="緊急聯絡人姓名" en="Name of Emergency Contact Person" path="member.emergencyName" placeholder="張國華（父親）" />
        <Line label="聯絡電話" en="Emergency Telephone No." path="member.emergencyPhone" placeholder="9123 8899" />
      </Grid>

      <details className="formsup">
        <summary>
          {isEn
            ? 'PT/65 · PT/19 · PT/20 Form Auto-fill Supplement (Address, Email, Gender, HKID first 4 chars)'
            : '官方申請表（PT/65・PT/19・PT/20）自動帶入補充欄（電郵、通訊地址、性別、身份證首四位）'}
        </summary>
        <div className="formsup__body">
          <Grid cols={3}>
            <Line
              label="身份證首四位*"
              en="HKID First 4 Chars*"
              path="member.hkidPrefix"
              placeholder="A123"
              transform={sanitizeHkidPrefix}
              hint={isEn ? 'First 4 chars only (for PT/19 & PT/20)' : '只填首四位如 A123（供 PT/19・20 用）'}
            />
            <Line label="性別" en="Gender" path="member.gender" placeholder="M / F" />
            <Line label="電郵地址" en="Email Address" path="member.email" placeholder="member@example.org" />
          </Grid>
          <Line label="通訊地址（中文）" en="Address (Chinese)" path="member.addressZh" wide placeholder="香港灣仔軒尼詩道..." />
          <Line label="通訊地址（英文）" en="Address (English)" path="member.addressEn" wide placeholder="Flat B, 15/F..." />
        </div>
      </details>

      <Sig label="持有人簽署" en="Signature of Holder" path="holderSignature" />
    </Page>
  );
}

/* ------------------------------------------------------------ 第 2 頁：轉旅 · 旅部資料 */
export function P02() {
  return (
    <Page id="p02">
      <H en="TRANSFER OF GROUP">轉旅</H>
      <Rows
        path="transfers"
        min={3}
        addLabel={null}
        cols={[
          { k: 'date', label: '日期', en: 'Date', type: 'date', width: 1 },
          { k: 'newGroup', label: '新旅旅號', en: 'Number of New Group', width: 2 },
        ]}
      />

      <H en="GROUP INFORMATION">旅部資料</H>
      <Line label="主辦機構" en="Sponsoring Authority" path="member.sponsoringAuthority" wide placeholder="主辦機構名稱" />
      <Area label="旅部地址" en="Group Address" path="member.groupAddress" rows={2} placeholder="集會及旅部通訊地址" />
      <Grid cols={2}>
        <Line label="旅長姓名" en="Name of GSL" path="member.gsl" placeholder="旅長姓名" />
        <Line label="團長姓名" en="Name of VSL" path="member.vsl" placeholder="深資童軍團長姓名" />
        <Line label="團長聯絡電話" en="Telephone No. of VSL" path="member.vslPhone" placeholder="9345 6789" />
        <Line label="所屬深資童軍團名稱" en="Venture Scout Unit" path="member.unit" placeholder="例如：港島第 28 旅深資童軍團" />
        <Line label="入團日期" en="Date Joined" type="date" path="member.dateJoined" />
        <Line label="加入童軍運動日期" en="Date of Joining the Scout Movement" type="date" path="member.dateScoutMovement" />
      </Grid>
    </Page>
  );
}

/* ------------------------------------------------------------ 第 3 頁：童軍紀錄 · 遷移地址 · 更改個人摘要 */
const EXP_SECTIONS = [
  { key: 'grasshopper', zh: '小童軍', en: 'Grasshopper Scout' },
  { key: 'cub', zh: '幼童軍', en: 'Cub Scout' },
  { key: 'scout', zh: '童軍', en: 'Scout' },
];

export function P03() {
  const { book, update } = useBook();
  const { isEn } = useLang();

  const setExp = (sec, field, val) => {
    update((b) => ({
      ...b,
      scouting: {
        ...(b.scouting || {}),
        [sec]: { ...(b.scouting?.[sec] || {}), [field]: val },
      },
    }));
  };

  return (
    <Page id="p03" dense>
      <H en="SCOUTING EXPERIENCE">童軍紀錄</H>
      <div className="pgtable pgtable--dense">
        <div className="pgtable__head pgtable__row pgtable__row--6">
          <span>{isEn ? 'Section' : '支部'}</span>
          <span>{isEn ? 'From' : '由'}</span>
          <span>{isEn ? 'To' : '至'}</span>
          <span style={{ flex: 1.6 }}>{isEn ? 'Group / Unit' : '旅／單位'}</span>
          <span>{isEn ? 'Post / Rank' : '崗位／職位'}</span>
          <span style={{ flex: 1.4 }}>{isEn ? 'Highest Award' : '獲取之最高獎章'}</span>
        </div>
        {EXP_SECTIONS.map((s) => {
          const row = book.scouting?.[s.key] || {};
          return (
            <div key={s.key} className="pgtable__row pgtable__row--6">
              <span className="pgtable__cell pgtable__sec" data-label={isEn ? 'Section' : '支部'}>
                <strong>{isEn ? s.en : s.zh}</strong>
              </span>
              <span className="pgtable__cell" data-label={isEn ? 'From' : '由'}>
                <Write value={row.from || ''} onChange={(v) => setExp(s.key, 'from', v)} compact placeholder="YYYY-MM" label={`${s.zh} 由`} />
              </span>
              <span className="pgtable__cell" data-label={isEn ? 'To' : '至'}>
                <Write value={row.to || ''} onChange={(v) => setExp(s.key, 'to', v)} compact placeholder="YYYY-MM" label={`${s.zh} 至`} />
              </span>
              <span className="pgtable__cell" style={{ flex: 1.6 }} data-label={isEn ? 'Group / Unit' : '旅／單位'}>
                <Write value={row.unit || ''} onChange={(v) => setExp(s.key, 'unit', v)} compact placeholder={isEn ? 'Group / Unit' : '旅號'} label={`${s.zh} 旅`} />
              </span>
              <span className="pgtable__cell" data-label={isEn ? 'Post / Rank' : '職位'}>
                <Write value={row.post || ''} onChange={(v) => setExp(s.key, 'post', v)} compact placeholder={isEn ? 'Post' : '職位'} label={`${s.zh} 職位`} />
              </span>
              <span className="pgtable__cell" style={{ flex: 1.4 }} data-label={isEn ? 'Highest Award' : '最高獎章'}>
                <Write value={row.award || ''} onChange={(v) => setExp(s.key, 'award', v)} compact placeholder={isEn ? 'Award' : '最高獎章'} label={`${s.zh} 獎章`} />
              </span>
            </div>
          );
        })}
      </div>

      <H en="CHANGE OF ADDRESS">遷移地址</H>
      <Rows
        path="addressChanges"
        min={2}
        dense
        addLabel={null}
        cols={[
          { k: 'date', label: '日期', en: 'Date', type: 'date', width: 1 },
          { k: 'address', label: '新地址', en: 'New Address', width: 2.6 },
        ]}
      />

      <H en="CHANGE OF PERSONAL PARTICULARS">更改個人摘要</H>
      <Rows
        path="detailChanges"
        min={2}
        dense
        addLabel={null}
        cols={[
          { k: 'date', label: '日期', en: 'Date', type: 'date', width: 1 },
          { k: 'item', label: '項目', en: 'Item', width: 1.2 },
          { k: 'content', label: '內容', en: 'Content', width: 2 },
        ]}
      />
    </Page>
  );
}

/* ------------------------------------------------------------ 第 4–5 頁：會員資格續期 */
function RenewalRows({ startIndex, count }) {
  const { book, update } = useBook();
  const readOnly = useReadOnly();
  const { isEn } = useLang();
  const [signIdx, setSignIdx] = useState(null);
  const list = Array.isArray(book.renewals) ? book.renewals : [];

  const setRow = (idx, patch) => {
    if (readOnly) return;
    update((b) => {
      const next = Array.isArray(b.renewals) ? b.renewals.slice() : [];
      while (next.length <= idx) next.push({ id: uid('ren'), date: '', validUntil: '', note: '' });
      next[idx] = { ...(next[idx] || {}), ...patch };
      return { ...b, renewals: next };
    });
  };

  return (
    <>
      <div className="renewtable">
        <div className="renewtable__head">
          <span>{isEn ? 'Date' : '日期'}</span>
          <span>{isEn ? 'Valid Until' : '有效日期至'}</span>
          <span style={{ flex: 1.8 }}>{isEn ? 'Group Chop and Signature' : '旅印及簽署'}</span>
        </div>

        {Array.from({ length: count }).map((_, offset) => {
          const idx = startIndex + offset;
          const r = list[idx] || {};
          return (
            <div key={r.id || `ren-${idx}`} className="renewrow">
              <div className="renewrow__cell" data-label={isEn ? 'Date' : '日期'}>
                <Write
                  value={r.date || ''}
                  onChange={(d) => {
                    const yr = d ? d.slice(0, 4) : '';
                    setRow(idx, { date: d, validUntil: r.validUntil || (yr ? `${yr}-12-31` : '') });
                  }}
                  type="date"
                  label="續期日期"
                />
              </div>
              <div className="renewrow__cell" data-label={isEn ? 'Valid Until' : '有效日期至'}>
                <Write value={r.validUntil || ''} onChange={(d) => setRow(idx, { validUntil: d })} type="date" label="有效日期至" />
              </div>
              <div className="renewrow__cell renewrow__chop" style={{ flex: 1.8 }} data-label={isEn ? 'Chop & Signature' : '旅印及簽署'}>
                <div className="renewrow__sigarea">
                  {r.signature?.png ? (
                    <img src={r.signature.png} alt="團長簽署" onClick={() => !readOnly && setSignIdx(idx)} />
                  ) : (
                    <SealMark text={book.member?.group || (isEn ? 'CHOP' : '旅印')} sub={isEn ? '' : ''} size={48} />
                  )}
                  <Write
                    value={r.note || ''}
                    onChange={(v) => setRow(idx, { note: v })}
                    compact
                    placeholder={isEn ? 'VSL name / chop note' : '團長姓名／旅印備註'}
                    label="旅印及簽署備註"
                  />
                  {!readOnly && (
                    <button type="button" className="linkbtn no-print" onClick={() => setSignIdx(idx)}>
                      <Icon name="pen" size={12} /> {r.signature?.png ? (isEn ? 'Re-sign' : '重簽') : isEn ? 'Sign' : '簽署'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <SignModal
        open={signIdx !== null}
        onClose={() => setSignIdx(null)}
        title={isEn ? 'Renewal Confirmation Signature' : '會員資格續期 · 團長簽署'}
        defaultName={book.member?.vsl || ''}
        onSave={(sig) => {
          if (signIdx !== null) {
            const cur = list[signIdx] || {};
            const d = cur.date || sig.at || today();
            setRow(signIdx, {
              date: d,
              validUntil: cur.validUntil || `${d.slice(0, 4)}-12-31`,
              note: cur.note || `${book.member?.group || ''} ${sig.name || ''}`.trim(),
              signature: sig,
            });
          }
          setSignIdx(null);
        }}
      />
    </>
  );
}

export function P04() {
  return (
    <Page id="p04">
      <H en="RENEWAL OF MEMBERSHIP">會員資格</H>
      <RenewalRows startIndex={0} count={4} />
    </Page>
  );
}

export function P05() {
  return (
    <Page id="p05">
      <H en="RENEWAL OF MEMBERSHIP">會員資格</H>
      <RenewalRows startIndex={4} count={3} />
      <Note en="Membership needs to be renewed and confirmed by the Venture Scout Leader by signature and chop, valid from 1 January to 31 December each year.">
        更新成員資格應按年由團長簽署及蓋章確認，並由該年一月一日至十二月三十一日止。
      </Note>
    </Page>
  );
}

/* ------------------------------------------------------------ 第 6 頁：目的 · 方法 · 教育目標 · 銘言 */
export function P06() {
  const { isEn } = useLang();
  return (
    <Page id="p06">
      <H en="VENTURE SCOUT SECTION">深資童軍支部</H>

      <Bilingual as="h3" className="secsub" zh="目的" en="THE AIM" />
      <P en="The Venture Scout Section aims to continue the progressive training of the Scout Section to pass the torch to the next generation in the Scout Movement and nurture future leaders for our society.">
        深資童軍支部旨在延續童軍支部之訓練，使童軍運動得以薪火相傳，並為社會培育未來領袖。
      </P>

      <Bilingual as="h3" className="secsub" zh="方法" en="THE METHOD" />
      <P en="The training method of the Venture Scout Section is guided by a progressive badge system and is delivered, under adult support, through a self-governing and self-programming Venture Scout Unit.">
        在成人領袖的引導下，深資童軍運用執行委員會制度，以自治和自務方式配合有進度性及富挑戰性之活動及訓練誘導成員，以達到深資童軍支部的目的。
      </P>

      <div className="mottogrid">
        <div className="mottocard">
          <Bilingual as="h4" zh="教育目標" en="EDUCATIONAL OBJECTIVE" />
          <strong>{isEn ? 'Self-Governance, Future Leadership' : '自務自治，明日領袖'}</strong>
        </div>
        <div className="mottocard">
          <Bilingual as="h4" zh="童軍銘言" en="SCOUT MOTTO" />
          <strong>{isEn ? 'Be Prepared' : '準備'}</strong>
        </div>
      </div>
    </Page>
  );
}

/* ------------------------------------------------------------ 第 7 頁：童軍誓詞 · 童軍規律（單語分版，對齊 ROVERBOOK v16） */
const PROMISE_ZH = [
  '我願以信譽為誓，竭盡所能；',
  '對神明，對國家，盡責任；',
  '對別人，要幫助；',
  '對規律，必遵行。',
];

const PROMISE_EN =
  'On my honour, I promise that I will do my best to do my duty to God and to my Country, to help other people and to keep the Scout Law.';

const LAWS_ZH = [
  '童軍信用為人敬。',
  '童軍待人要忠誠。',
  '童軍友善兼親切。',
  '童軍相處如手足。',
  '童軍勇敢不怕難。',
  '童軍愛物更惜陰。',
  '童軍自重又重人。',
];

const LAWS_EN = [
  'A Scout is to be trusted.',
  'A Scout is loyal.',
  'A Scout is friendly and considerate.',
  'A Scout belongs to the world-wide family of Scouts.',
  'A Scout has courage in all difficulties.',
  'A Scout makes good use of time and is careful of possessions and property.',
  'A Scout has self respect and respect for others.',
];

export function P07() {
  const { isEn } = useLang();
  return (
    <Page id="p07" className="p-promise">
      <H en="SCOUT PROMISE AND LAW">童軍誓詞與規律</H>

      <section className="promise-block">
        <h3 className="promise-block__title">{isEn ? 'Scout Promise' : '童軍誓詞'}</h3>
        {isEn ? (
          <p className="promise-block__text promise-block__text--en">{PROMISE_EN}</p>
        ) : (
          <p className="promise-block__text">
            {PROMISE_ZH.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </p>
        )}
      </section>

      <section className="promise-block">
        <h3 className="promise-block__title">{isEn ? 'Scout Law' : '童軍規律'}</h3>
        <ol className="promise-law">
          {(isEn ? LAWS_EN : LAWS_ZH).map((line, i) => (
            <li key={line}>
              <span className="promise-law__no">{i + 1}</span>
              <span className="promise-law__text">{line}</span>
            </li>
          ))}
        </ol>
      </section>
    </Page>
  );
}

/* ------------------------------------------------------------ 第 8 頁：進度性獎章總覽 */
export function P08() {
  const { book } = useBook();
  const { isEn } = useLang();
  const stats = allStats(book);
  const byId = Object.fromEntries(stats.badges.map((b) => [b.badge.id, b]));

  const stages = [
    {
      id: 'L1',
      to: '/p/p09',
      img: '/img/badge-membership.png',
      zh: '會員章',
      en: 'MEMBERSHIP BADGE',
      pZh: '會員章旨在幫助新加入的深資童軍認識其所屬之深資童軍團，以促進他與其他團員間相互關係，並為彼等所接納。',
      pEn: 'The Membership Badge aims to help newly joined Venture Scouts familiarise themselves with their Units, fostering fellowship between members and mutual acceptance.',
    },
    {
      id: 'L2',
      to: '/p/p11',
      img: '/img/badge-epaulettes.png',
      ep: true,
      zh: '深資童軍肩章',
      en: 'VENTURE SCOUT EPAULETTES',
      pZh: '深資童軍肩章之設立旨在提供階梯，讓剛獲頒會員章的深資童軍對深資童軍支部活動及童軍技能有基本認識和體驗。',
      pEn: 'The Venture Scout Epaulettes aims to provide a foundation for newly invested Venture Scouts to gain basic knowledge and skills of Venture Scout activities and Scoutcraft.',
    },
    {
      id: 'L3',
      to: '/p/p14',
      img: '/img/badge-vsa.png',
      zh: '深資童軍獎章',
      en: 'VENTURE SCOUT AWARD',
      pZh: '深資童軍完成肩章內容後，可開始考取深資童軍獎章。深資童軍獎章設有「活動策劃」、「社會服務」、「多元技能」及「戶外探險」四個項目。在深資童軍完成上述任何一項之內容後，即可佩戴該項目之段章，亦可開始與區會指定人士商討考取該段章之金帶。深資童軍獎章是由總會根據區之推薦及地域之批核而簽發。',
      pEn: 'Upon completion of the Venture Scout Epaulettes, Venture Scouts may begin the assessments of the Venture Scout Award. The Venture Scout Award consists of four sections: “Project”, “Service”, “Activity” and “Exploration”. The Venture Scout Award is issued by the Association based on the recommendation of the District and the approval of the Region.',
    },
    {
      id: 'L4',
      to: '/p/p21',
      img: '/img/badge-dsa.png',
      zh: '榮譽童軍獎章',
      en: 'DRAGON SCOUT AWARD',
      pZh: '深資童軍與區會指定人士商討後，便可開始進行考取該段章之金帶的考核。榮譽童軍獎章亦設有「活動策劃」、「社會服務」、「多元技能」及「戶外探險」四個項目。深資童軍在完成有關項目後，可在該項目之段章下配戴一條金帶。榮譽童軍獎章是由總會根據地域及區之推薦作批核，並由總領袖及香港總監簽發。',
      pEn: 'After consulting the assigned District representative, Venture Scouts may start the Bar of the corresponding Badge. The Dragon Scout Award also consists of “Project”, “Service”, “Activity” and “Exploration”, approved by the Association and issued by the Chief Scout and the Chief Commissioner.',
    },
  ];

  return (
    <Page id="p08" dense>
      <H en="PROGRESSIVE BADGES">進度性獎章</H>
      <div className="stagecards">
        {stages.map((st) => {
          const s = byId[st.id];
          return (
            <div key={st.id} className="stagecard">
              <div className="stagecard__art">
                <BadgeArt src={st.img} ep={st.ep} sm />
              </div>
              <div className="stagecard__main">
                <div className="stagecard__head">
                  <div>
                    <strong>{isEn ? st.en : st.zh}</strong>
                    {!isEn && <em>{st.en}</em>}
                  </div>
                  <Link to={st.to} className="stagecard__pill">
                    {s?.done || 0}/{s?.total || 0} ({s?.percent || 0}%) →
                  </Link>
                </div>
                <p>{isEn ? st.pEn : st.pZh}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Page>
  );
}
