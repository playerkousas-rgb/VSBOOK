# GLOSSARY.md — 統一詞彙表

全倉程式碼、介面文案、測試與文件統一使用下列名稱，嚴禁混用同義舊稱。

| 繁體中文（標準名稱） | English (Canonical) | 程式碼鍵名／常數 | 定義與備註 |
| :--- | :--- | :--- | :--- |
| **深資童軍紀錄冊** | Venture Scout Record Book | `VSBOOK` | 香港童軍總會深資童軍支部個人紀錄冊（紙本共 40 頁，第 1–40 頁）。 |
| **童軍成員編號** | Scout ID | `scoutId`（同步 `memberNo`） | 成員唯一編號，與 `vsbadge` 統一。嚴禁再新增舊稱 `YMIS` 欄位。 |
| **深資童軍團** | Venture Scout Unit | `unit` / `group` | 成員所屬深資童軍單位（隸屬地域 `region`、區 `district`、旅 `group`）。 |
| **執行委員會** | Unit Executive Committee | `execCommittee` | 深資童軍以自治自務方式運作之團務委員會。 |
| **深資童軍團長** | Venture Scout Leader (VSL) | `vsl` | 負責領導深資童軍團及按年簽署續期、簽發會員章與肩章之成人領袖。 |
| **旅長** | Group Scout Leader (GSL) | `gsl` | 所屬童軍旅之領袖，可與團長共同提名 `PT/19` 及 `PT/20` 申請。 |
| **會員章** | Membership Badge | `L1` | 進度性獎章第一階（紙本第 9–10 頁，共 12 項細項）。 |
| **深資童軍肩章** | Venture Scout Epaulettes | `L2` | 進度性獎章第二階（紙本第 11–13 頁，分甲部「認識」10 項及乙部「童軍技能」13 項；可憑深資童軍先修章／童軍標準獎章豁免對應部分）。 |
| **深資童軍獎章** | Venture Scout Award | `L3` | 進度性獎章第三階（紙本第 14–20 頁），含活動策劃、社會服務、多元技能、戶外探險四個**段章**（Badges）及區總監接見。 |
| **榮譽童軍獎章** | Dragon Scout Award | `L4` | 深資童軍支部最高進度性獎章（紙本第 21–33 頁），含活動策劃、社會服務、多元技能（兩範疇）、戶外探險四條**金帶**（Bars）及區總監、地域總監接見。 |
| **活動策劃段章／金帶** | Project Badge / Project Bar | `L3-PROJECT-*` / `L4-PROJ-*` | 四個考驗組別之一（紙本第 14 頁、第 21–22 頁）。 |
| **社會服務段章／金帶** | Service Badge / Service Bar | `L3-SERVICE-*` / `L4-SERV-*` | 四個考驗組別之一（紙本第 15 頁、第 23–24 頁）。 |
| **多元技能段章／金帶** | Activity Badge / Activity Bar | `L3-ACT-*` / `L4-ACT-*` | 四個考驗組別之一（紙本第 16–17 頁、第 25–28 頁；分為童軍技能、康樂體育、新體驗三範疇，金帶須選修兩個不同範疇）。 |
| **戶外探險段章／金帶** | Exploration Badge / Exploration Bar | `L3-EXP-*` / `L4-EXP-*` | 四個考驗組別之一（紙本第 18–19 頁、第 29–30 頁）。 |
| **考驗計劃表格** | Planning for Assessment (`FORM PT/65`) | `pt65` | 官方表格 `FORM PT/65 (8/2026)`（1 頁），規劃深資童軍獎章及榮譽童軍獎章考驗內容。 |
| **深資童軍獎章申請表** | Venture Scout Award Application (`FORM PT/19`) | `pt19` | 官方表格 `FORM PT/19 (10/2026)`（3 頁，含申請表正背面及證明文件查閱清單）。 |
| **榮譽童軍獎章申請表** | Dragon Scout Award Application (`FORM PT/20`) | `pt20` | 官方表格 `FORM PT/20 (10/2026)`（3 頁，含申請表正背面及證明文件查閱清單）。 |
| **成員二維碼傳送碼** | Member Transfer QR | `VS1.` / `vsbook/member` | 成員自選欄位後經 gzip + Base64URL 編碼產生之離線二維碼字串。 |
| **領袖核簽回傳碼** | Leader Sign-off Return QR | `VS1.` / `vsbook/signoff` | 領袖掃描成員進度並一次簽名後產生之輕量回傳二維碼，供成員掃回寫入紀錄冊。 |
