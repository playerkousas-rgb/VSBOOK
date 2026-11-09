# AGENTS.md — VSBOOK 工作守則

開工前必讀。本倉庫遵循上游治理真理倉 `playerkousas-rgb/readme` 之 `0`（INTAKE）→ `1`（START）→ `2`（repo-setup）→ `3`（design-review）→ `4`（preflight）→ `5`（guard / final_check）流程。

## 1. 一句話定位

**VSBOOK** 是香港深資童軍個人隨身離線電子紀錄冊（純前端 PWA），逐頁對應《深資童軍紀錄冊》第 1–40 頁及 2026 年第十一版訓練綱要，支援就地打字／手寫簽名、`PT/65`・`PT/19`・`PT/20` 自動填表列印、純離線二維碼核簽與 `vsbadge` JSON 互通。

## 2. 關鍵路徑

- 定位與邊界：[`SCOPE.md`](SCOPE.md)、[`docs/out-of-scope/README.md`](docs/out-of-scope/README.md)
- 詞彙單一真相：[`GLOSSARY.md`](GLOSSARY.md)
- 架構決策：[`docs/adr/README.md`](docs/adr/README.md)
- 視覺巡檢：[`docs/design-review.md`](docs/design-review.md)
- 資料與協定核心：`shared/syllabus.js`、`shared/book.js`、`shared/forms.js`、`shared/transfer.js`
- 前端介面與離線快取：`web/index.html`、`web/src/`、`web/public/sw.js`、`web/public/icons/`
- 自動化測試與閘門：`tests/`、`scripts/`

## 3. 不可退讓底線（Non-Negotiables）

1. **100% 純前端、零後端、零個人資料上傳**：不設帳號登入、不建伺服器資料庫、不將成員個人資料／相片／簽名傳送至任何外部伺服器。二維碼（`VS1.`）及唯讀分享連結（`/#v=VS1...` URL fragment）均只在裝置本地解碼。
2. **單一成員識別碼 `SCOUT ID`**：紀錄冊編號與童軍成員編號統一為 `scoutId`（同步兼容 `memberNo`，淘汰舊 `ymis`），確保與 `vsbadge` v4.0.0 無縫互通。
3. **紙本頁碼與 2026 第十一版綱要精準對齊**：嚴格維持紙本第 1–40 頁頁序，以及 `FORM PT/65 (8/2026)`、`FORM PT/19 (10/2026)`、`FORM PT/20 (10/2026)` 官方欄位（含香港身份證只填首四位如 `A123` 之私隱保護提示）。
4. **版權保護（非 MIT）與非官方聲明（W1）**：維持 [`LICENSE`](LICENSE) 之 `Copyright © 2026 SCOUT SYSTEM — All Rights Reserved` 條款，並在封面／附錄／頁尾保留參考 `ROVERBOOK` 之完整中英非官方工具聲明，區分軟件版權（`SCOUT SYSTEM`）與訓練綱要內容版權（`香港童軍總會`）。
5. **四處版本號同步（V）與體積預算（S7 / G11）**：任何可見更新須同步遞增 `package.json`、`web/index.html`（`meta[name="app-version"]`、`window.APP_VERSION` 及頂部 GENERATED 註解）、`shared/book.js`（`APP_VERSION`）、**`web/public/sw.js` 的 `CACHE_NAME`**（如 `vsbook-cache-v1.0.1` → `v1.0.2`）及 `CHANGELOG.md`；只改程式碼不改快取名，已安裝的主畫面 APP 永遠收到舊版面（由 `tests/ui_contracts.test.mjs` 的 PWA 版本守衛把關）。`dist/` 總體積須 `< 5 MB`（目標 `< 1 MB`），`web/public/icons/` 9 個圖示總和須 `<= 260 KB`。
6. **禁止在 `.js/.mjs/.jsx` 寫 `// v1.0` 行內版本註解（F15）**：版本號只寫在常數、HTML meta 與 `CHANGELOG.md`。

## 4. 交付前必跑指令

```bash
npm test
npm run build
node scripts/guard.mjs
node scripts/final_check_v1.0.mjs --json
rm -rf dist && node scripts/preflight_v1.0.mjs . --json
```
