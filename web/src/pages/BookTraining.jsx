import React from 'react';
import { ITEM_INDEX, today } from '@shared/book.js';
import { useBook, useField } from '../bookContext.js';
import { Area, AssessTable, Bilingual, CircleChoice, Grid, H, Line, P, Page, Sig } from '../components/Form.jsx';
import Write from '../components/Write.jsx';
import { Icon } from '../ui.jsx';
import { Link } from '../router.jsx';
import { useLang } from '../i18n.jsx';

/* ============================================================
   第 9–10 頁：會員章 MEMBERSHIP BADGE (L1)
   ============================================================ */

export function P09() {
  return (
    <Page id="p09" dense>
      <H en="MEMBERSHIP BADGE" progress={['L1-ACT-01', 'L1-UND-01', 'L1-UND-02', 'L1-UND-03', 'L1-UND-04', 'L1-UND-05', 'L1-ETQ-01', 'L1-ETQ-02']}>
        會員章
      </H>

      <AssessTable
        title="活動"
        en="Activities"
        items={[{ id: 'L1-ACT-01', no: 1, zh: '參與最少六次團活動', en: 'Take part in the venture group activities at least 6 times' }]}
      />

      <AssessTable
        title="理解"
        en="Understanding"
        items={[
          { id: 'L1-UND-01', no: 2, zh: '童軍運動目的', en: 'Aims of the Scout Movement' },
          { id: 'L1-UND-02', no: 3, zh: '香港及世界童軍運動', en: 'Scout Movement in Hong Kong and in the World' },
          { id: 'L1-UND-03', no: 4, zh: '中華人民共和國國旗和國徽的含意', en: 'Meanings of the National Flag and Emblem of the People’s Republic of China' },
          { id: 'L1-UND-04', no: 5, zh: '香港特別行政區區旗和區徽的含意', en: 'Meanings of the Regional Flag and Emblem of HKSAR' },
          { id: 'L1-UND-05', no: 6, zh: '中華人民共和國國歌設立的用意', en: 'Meaning of the National Anthem of the People’s Republic of China' },
        ]}
      />

      <AssessTable
        title="禮節"
        en="Ceremonial"
        items={[
          { id: 'L1-ETQ-01', no: 7, zh: '童軍禮節及基本步操', en: 'Basic foot drill and ceremonial' },
          { id: 'L1-ETQ-02', no: 8, zh: '在國歌奏唱和升掛國旗、區旗時應有之禮儀', en: 'Rite of the National Flag and Emblem, Regional Flag and Emblem, and National Anthem' },
        ]}
      />
    </Page>
  );
}

export function P10() {
  const { book, update } = useBook();
  const { isEn } = useLang();

  const onCertChange = (val) => {
    update((b) => {
      const next = structuredClone(b);
      next.pages = next.pages || {};
      next.pages.p10 = { ...(next.pages.p10 || {}), safeCertNo: val };
      if (val && !next.progress?.['L1-CP-01']?.date) {
        next.progress = next.progress || {};
        next.progress['L1-CP-01'] = { ...(next.progress['L1-CP-01'] || {}), date: today(), cert: val };
      }
      return next;
    });
  };

  return (
    <Page id="p10" dense>
      <H en="MEMBERSHIP BADGE (CONT.)" progress={['L1-ETQ-03', 'L1-ETQ-04', 'L1-PRM-01', 'L1-CP-01']}>
        會員章（續）
      </H>

      <AssessTable
        title="禮節（續）"
        en="Ceremonial (Cont.)"
        items={[
          { id: 'L1-ETQ-03', no: 9, zh: '認識升掛國旗、區旗及展示國徽、區徽時的注意事項及使用之限制', en: 'Regulations for the use and display of the National Flag and Emblem and the Regional Flag and Emblem' },
          { id: 'L1-ETQ-04', no: 10, zh: '示範國旗和區旗的升掛方法', en: 'Demonstrate how to raise the National Flag and the Regional Flag' },
        ]}
      />

      <AssessTable
        title="許諾"
        en="Commitment"
        items={[{ id: 'L1-PRM-01', no: 11, zh: '童軍誓詞與規律', en: 'Scout Promise and Law' }]}
      />

      <AssessTable
        title="保護童軍成員免受傷害"
        en="Safe From Harm"
        items={[
          {
            id: 'L1-CP-01',
            no: 12,
            zh: '對保護兒童及青少年有基本認識，並認識保護他們免受傷害的預防及處理方法',
            en: 'Possess a basic understanding of child and youth protection, including prevention and response methods',
          },
        ]}
      />

      <div className="orbox">
        <span className="orbox__tag">{isEn ? 'OR' : '或 OR'}</span>
        <div className="orbox__row">
          <span>
            {isEn
              ? '(12) Finish the Safe From Harm Online Learning Course — Certificate No.'
              : '(12) 完成「保護童軍成員免受傷害」網上自學課程 —— 證書編號 Certificate No.'}
          </span>
          <Write
            value={book.pages?.p10?.safeCertNo || ''}
            onChange={onCertChange}
            placeholder="例如：SFH-2026-00123"
            label="保護童軍網上自學課程證書編號"
          />
        </div>
      </div>

      <div className="awardbox">
        <Grid cols={2}>
          <Line label="宣誓日期" en="Date of Investiture" type="date" path="pages.p10.investitureDate" />
          <Line label="團長姓名" en="Name of Venture Scout Leader" path="pages.p10.vslName" placeholder={book.member?.vsl || '團長姓名'} />
        </Grid>
        <Sig label="團長簽署" en="Signature of Venture Scout Leader" path="pages.p10.vslSig" defaultName={book.member?.vsl || ''} defaultTitle="深資童軍團長 VSL" />
      </div>
    </Page>
  );
}

