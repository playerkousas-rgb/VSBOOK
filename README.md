# VSBOOK · 深資童軍電子紀錄冊

> **深資童軍個人隨身離線電子紀錄冊** —— 逐頁對應香港童軍總會《深資童軍紀錄冊》第 1–40 頁及 2026 年第十一版《深資童軍訓練綱要》，支援就地打字／手寫與簽名、一鍵生成及列印 `PT/65`・`PT/19`・`PT/20` 三張官方表格、成員⇄領袖純離線二維碼傳送與核簽回傳，以及登入後與 `vsbadge` 進度 JSON 雙向互通。

- **目前版本**：`v1.0.4`（2026-11-12）
- **架構形態**：離線優先 PWA（React + Vite + Service Worker，`localStorage` 本機儲存，零帳號、零雲端上傳；可選配 Vercel `/api/leader` 伺服器端領袖密碼驗證）
- **設計主題**：對齊 `ROVERBOOK`（`v16`）介面、安全區與版權配置規範，採用**深資童軍紅布面燙金封面**（Venture Scout Maroon `#540f1e` × 支部酒紅 `#7a1426` × 燙金 `#d8b871` × 象牙內頁 `#f7f2e7`），內嵌支部徽及全套 13 張官方獎章／金帶圖案、全套 SVG／ICO／PNG／Maskable Favicon 圖示、**中英文完全分開顯示（節省版面）**，以及嚴格區隔**領袖模式（只讀）**與**普通模式（不能讀）**

---

## 30 秒開始

```bash
npm install          # 安裝依賴
npm run dev          # 啟動本機開發伺服器（0.0.0.0:5173）
npm test             # 執行單元與資料模型守衛測試（node --test）
npm run build        # 打包生產版靜態檔案至 dist/
```

品質閘門驗證（對齊 `playerkousas-rgb/readme` 真理倉）：

```bash
npm run build && node scripts/guard.mjs && node scripts/final_check_v1.0.mjs --json
rm -rf dist && node scripts/preflight_v1.0.mjs . --json
```

---

## 核心功能

1. **逐頁對應紙本第 1–40 頁**：完整涵蓋個人資料（第 1 頁）、轉旅及旅部資料（第 2 頁）、童軍紀錄與更改摘要（第 3 頁）、會員資格續期（第 4–5 頁）、支部目的／方法／誓詞規律（第 6–7 頁）、進度性獎章總覽（第 8 頁）、會員章（第 9–10 頁）、深資童軍肩章（第 11–13 頁）、深資童軍獎章四段章及區總監接見（第 14–20 頁）、榮譽童軍獎章四金帶及區／地域總監接見（第 21–33 頁）、寰宇童軍章與急救章（第 34 頁）、樂行童軍先修章（第 35 頁）、世界童軍組織獎章（第 36 頁）、其他獎章（第 37–38 頁）、其他經驗（第 39 頁）及遠足與海外活動（第 40 頁）。
2. **就地打字、空白圓點提示與單色簽名壓縮**：對齊 `ROVERBOOK`（`v15`）體驗，螢幕上空白欄只顯示清爽小圓圈（`.write__dot`），一按即寫、字多自動縮字不爆格，列印或「預覽列印效果」時自動隱藏圓圈並還原紙本橫線；簽名與手寫自動轉為透明底單色 PNG，節省本機空間並可直接塞入二維碼。
3. **A4 紙本原貌與手機自適應展開**：桌面與平板以 A4 比例（`210:297`）呈現紙本裝訂陰影、官方獎章插圖與三欄簽核表；`<= 740px` 手機螢幕自動展開為自然高度單欄排版，徹底消除水平捲軸。
4. **三張官方表格自動帶入與 A4 列印**：由紀錄冊進度及個人資料即時自動填入：
   - `FORM PT/65 (8/2026)`：深資童軍獎章及榮譽童軍獎章考驗計劃（1 頁）
   - `FORM PT/19 (10/2026)`：深資童軍獎章及證書申請表（3 頁，含雙面申請頁及查閱清單 Checklist）
   - `FORM PT/20 (10/2026)`：榮譽童軍獎章及證書申請表（3 頁，含雙面申請頁及查閱清單 Checklist）
5. **分開「領袖模式（只讀）」與「普通模式（不能讀）」（`VS1.` 協定 + `/api/leader`）**：
   - **普通模式（預設 · 不能讀取他人紀錄冊）**：成員可填寫自己的紀錄冊並「出示二維碼」（預設全不選，私隱自決），但**不開放任何讀取／掃描成員紀錄冊的入口**；僅可在「出示二維碼」視窗貼上領袖簽發的 `VS1S.` 核簽回傳碼寫入簽名。
   - **領袖模式（只讀 · Read-Only）**：輸入伺服器端環境變數 `LEADER_CODE`（經 `/api/leader` 以 `crypto.timingSafeEqual` 驗證，絕不暴露於前端 bundle）後開啟 12 小時；領袖可透過 `/scan` 或 `#v=` 唯讀查閱成員分享內容並簽發 `VS1S.` 核簽回傳碼，同時本機紀錄冊鎖定為只讀狀態，杜絕誤改。
