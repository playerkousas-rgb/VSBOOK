# Design Review — 視覺與互動巡檢紀錄

本文件記錄 `VSBOOK` 在 `390×844`（手機）、`768×1024`（平板）及 `1440×900`（桌面）三個標準斷點，以及 `A4 @media print` 列印模式下的設計規範與實測巡檢紀錄（對齊真理倉 `design-review` 技能要求）。

## 視覺基準（Visual Baseline）

- **品牌主色（Venture Maroon）**：`#290710`（頂欄深底）、`#460d1a`（頁面主底）、`#5c1323`（酒紅布面）、`#771a2f`（高光漸層）—— 呼應香港深資童軍肩章與支部代表色，與 `ROVERBOOK` 之樂行深藍明確區隔。
- **燙金點綴（Foil Gold）**：`#d8b871`（主金）、`#f4dfaf`（亮金）、`#9e7832`（暗金），只用於封面百合花徽、頁碼徽記與重點二維碼 CTA。
- **紙本內頁（Ivory Archive Paper）**：`#f8f3e8`（紙底）、`#efe6d4`（次底）、`#21181c`（深墨字，對比度 `15.66:1`）、`#615259`（輔助字，於次底對比度 `5.92:1`）。
- **字體階層**：標題採用襯線體（`Noto Serif TC` / `Songti TC`）呈現正式紀錄冊莊重感；表格與輸入欄採用無襯線體（`Noto Sans TC` / `PingFang HK`）確保細字清晰；編號、日期與容量計採用等寬數字（`tabular-nums`）。
- **雙視圖設計**：
  - **紙本原貌（Paper Mode）**：`>= 521px` 預設啟用，完整保留《深資童軍紀錄冊》頁眉、雙線框、印章位及簽署欄。
  - **手機卡片（Card Mode）**：`<= 520px` 首次開啟自動啟用（頂欄及選單可一鍵切換），將多欄表格展開為單欄標籤卡片，徹底消除視窗水平捲軸。

---

## 巡檢紀錄（Rounds）

### ROUND 1（2026-11-04 · 390×844 / 768×1024 / 1440×900 / A4 Print）

- **巡檢範圍**：Welcome 啟動頁、酒紅布面封面、`contents` 目錄、`p01`–`p40` 全數 40 頁、`appendix` 數位附錄、`/forms` 及 `PT/65`（1 頁）・`PT/19`（3 頁）・`PT/20`（3 頁）・`/forms/all`（7 張 A4）、`/print`（40 頁全冊列印）、`ShowQrDialog` 二維碼出示、`/scan` ➔ `/scan/view` 領袖簽署回傳碼 ➔ `/scan/signoff` 成員寫入簽名、`/#v=VS1...` 純前端唯讀快照連結。
- **發現問題（5 項）**：
  1. **輔助字對比度（WCAG AA）**：`--ink-faint` 原值 `#786970` 在次底 `--paper-2`（`#efe6d4`）上對比度為 `4.18:1`，略低於 WCAG AA 小字 `4.5:1` 標準。
  2. **390px 手機頂欄空間預算**：`.chipbar__brand em`（「深資童軍紀錄冊」副標）與 `.chipbar__page`（`max-width: 44vw`）及右側四顆操作鈕同時顯示時，於 `390px` 寬度下略顯擠迫。
  3. **390px 官方表格（PT/65、PT/19、PT/20）多欄表格**：5 至 6 欄之 `.pttable` 在窄屏手機檢視時容易擠壓欄寬；同時需確保 `@media print` 強制維持 `display: table` 完整列印。
  4. **觸控目標尺寸**：訓練細項勾選格 `.itemline__tick`（`24×24px`）、手簽小鈕 `.assrow__pen`（`28×32px`）及刪除列鈕 `.rowdel`（`24×24px`）偏細，手機單手點按不夠寬裕。
  5. **掃描器觀景窗角標**：`/scan` 相機框內 `.scanner__frame` 四角定位線尚未加上燙金描邊樣式。
- **修正措施**：
  1. 將 `--ink-faint` 加深至 `#615259`，於 `--paper` 對比度提升至 `6.64:1`、於 `--paper-2` 提升至 `5.92:1`，全站文字色票 100% 通過 WCAG AA。
  2. 於 `@media (max-width: 520px)` 隱藏 `.chipbar__brand em` 並將 `.chipbar__page` 收斂至 `max-width: 34vw`，確保 `390px` 單行清爽不折行。
  3. 於 `@media (max-width: 680px)` 為 `.a4sheet` 與 `.pttable` 加入局部橫向滑動容器，並於 `@media print` 明確鎖定 `.pttable { display: table !important; width: 100% !important; overflow: visible !important; }`。
  4. 將 `.chipbtn` 提升至 `38×38px`、`.assrow__pen` 提升至 `36×36px`、`.rowdel` 提升至 `32×32px`、卡片模式下 `.itemline__tick` 提升至 `32×32px`。
  5. 補齊 `.scanner__frame i:nth-child(1..4)` 四角燙金觀景窗定位框。

### ROUND 2（2026-11-04 · 修正後複驗）

- **驗證結果**：
  - `390×844`：首次進入自動套用 `data-view="card"`，全數 42 個書冊路由、3 張官方表格及掃碼核簽流程零執行期錯誤、零視窗水平溢位。
  - `768×1024`：`/#v=VS1...` 唯讀快照連結正確解壓並顯示持有人、訓練進度與版權聲明。
  - `1440×900`：預設套用 `data-view="paper"` 呈現雙線框紙本原貌；Rollup 分包產出 `vendor-react`、`vendor-qr` 與主包，零 chunk 體積警告。
  - `A4 Print`：`/forms/all` 正確產出 `7` 張 A4（`PT/65` 1 頁 + `PT/19` 3 頁 + `PT/20` 3 頁），`/print` 正確產出 `40` 張官方紀錄冊頁面，頂欄與底欄於列印模式完全隱藏。
  - **結論**：**PASS（0 Critical / 0 Major / 0 Minor 殘留問題）**。