/* ============================================================
   第 11–13 頁：深資童軍肩章 VENTURE SCOUT EPAULETTES (L2)
   ============================================================ */

export function P11() {
  const { book } = useBook();
  const { isEn } = useLang();
  const exemptA = Boolean(book.pages?.p11?.linkCertNo || book.pages?.p11?.linkDate);

  return (
    <Page id="p11" dense>
      <H en="VENTURE SCOUT EPAULETTES">深資童軍肩章</H>
      <Bilingual as="h3" className="secsub" zh="甲. 認識" en="A. Understanding" />

      <div className="exemptbox">
        <div className="exemptbox__title">
          <strong>{isEn ? 'Obtained the Venture Scout Link Badge in the Scout Section' : '考獲深資童軍先修章 Obtained the Venture Scout Link Badge in the Scout Section'}</strong>
        </div>
        <Grid cols={2}>
          <Line label="證書編號" en="Certificate Number" path="pages.p11.linkCertNo" placeholder="先修章證書編號（如有可豁免甲部）" />
          <Line label="日期" en="Date" type="date" path="pages.p11.linkDate" />
        </Grid>
        <div className="exemptbox__or">{isEn ? 'OR complete items (1)–(10) below' : '或 OR 完成下列 (1)–(10) 項'}</div>
      </div>

      <AssessTable
        exempted={exemptA}
        items={[
          { id: 'L2-REC-01', no: 1, zh: '說出深資童軍支部的目的、方法及預期成果', en: 'State the aim, method, and expected outcomes of the Venture Scout Section' },
          { id: 'L2-REC-02', no: 2, zh: '認識深資童軍制服', en: 'Recognise the Venture Scout uniform' },
          { id: 'L2-REC-03', no: 3, zh: '明瞭深資童軍獎章及榮譽童軍獎章之四個考驗組別及考驗範圍', en: 'Understand the 4 sections of the Venture Scout Award and Dragon Scout Award' },
          { id: 'L2-REC-04', no: 4, zh: '明瞭深資童軍獎章及榮譽童軍獎章與其他機構互相關連的地方', en: 'Understand how the Venture Scout Award and Dragon Scout Award relate to other organisations' },
          { id: 'L2-REC-05', no: 5, zh: '說出執行委員會之基本功能', en: 'State the basic functions of the Executive Committee' },
          { id: 'L2-REC-06', no: 6, zh: '說出執行委員會之組織及委員的職責', en: 'State the organisation of the Executive Committee and the duties of its members' },
          { id: 'L2-REC-07', no: 7, zh: '明瞭執行委員會之產生方法', en: 'Understand the methods for forming the Executive Committee' },
          { id: 'L2-REC-08', no: 8, zh: '明瞭執行委員會中領袖的角色', en: 'Understand the role of leaders in the Executive Committee' },
          { id: 'L2-REC-09', no: 9, zh: '認識多元化的深資童軍活動', en: 'Recognise the diverse variety of activities available in Venture Scouting' },
          { id: 'L2-REC-10', no: 10, zh: '參加最少一次深資童軍執行委員會會議', en: 'Attend at least one Unit Executive Committee meeting' },
        ]}
      />
    </Page>
  );
}

export function P12() {
  const { book } = useBook();
  const { isEn } = useLang();
  const exemptB = Boolean(book.pages?.p12?.standardCertNo || book.pages?.p12?.standardDate);

  return (
    <Page id="p12" dense>
      <H en="VENTURE SCOUT EPAULETTES">深資童軍肩章</H>
      <Bilingual as="h3" className="secsub" zh="乙. 童軍技能" en="B. Scoutcraft" />

      <div className="exemptbox">
        <div className="exemptbox__title">
          <strong>{isEn ? 'Obtained the Scout Standard Award in the Scout Section' : '考獲童軍標準獎章 Obtained the Scout Standard Award in the Scout Section'}</strong>
        </div>
        <Grid cols={2}>
          <Line label="證書編號" en="Certificate Number" path="pages.p12.standardCertNo" placeholder="童軍標準獎章證書編號（如有可豁免乙部）" />
          <Line label="日期" en="Date" type="date" path="pages.p12.standardDate" />
        </Grid>
        <div className="exemptbox__or">{isEn ? 'OR complete items (11)–(23)' : '或 OR 完成下列 (11)–(23) 項'}</div>
      </div>

      <AssessTable
        exempted={exemptB}
        items={[
          { id: 'L2-CAMP-01', no: 11, zh: '與團內或團外之深資童軍完成一次兩日一夜之露營', en: 'Participate in an overnight camp with Venture Scouts' },
          { id: 'L2-CAMP-02', no: 12, zh: '準備一份適合兩日一夜小隊露營的個人及小隊物資清單', en: 'Prepare personal and patrol gear lists suitable for a 2-day, 1-night camp' },
          { id: 'L2-CAMP-03', no: 13, zh: '收拾一個兩日一夜露營用的背囊及個人急救藥囊', en: 'Pack a rucksack and a personal first-aid kit for a 2-day, 1-night camp' },
          { id: 'L2-CAMP-04', no: 14, zh: '能正確架搭、收拾及存放一個營幕', en: 'Pitch, pack and store a tent properly' },
          { id: 'L2-CAMP-05', no: 15, zh: '熟悉並正確地使用氣爐及摺刀，並知道有關之安全措施', en: 'Be familiar with and properly use gas stoves and pen knives, and understand the relevant safety measures' },
          { id: 'L2-CAMP-06', no: 16, zh: '設計一個兩日一夜小隊露營的食譜及單獨烹調其中一款菜式', en: 'Devise a menu for a 2-day, 1-night camp for the patrol, and cook one of the dishes individually' },
          { id: 'L2-CAMP-07', no: 17, zh: '能以火柴及天然物生火', en: 'Light a fire using matches and natural materials' },
          { id: 'L2-KNOT-01', no: 18, zh: '示範指定繩結並說出其用途', en: 'Demonstrate designated knots and explain their functions' },
        ]}
      />
    </Page>
  );
}