6. **個人紀錄冊 `BOOK` 與旅團進度表 `BADGE`（`vsbadge`）純進度免重打同步（不錄入個人資料 · 嚴守單向信任）**：
   - **定位清晰**：`VSBOOK`（`BOOK`）純粹是成員個人的實體紀錄冊電子版；`vsbadge`（`BADGE`）則是領袖用來一次過檢視及填寫全團進度的旅團進度表，兩者各司其職，省卻成員在 `BOOK` 寫一次、又要在 `BADGE` 重打一次的功夫。
   - **由 `BADGE` 錄入進 `BOOK`**：`BOOK` **無條件相信**在 `vsbadge` 內已獲領袖核實（CONFIRMED）的進度並寫入紀錄冊；處於「待領袖核實（pending）」的未核實項目**絕不錄入**，且**絕不錄入任何個人資料**。
   - **由 `BOOK` 送交 `BADGE`**：成員在 `BOOK` 記錄的進度送往 `vsbadge` 時，一律經 `requestComplete` 變成**「待領袖核實（pending）」**（`/api/vsbadge` 嚴禁直接呼叫 `save` 寫入已核實進度），領袖仍須在 `vsbadge` 內按 CONFIRM 方為完成，杜絕成員扮自己已完成。
   - **進度檔匯出／匯入**：僅限已連接並登入 BADGE 帳戶；未登入時按鈕會鎖定。此限制只適用 BADGE 進度檔，本機「完整備份 JSON／還原備份 JSON」及整本紀錄冊仍完全離線可用。
   - 數位附錄自動讀取 BADGE 已登記旅團；沒有旅團或選擇「找不到旅團」時才提供 BADGE 登記及成員開戶連結。
7. **中英文完全分開（節省版面）與全套 Favicon／PWA 圖示**：頂欄與歡迎頁一鍵切換繁體中文／English，單語乾淨呈現、不並排重複佔位；齊備 `/favicon.svg`、`/favicon.ico`、`/favicon-32.png`、`/favicon-48.png` 及 `/icons/*` 全套 iOS / Android 主畫面與 OG 圖示。

### Vercel 部署設定（領袖密碼 `LEADER_CODE` 及 `vsbadge` 後端配合）

在 Vercel → **Project → Settings → Environment Variables** 新增（**請勿加 `VITE_` 前綴**）：

1. **`LEADER_CODE`**（必填以啟用領袖模式）：
   - **Name**：`LEADER_CODE`
   - **Value**：你設定的領袖密碼（本機 `npm run dev` 未設定時預設為 `1234` 方便測試）
   - **Scope**：`Production`（及 `Preview`）
   - 設定後重新部署（Redeploy）；若未設定 `LEADER_CODE`，系統會自動隱藏領袖模式入口，作為純成員版運作。
2. **`VSBADGE_ORIGIN`**（選填，預設自動對接部署網址 `https://vsbadge.vercel.app`）：
   - 供成員在「數位附錄」一鍵連接自己的 `vsbadge` 帳戶，錄入領袖已核實進度或將新填進度送交 `vsbadge` 待領袖核實（如有自建 `vsbadge` 網址，可設 `VSBADGE_ORIGIN=https://你的-vsbadge-網址`）。

---

## 倉庫導航

| 路徑 | 說明 |
| :--- | :--- |
| [`AGENTS.md`](AGENTS.md) | Agent 工作守則、關鍵路徑與不可退讓底線 |
| [`SCOPE.md`](SCOPE.md) | 專案邊界（In Scope / Out of Scope）及 P1 同類產品參考 |
| [`GLOSSARY.md`](GLOSSARY.md) | 深資童軍支部、獎章、表格及系統中英統一詞彙表 |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | 修改流程、提交前檢查清單與雙重版本規範 |
| [`CHANGELOG.md`](CHANGELOG.md) | 版本變更紀錄 |
| [`LICENSE`](LICENSE) | 版權保留與個人前端使用聲明（All Rights Reserved，非 MIT） |
| [`docs/00-quickcard.md`](docs/00-quickcard.md) | 一頁速查卡（日常運作與除錯） |
| [`docs/design-review.md`](docs/design-review.md) | 390 / 768 / 1440 三斷點視覺與互動巡檢紀錄 |
| [`docs/adr/README.md`](docs/adr/README.md) | 架構決策紀錄（技術棧、純前端 QR 與版權保護） |
| [`docs/out-of-scope/README.md`](docs/out-of-scope/README.md) | 明確不做事項及姊妹專案分工 |
| `shared/` | 紀錄冊資料模型（`book.js`）、第十一版訓練綱要（`syllabus.js`）、官方表格映射（`forms.js`）與 `VS1.` 二維碼協定（`transfer.js`） |
| `web/` | React + Vite 前端應用程式、PWA `sw.js` 及 G11 圖示集（`web/public/icons/`） |
| [`scripts/README.md`](scripts/README.md) | 真理倉守衛腳本與圖示生成腳本說明 |
| [`tests/README.md`](tests/README.md) | 單元與資料模型守衛測試（`node --test`） |

---

## 版權及非官方獨立工具聲明

**Copyright © 2026 SCOUT SYSTEM — All Rights Reserved.**（詳見 [`LICENSE`](LICENSE)，本專案**並非** MIT 開源授權，未經書面授權嚴禁任何機構或個人複製、改作或據為己有。）

本網站為非官方獨立工具，旨在方便成員，與香港童軍總會無任何官方從屬關係。所有訓練綱要及紀錄冊內容，版權歸香港童軍總會所有。

This site is an independent, unofficial tool for members, and has no official affiliation with The Scout Association of Hong Kong. All training syllabus and record-book content is the copyright of The Scout Association of Hong Kong.