export function P13() {
  const { book } = useBook();
  const { isEn } = useLang();
  const exemptB = Boolean(book.pages?.p12?.standardCertNo || book.pages?.p12?.standardDate);

  return (
    <Page id="p13" dense>
      <H en="VENTURE SCOUT EPAULETTES (CONT.)">深資童軍肩章（續）</H>

      <AssessTable
        exempted={exemptB}
        items={[
          { id: 'L2-HIKE-01', no: 19, zh: '認識戶外活動時常用的地圖種類，明白不同圖例的意義', en: 'Know the kinds of maps commonly used in outdoor activities and understand the meanings of different map legends' },
          { id: 'L2-HIKE-02', no: 20, zh: '參與一個運用指南針及地圖之戶外活動', en: 'Participate in an outdoor activity using a compass and maps' },
          { id: 'L2-FA-01', no: 21, zh: '知道急救目的及原則', en: 'Know the purposes and principles of First Aid' },
          { id: 'L2-FA-02', no: 22, zh: '示範出血處理、傷口護理及簡單包紮的方法', en: 'Demonstrate the handling of bleeding, wound care and simple wound dressing methods' },
          { id: 'L2-FA-03', no: 23, zh: '示範燒傷、燙傷、抽筋及扭傷傷病者的處理方法', en: 'Demonstrate the handling of burns, scalds, muscle fatigue and sprains' },
        ]}
      />

      <div className="suggestbox">
        <div className="suggestbox__head">
          <strong>
            {isEn ? 'Suggested item: Finish Form PT/65 Planning for Assessment' : '建議完成項目：完成「深資童軍獎章及榮譽童軍獎章考驗計劃」表格（PT/65）'}
          </strong>
          <Link to="/forms/pt65" className="btn btn--ghost btn--sm">
            <Icon name="file" size={13} /> {isEn ? 'Open PT/65' : '前往填寫 PT/65'}
          </Link>
        </div>
        <Grid cols={2}>
          <Line label="主考" en="Initials" path="pages.p13.planInitials" placeholder="團長姓名" />
          <Line label="日期" en="Date" type="date" path="pages.p13.planDate" />
        </Grid>
      </div>

      <div className="awardbox">
        <Grid cols={3}>
          <Line label="團長姓名" en="Name of VSL" path="pages.p13.vslName" placeholder={book.member?.vsl || '團長姓名'} />
          <Line label="完成日期" en="Date of Completion" type="date" path="pages.p13.completedDate" />
          <Line label="證書編號" en="Certificate Number" path="pages.p13.certNo" placeholder="肩章證書編號" />
        </Grid>
        <Sig label="團長簽署" en="Signature of Venture Scout Leader" path="pages.p13.vslSig" defaultName={book.member?.vsl || ''} defaultTitle="深資童軍團長 VSL" />
      </div>
    </Page>
  );
}

/* ============================================================
   第 14–20 頁：深資童軍獎章 VENTURE SCOUT AWARD (L3)
   ============================================================ */

function useSyncProgress() {
  const { update } = useBook();
  return (itemId, date, extra = {}) => {
    if (!itemId) return;
    update((b) => ({
      ...b,
      progress: {
        ...(b.progress || {}),
        [itemId]: { ...(b.progress?.[itemId] || {}), ...(date ? { date } : {}), ...extra, at: new Date().toISOString() },
      },
    }));
  };
}

export function P14() {
  const sync = useSyncProgress();
  const [, setWorkshopDate] = useField('pages.p14.workshopDate');

  return (
    <Page id="p14">
      <H en="PROJECT BADGE">活動策劃段章</H>
      <P en="Complete a Venture Scout Executive Committee Workshop organised by the District, Region, or Association Headquarters.">
        完成一個由區／地域／總會認許之「深資童軍執行委員會工作坊」。
      </P>

      <Grid cols={2}>
        <Line label="工作坊證書編號" en="Workshop Certificate Number" path="pages.p14.workshopCertNo" placeholder="例如：VSEC-2026-048" />
        <div className="frow">
          <span className="frow__label">
            日期 <em>Date</em>
          </span>
          <span className="frow__value">
            <Write
              type="date"
              value={useField('pages.p14.workshopDate')[0]}
              onChange={(d) => {
                setWorkshopDate(d);
                sync('L3-PROJECT-01', d);
              }}
              label="工作坊日期"
            />
          </span>
        </div>
      </Grid>

      <div className="awardbox">
        <Grid cols={3}>
          <Line label="主考姓名" en="Assessor Name" path="pages.p14.assessorName" />
          <Line label="職位" en="Post" path="pages.p14.assessorPost" />
          <Line label="日期" en="Date" type="date" path="pages.p14.assessorDate" />
        </Grid>
        <Sig label="主考簽署" en="Signature" path="pages.p14.assessorSig" defaultTitle="主考 Assessor" />
        <Grid cols={2}>
          <Line label="完成日期" en="Date of Completion" type="date" path="pages.p14.completedDate" />
          <Line label="證書編號" en="Certificate Number" path="pages.p14.certNo" placeholder="活動策劃段章證書編號" />
        </Grid>
      </div>
    </Page>
  );
}

export function P15() {
  const { book } = useBook();
  const sync = useSyncProgress();
  const [p1Date, setP1Date] = useField('pages.p15.part1Date');
  const [p2Date, setP2Date] = useField('pages.p15.part2Date');

  return (
    <Page id="p15" dense>
      <H en="SERVICE BADGE">社會服務段章</H>

      <Bilingual as="h3" className="secsub" zh="選修部份 (I)" en="Elective Component (I)" />
      <CircleChoice
        path="pages.p15.part1Choice"
        options={[
          { value: 'L3-SERVICE-01', zh: '急救', en: 'First Aid' },
          { value: 'L3-SERVICE-02', zh: '拯溺 (I)', en: 'Lifesaving (I)' },
        ]}
        onSelect={(choice) => choice && p1Date && sync(choice, p1Date)}
      />
      <Grid cols={2}>
        <Line label="證書編號" en="Certificate Number" path="pages.p15.part1CertNo" />
        <div className="frow">
          <span className="frow__label">
            日期 <em>Date</em>
          </span>
          <span className="frow__value">
            <Write
              type="date"
              value={p1Date}
              onChange={(d) => {
                setP1Date(d);
                if (book.pages?.p15?.part1Choice) sync(book.pages.p15.part1Choice, d);
              }}
              label="選修I日期"
            />
          </span>
        </div>
        <Line label="主考姓名" en="Assessor Name" path="pages.p15.part1Assessor" />
        <Line label="職位" en="Post" path="pages.p15.part1Post" />
      </Grid>
      <Sig label="選修 (I) 簽署" en="Signature (Part I)" path="pages.p15.part1Sig" />

      <Bilingual as="h3" className="secsub" zh="選修部份 (II)" en="Elective Component (II)" />
      <CircleChoice
        path="pages.p15.part2Choice"
        options={[
          { value: 'L3-SERVICE-03', zh: '消防', en: 'Fireman' },
          { value: 'L3-SERVICE-04', zh: '拯溺 (II)', en: 'Lifesaving (II)' },
          { value: 'L3-SERVICE-05', zh: '手語', en: 'Sign Language' },
          { value: 'L3-SERVICE-06', zh: '精神健康急救', en: 'Mental Health First Aid' },
          { value: 'L3-SERVICE-07', zh: 'SOUL Keeper (Level 2)', en: 'SOUL Keeper (Level 2)' },
          { value: 'L3-SERVICE-08', zh: '共融大使', en: 'Inclusion Ambassador' },
        ]}
        onSelect={(choice) => choice && p2Date && sync(choice, p2Date)}
      />
      <Grid cols={2}>
        <Line label="證書編號" en="Certificate Number" path="pages.p15.part2CertNo" />
        <div className="frow">
          <span className="frow__label">
            日期 <em>Date</em>
          </span>
          <span className="frow__value">
            <Write
              type="date"
              value={p2Date}
              onChange={(d) => {
                setP2Date(d);
                if (book.pages?.p15?.part2Choice) sync(book.pages.p15.part2Choice, d);
              }}
              label="選修II日期"
            />
          </span>
        </div>
        <Line label="主考姓名" en="Assessor Name" path="pages.p15.part2Assessor" />
        <Line label="職位" en="Post" path="pages.p15.part2Post" />
      </Grid>
      <Sig label="選修 (II) 簽署" en="Signature (Part II)" path="pages.p15.part2Sig" />

      <div className="awardbox">
        <Grid cols={2}>
          <Line label="段章完成日期" en="Date of Completion" type="date" path="pages.p15.completedDate" />
          <Line label="證書編號" en="Certificate Number" path="pages.p15.certNo" />
        </Grid>
      </div>
    </Page>
  );
}

const ACT_SUBS = {
  L3: {
    scoutcraft: ['L3-ACT-V11-PIONEERING', 'L3-ACT-V11-CAMPCRAFT', 'L3-ACT-V11-FOOTDRILL'],
    sport: ['L3-ACT-V11-SPORT-2X20', 'L3-ACT-V11-SPORT-52'],
    new: ['L3-ACT-V11-NEW-AIR', 'L3-ACT-V11-NEW-SEA', 'L3-ACT-V11-NEW-IT', 'L3-ACT-V11-NEW-OVERSEAS', 'L3-ACT-V11-NEW-ARTS', 'L3-ACT-V11-NEW-INTERESTS'],
  },
  L4: {
    scoutcraft: ['L4-ACT-V11-PIONEERING', 'L4-ACT-V11-CAMPCRAFT', 'L4-ACT-V11-FOOTDRILL'],
    sport: ['L4-ACT-V11-SPORT-2X20', 'L4-ACT-V11-SPORT-52'],
    new: ['L4-ACT-V11-NEW-AIR', 'L4-ACT-V11-NEW-SEA', 'L4-ACT-V11-NEW-IT', 'L4-ACT-V11-NEW-OVERSEAS', 'L4-ACT-V11-NEW-ARTS', 'L4-ACT-V11-NEW-INTERESTS'],
  },
};

function SubItemSelect({ level, category, path }) {
  const [val, setVal] = useField(path, '');
  const { isEn } = useLang();
  const ids = ACT_SUBS[level]?.[category] || [];
  if (!ids.length) return null;
  return (
    <div className="subselect">
      <label>
        <span>{isEn ? '11th Ed. Specific Syllabus Option (syncs with vsbadge)' : '對應第十一版綱要細項（與 vsbadge 自動同步）'}</span>
        <select value={val} onChange={(e) => setVal(e.target.value)}>
          <option value="">{isEn ? '— Select sub-option —' : '— 請選擇細項 —'}</option>
          {ids.map((id) => (
            <option key={id} value={id}>
              {isEn ? ITEM_INDEX[id]?.en || ITEM_INDEX[id]?.name : ITEM_INDEX[id]?.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function P16() {
  const [cat] = useField('pages.p16.category', '');
  return (
    <Page id="p16">
      <H en="ACTIVITY BADGE">多元技能段章</H>
      <CircleChoice
        path="pages.p16.category"
        options={[
          { value: 'scoutcraft', zh: '童軍技能', en: 'Scoutcraft' },
          { value: 'sport', zh: '康樂體育', en: 'Physical Recreation' },
          { value: 'new', zh: '新體驗', en: 'New Experience' },
        ]}
      />
      <SubItemSelect level="L3" category={cat} path="pages.p16.subItemId" />
      <Area
        label="內容簡述（包括訓練班名稱、證書編號、活動細節等）"
        en="Summary of Activity (including name of course, certificate number, details of activity…)"
        path="pages.p16.summary"
        rows={9}
        placeholder="請紀錄所完成的訓練班名稱、證書編號、活動時數及實習內容..."
      />
    </Page>
  );
}

export function P17() {
  const { book } = useBook();
  const sync = useSyncProgress();
  const [doneDate, setDoneDate] = useField('pages.p17.completedDate');

  return (
    <Page id="p17">
      <H en="ACTIVITY BADGE — ASSESSOR'S COMMENTS">多元技能段章 · 主考評語</H>
      <Area label="主考評語" en="Assessor's Comments" path="pages.p17.comments" rows={7} placeholder="主考評語..." />

      <div className="awardbox">
        <Grid cols={3}>
          <Line label="主考姓名" en="Assessor Name" path="pages.p17.assessorName" />
          <Line label="職位" en="Post" path="pages.p17.assessorPost" />
          <Line label="日期" en="Date" type="date" path="pages.p17.assessorDate" />
        </Grid>
        <Sig label="簽署" en="Signature" path="pages.p17.assessorSig" />
        <Grid cols={2}>
          <div className="frow">
            <span className="frow__label">
              完成日期 <em>Date of Completion</em>
            </span>
            <span className="frow__value">
              <Write
                type="date"
                value={doneDate}
                onChange={(d) => {
                  setDoneDate(d);
                  if (book.pages?.p16?.subItemId) sync(book.pages.p16.subItemId, d);
                }}
                label="多元技能段章完成日期"
              />
            </span>
          </div>
          <Line label="證書編號" en="Certificate Number" path="pages.p17.certNo" />
        </Grid>
      </div>
    </Page>
  );
}

export function P18() {
  const [sel, setSel] = useField('pages.p18.selectedItem', '');
  const { isEn } = useLang();
  const expIds = ['L3-EXP-V11-HIKING', 'L3-EXP-V11-CYCLING', 'L3-EXP-V11-DRIVING', 'L3-EXP-V11-MECHANICAL', 'L3-EXP-V11-SEA'];

  return (
    <Page id="p18">
      <H en="EXPLORATION BADGE">戶外探險段章</H>
      <div className="subselect">
        <label>
          <span>{isEn ? 'Selected Item (Expedition Type)' : '所選項目 Selected Item'}</span>
          <select value={sel} onChange={(e) => setSel(e.target.value)}>
            <option value="">{isEn ? '— Choose expedition type —' : '— 請選擇戶外探險旅程類型 —'}</option>
            {expIds.map((id) => (
              <option key={id} value={id}>
                {isEn ? ITEM_INDEX[id]?.en : ITEM_INDEX[id]?.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Line
        label="認可前設訓練及證書（如適用）"
        en="Recognised Prerequisite Training (If applicable)"
        path="pages.p18.preTraining"
        wide
        placeholder="例如：深資童軍地圖閱讀及遠足訓練班（證書編號）"
      />
      <Area
        label="內容簡述（包括日期、地區、旅途、距離等）"
        en="Summary of Activity (including date, area, route, distance…)"
        path="pages.p18.summary"
        rows={8}
        placeholder="請填寫旅程日期、地區、起訖路線、總距離及考察主題..."
      />
    </Page>
  );
}

export function P19() {
  const { book } = useBook();
  const sync = useSyncProgress();
  const [doneDate, setDoneDate] = useField('pages.p19.completedDate');

  return (
    <Page id="p19">
      <H en="EXPLORATION BADGE — ASSESSOR'S COMMENTS">戶外探險段章 · 主考評語</H>
      <Area label="主考評語" en="Assessor's Comments" path="pages.p19.comments" rows={6} placeholder="主考評語..." />

      <div className="awardbox">
        <Grid cols={2}>
          <Line label="主考姓名" en="Assessor Name" path="pages.p19.assessorName" />
          <Line label="職位" en="Post" path="pages.p19.assessorPost" />
          <Line label="遠足審核員編號（如適用）" en="Assessor Number (If applicable)" path="pages.p19.assessorNo" />
          <Line label="審核登記編號（如適用）" en="Assessment Registration Number" path="pages.p19.regNo" />
        </Grid>
        <Line label="簽署日期" en="Date" type="date" path="pages.p19.assessorDate" />
        <Sig label="簽署" en="Signature" path="pages.p19.assessorSig" />
        <Grid cols={2}>
          <div className="frow">
            <span className="frow__label">
              完成日期 <em>Date of Completion</em>
            </span>
            <span className="frow__value">
              <Write
                type="date"
                value={doneDate}
                onChange={(d) => {
                  setDoneDate(d);
                  if (book.pages?.p18?.selectedItem) sync(book.pages.p18.selectedItem, d);
                }}
                label="戶外探險段章完成日期"
              />
            </span>
          </div>
          <Line label="證書編號" en="Certificate Number" path="pages.p19.certNo" />
        </Grid>
      </div>
    </Page>
  );
}

export function P20() {
  const { book } = useBook();
  const { isEn } = useLang();

  return (
    <Page id="p20" dense>
      <H en="VENTURE SCOUT AWARD">深資童軍獎章</H>

      <div className="awardbox">
        <Grid cols={3}>
          <Line label="深資童軍團長姓名" en="Name of Venture Scout Leader" path="pages.p20.vslName" placeholder={book.member?.vsl || ''} />
          <Line label="完成日期" en="Date of Completion" type="date" path="pages.p20.completedDate" />
          <Line label="證書編號" en="Certificate Number" path="pages.p20.certNo" placeholder="深資童軍獎章證書編號" />
        </Grid>
        <Sig label="深資童軍團長簽署" en="Signature of Venture Scout Leader" path="pages.p20.vslSig" defaultName={book.member?.vsl || ''} defaultTitle="深資童軍團長 VSL" />
      </div>

      <Bilingual as="h3" className="secsub" zh="由區總監接見" en="Interview with District Commissioner" />
      <Area label="評語" en="Comments" path="pages.p20.dcComments" rows={4} placeholder="區總監接見評語..." />
      <Grid cols={2}>
        <Line label="姓名" en="Name" path="pages.p20.dcName" placeholder="區總監姓名" />
        <Line label="日期" en="Date" type="date" path="pages.p20.dcDate" />
      </Grid>
      <Sig label="區總監簽署" en="Signature" path="pages.p20.dcSig" defaultTitle="區總監 DC" />

      <div className="formcta">
        <span>{isEn ? 'Ready to submit your Venture Scout Award application?' : '已完成四個段章？可一鍵帶入資料生成申請表：'}</span>
        <Link to="/forms/pt19" className="btn btn--primary btn--sm">
          <Icon name="file" size={14} /> {isEn ? 'Generate Form PT/19' : '打開 PT/19 申請表'}
        </Link>
      </div>
    </Page>
  );
}

/* ============================================================
   第 21–33 頁：榮譽童軍獎章 DRAGON SCOUT AWARD (L4)
   ============================================================ */

export function P21() {
  return (
    <Page id="p21">
      <H en="PROJECT BAR">活動策劃金帶</H>
      <CircleChoice
        label="考驗方式"
        en="Project Option"
        path="pages.p21.selectedItem"
        options={[
          { value: 'L4-PROJ-01', zh: '實踐一項活動策劃', en: 'Activity-planning project' },
          { value: 'L4-PROJ-02', zh: '外宿最少五日四夜之活動策劃', en: '5-day 4-night residential project' },
        ]}
      />
      <Area
        label="內容簡述（包括日期、地區、活動詳情等）"
        en="Summary of Activity (including date, area, details of activity…)"
        path="pages.p21.summary"
        rows={9}
        placeholder="請詳述活動策劃主題、日期、地區、參與人數及執行檢討..."
      />
    </Page>
  );
}

export function P22() {
  const { book } = useBook();
  const sync = useSyncProgress();
  const [doneDate, setDoneDate] = useField('pages.p22.completedDate');

  return (
    <Page id="p22">
      <H en="PROJECT BAR — ASSESSOR'S COMMENTS">活動策劃金帶 · 主考評語</H>
      <Area label="主考評語" en="Assessor's Comments" path="pages.p22.comments" rows={7} />
      <div className="awardbox">
        <Grid cols={3}>
          <Line label="主考姓名" en="Assessor Name" path="pages.p22.assessorName" />
          <Line label="職位" en="Post" path="pages.p22.assessorPost" />
          <Line label="日期" en="Date" type="date" path="pages.p22.assessorDate" />
        </Grid>
        <Sig label="簽署" en="Signature" path="pages.p22.assessorSig" />
        <Grid cols={2}>
          <div className="frow">
            <span className="frow__label">
              完成日期 <em>Date of Completion</em>
            </span>
            <span className="frow__value">
              <Write
                type="date"
                value={doneDate}
                onChange={(d) => {
                  setDoneDate(d);
                  sync(book.pages?.p21?.selectedItem || 'L4-PROJ-01', d);
                }}
                label="活動策劃金帶完成日期"
              />
            </span>
          </div>
          <Line label="證書編號" en="Certificate Number" path="pages.p22.certNo" />
        </Grid>
      </div>
    </Page>
  );
}

export function P23() {
  return (
    <Page id="p23">
      <H en="SERVICE BAR">社會服務金帶</H>
      <CircleChoice
        path="pages.p23.selectedItem"
        options={[
          { value: 'L4-SERV-01', zh: '童軍及社區服務', en: 'Scout and Community Service' },
          { value: 'L4-SERV-02', zh: '志願服務', en: 'Voluntary Service' },
          { value: 'L4-SERV-03', zh: '寰宇童軍計劃', en: 'Scouts of the World Award' },
        ]}
      />
      <Area
        label="內容簡述（包括證書編號、服務內容等）"
        en="Summary of Activity (including certificate number and service details…)"
        path="pages.p23.summary"
        rows={9}
        placeholder="請填寫服務機構、時數、證書編號及服務內容..."
      />
    </Page>
  );
}

export function P24() {
  const { book } = useBook();
  const sync = useSyncProgress();
  const [doneDate, setDoneDate] = useField('pages.p24.completedDate');

  return (
    <Page id="p24">
      <H en="SERVICE BAR — ASSESSOR'S COMMENTS">社會服務金帶 · 主考評語</H>
      <Area label="主考評語" en="Assessor's Comments" path="pages.p24.comments" rows={7} />
      <div className="awardbox">
        <Grid cols={3}>
          <Line label="主考姓名" en="Assessor Name" path="pages.p24.assessorName" />
          <Line label="職位" en="Post" path="pages.p24.assessorPost" />
          <Line label="日期" en="Date" type="date" path="pages.p24.assessorDate" />
        </Grid>
        <Sig label="簽署" en="Signature" path="pages.p24.assessorSig" />
        <Grid cols={2}>
          <div className="frow">
            <span className="frow__label">
              完成日期 <em>Date of Completion</em>
            </span>
            <span className="frow__value">
              <Write
                type="date"
                value={doneDate}
                onChange={(d) => {
                  setDoneDate(d);
                  sync(book.pages?.p23?.selectedItem || 'L4-SERV-01', d);
                }}
                label="社會服務金帶完成日期"
              />
            </span>
          </div>
          <Line label="證書編號" en="Certificate Number" path="pages.p24.certNo" />
        </Grid>
      </div>
    </Page>
  );
}

export function P25() {
  const [cat] = useField('pages.p25.category', '');
  return (
    <Page id="p25">
      <H en="ACTIVITY BAR · CATEGORY I">多元技能金帶（第一範疇）</H>
      <CircleChoice
        path="pages.p25.category"
        options={[
          { value: 'scoutcraft', zh: '童軍技能', en: 'Scoutcraft' },
          { value: 'sport', zh: '康樂體育', en: 'Physical Recreation' },
          { value: 'new', zh: '新體驗', en: 'New Experience' },
        ]}
      />
      <SubItemSelect level="L4" category={cat} path="pages.p25.subItemId" />
      <Area
        label="內容簡述（包括訓練班名稱、證書編號、活動細節等）"
        en="Summary of Activity (including name of course, certificate number, details of activity…)"
        path="pages.p25.summary"
        rows={9}
      />
    </Page>
  );
}

export function P26() {
  const { book } = useBook();
  const sync = useSyncProgress();
  const [doneDate, setDoneDate] = useField('pages.p26.completedDate');

  return (
    <Page id="p26">
      <H en="ACTIVITY BAR (I) — ASSESSOR'S COMMENTS">多元技能金帶（一）主考評語</H>
      <Area label="主考評語" en="Assessor's Comments" path="pages.p26.comments" rows={7} />
      <div className="awardbox">
        <Grid cols={3}>
          <Line label="主考姓名" en="Assessor Name" path="pages.p26.assessorName" />
          <Line label="職位" en="Post" path="pages.p26.assessorPost" />
          <Line label="日期" en="Date" type="date" path="pages.p26.assessorDate" />
        </Grid>
        <Sig label="簽署" en="Signature" path="pages.p26.assessorSig" />
        <Grid cols={2}>
          <div className="frow">
            <span className="frow__label">
              完成日期 <em>Date of Completion</em>
            </span>
            <span className="frow__value">
              <Write
                type="date"
                value={doneDate}
                onChange={(d) => {
                  setDoneDate(d);
                  if (book.pages?.p25?.subItemId) sync(book.pages.p25.subItemId, d);
                }}
                label="多元技能金帶一完成日期"
              />
            </span>
          </div>
          <Line label="證書編號" en="Certificate Number" path="pages.p26.certNo" />
        </Grid>
      </div>
    </Page>
  );
}

export function P27() {
  const { book } = useBook();
  const { isEn } = useLang();
  const [cat] = useField('pages.p27.category', '');
  const duplicate = Boolean(cat && book.pages?.p25?.category === cat);

  return (
    <Page id="p27">
      <H en="ACTIVITY BAR · CATEGORY II">多元技能金帶（第二範疇）</H>
      <CircleChoice
        path="pages.p27.category"
        options={[
          { value: 'scoutcraft', zh: '童軍技能', en: 'Scoutcraft' },
          { value: 'sport', zh: '康樂體育', en: 'Physical Recreation' },
          { value: 'new', zh: '新體驗', en: 'New Experience' },
        ]}
      />
      {duplicate && (
        <p className="dupwarn">
          <Icon name="alert" size={14} />{' '}
          {isEn
            ? 'Note: Activity Bar requires TWO DIFFERENT categories (Page 25 already uses this category).'
            : '提醒：多元技能金帶須從三個範疇中選修「兩個不同範疇」（此範疇與第 25 頁相同）。'}
        </p>
      )}
      <SubItemSelect level="L4" category={cat} path="pages.p27.subItemId" />
      <Area
        label="內容簡述（包括訓練班名稱、證書編號、活動細節等）"
        en="Summary of Activity (including name of course, certificate number, details of activity…)"
        path="pages.p27.summary"
        rows={8}
      />
    </Page>
  );
}

export function P28() {
  const { book } = useBook();
  const sync = useSyncProgress();
  const [doneDate, setDoneDate] = useField('pages.p28.completedDate');

  return (
    <Page id="p28">
      <H en="ACTIVITY BAR (II) — ASSESSOR'S COMMENTS">多元技能金帶（二）主考評語</H>
      <Area label="主考評語" en="Assessor's Comments" path="pages.p28.comments" rows={7} />
      <div className="awardbox">
        <Grid cols={3}>
          <Line label="主考姓名" en="Assessor Name" path="pages.p28.assessorName" />
          <Line label="職位" en="Post" path="pages.p28.assessorPost" />
          <Line label="日期" en="Date" type="date" path="pages.p28.assessorDate" />
        </Grid>
        <Sig label="簽署" en="Signature" path="pages.p28.assessorSig" />
        <Grid cols={2}>
          <div className="frow">
            <span className="frow__label">
              完成日期 <em>Date of Completion</em>
            </span>
            <span className="frow__value">
              <Write
                type="date"
                value={doneDate}
                onChange={(d) => {
                  setDoneDate(d);
                  if (book.pages?.p27?.subItemId) sync(book.pages.p27.subItemId, d);
                }}
                label="多元技能金帶二完成日期"
              />
            </span>
          </div>
          <Line label="證書編號" en="Certificate Number" path="pages.p28.certNo" />
        </Grid>
      </div>
    </Page>
  );
}

export function P29() {
  const [sel, setSel] = useField('pages.p29.selectedItem', '');
  const { isEn } = useLang();
  const expIds = ['L4-EXP-V11-HIKING', 'L4-EXP-V11-CYCLING', 'L4-EXP-V11-DRIVING', 'L4-EXP-V11-MECHANICAL', 'L4-EXP-V11-SEA'];

  return (
    <Page id="p29">
      <H en="EXPLORATION BAR">戶外探險金帶</H>
      <div className="subselect">
        <label>
          <span>{isEn ? 'Selected Item (4-Day 3-Night Expedition)' : '所選項目 Selected Item（四日三夜或以上旅程）'}</span>
          <select value={sel} onChange={(e) => setSel(e.target.value)}>
            <option value="">{isEn ? '— Choose Exploration Bar expedition —' : '— 請選擇戶外探險金帶旅程 —'}</option>
            {expIds.map((id) => (
              <option key={id} value={id}>
                {isEn ? ITEM_INDEX[id]?.en : ITEM_INDEX[id]?.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Area
        label="內容簡述（包括日期、地區、旅途、距離等）"
        en="Summary of Activity (including date, area, route, distance…)"
        path="pages.p29.summary"
        rows={9}
      />
    </Page>
  );
}

export function P30() {
  const { book } = useBook();
  const sync = useSyncProgress();
  const [doneDate, setDoneDate] = useField('pages.p30.completedDate');

  return (
    <Page id="p30">
      <H en="EXPLORATION BAR — ASSESSOR'S COMMENTS">戶外探險金帶 · 主考評語</H>
      <Area label="主考評語" en="Assessor's Comments" path="pages.p30.comments" rows={6} />
      <div className="awardbox">
        <Grid cols={2}>
          <Line label="主考姓名" en="Assessor Name" path="pages.p30.assessorName" />
          <Line label="職位" en="Post" path="pages.p30.assessorPost" />
          <Line label="遠足審核員編號（如適用）" en="Assessor Number (If applicable)" path="pages.p30.assessorNo" />
          <Line label="審核登記編號（如適用）" en="Assessment Registration Number" path="pages.p30.regNo" />
        </Grid>
        <Line label="簽署日期" en="Date" type="date" path="pages.p30.assessorDate" />
        <Sig label="簽署" en="Signature" path="pages.p30.assessorSig" />
        <Grid cols={2}>
          <div className="frow">
            <span className="frow__label">
              完成日期 <em>Date of Completion</em>
            </span>
            <span className="frow__value">
              <Write
                type="date"
                value={doneDate}
                onChange={(d) => {
                  setDoneDate(d);
                  if (book.pages?.p29?.selectedItem) sync(book.pages.p29.selectedItem, d);
                }}
                label="戶外探險金帶完成日期"
              />
            </span>
          </div>
          <Line label="證書編號" en="Certificate Number" path="pages.p30.certNo" />
        </Grid>
      </div>
    </Page>
  );
}

export function P31() {
  return (
    <Page id="p31">
      <H en="DRAGON SCOUT AWARD — DC INTERVIEW">榮譽童軍獎章</H>
      <Bilingual as="h3" className="secsub" zh="由區總監接見" en="Interview with District Commissioner" />
      <Area label="評語" en="Comments" path="pages.p31.dcComments" rows={9} placeholder="區總監接見評語..." />
      <Grid cols={2}>
        <Line label="姓名" en="Name" path="pages.p31.dcName" />
        <Line label="日期" en="Date" type="date" path="pages.p31.dcDate" />
      </Grid>
      <Sig label="簽署" en="Signature" path="pages.p31.dcSig" defaultTitle="區總監 DC" />
    </Page>
  );
}

export function P32() {
  return (
    <Page id="p32">
      <H en="DRAGON SCOUT AWARD — RC INTERVIEW">榮譽童軍獎章</H>
      <Bilingual as="h3" className="secsub" zh="由地域總監接見" en="Interview with Regional Commissioner" />
      <Area label="評語" en="Comments" path="pages.p32.rcComments" rows={9} placeholder="地域總監接見評語..." />
      <Grid cols={2}>
        <Line label="姓名" en="Name" path="pages.p32.rcName" />
        <Line label="日期" en="Date" type="date" path="pages.p32.rcDate" />
      </Grid>
      <Sig label="簽署" en="Signature" path="pages.p32.rcSig" defaultTitle="地域總監 RC" />
    </Page>
  );
}

export function P33() {
  const { isEn } = useLang();
  return (
    <Page id="p33">
      <H en="DRAGON SCOUT AWARD">榮譽童軍獎章</H>
      <div className="awardbox">
        <Grid cols={2}>
          <Line label="完成日期" en="Date of Completion" type="date" path="pages.p33.completedDate" />
          <Line label="證書編號" en="Certificate Number" path="pages.p33.certNo" placeholder="榮譽童軍獎章證書編號" />
        </Grid>
      </div>

      <P en="Applications received by the Programme Branch on or before 15 September each year will have the Certificates awarded in the Hong Kong Scout Rally of the same year.">
        全年均接受申請。如申請於每年 9 月 15 日或以前呈交到總會青少年活動署，其證書將安排於該年之香港童軍大會操中頒發。
      </P>

      <div className="formcta">
        <span>{isEn ? 'Generate Dragon Scout Award Application Form PT/20:' : '完成四條金帶及接見後，一鍵帶入資料生成申請表：'}</span>
        <Link to="/forms/pt20" className="btn btn--primary btn--sm">
          <Icon name="file" size={14} /> {isEn ? 'Generate Form PT/20' : '打開 PT/20 申請表'}
        </Link>
      </div>
    </Page>
  );
}
