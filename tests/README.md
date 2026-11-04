# tests/ — 自動化單元與守衛測試

使用 Node.js 內建測試執行器（`node --test`），零額外測試框架依賴：

```bash
npm test
```

## 測試範圍

- `tests/book_and_syllabus.test.mjs`：
  - 驗證紙本第 1–40 頁頁碼映射（`PRINT_PAGES` 共 40 頁，無缺頁或重覆頁碼）；
  - 驗證 2026 年第十一版《深資童軍訓練綱要》（`L1` 會員章、`L2` 深資童軍肩章、`L3` 深資童軍獎章、`L4` 榮譽童軍獎章及 `OT-*` 其他獎章）項目索引完整性；
  - 驗證 `SCOUT ID` 單一真相（`syncIdentity` 自動同步 `scoutId` 與 `memberNo` 並清除舊 `ymis`）；
  - 驗證與 `vsbadge` 雙向進度匯出／匯入（`exportForVsBadge` / `importFromVsBadge` 不覆蓋既有簽名與日期）。
- `tests/forms_and_transfer.test.mjs`：
  - 驗證三張官方表格（`PT/65`、`PT/19`、`PT/20`）由紀錄冊自動推導個人資料、身份證首四碼私隱截斷、年齡計算、段章與金帶完成日期及查閱清單；
  - 驗證 `VS1.` / `VS1P.` 二維碼封包壓縮編碼、解碼、敏感欄位隔離（未勾選絕不外洩）及領袖核簽回傳碼（`applySignoff`）寫入與防重覆序號邏輯；
  - 驗證 G11 全套 9 個圖示檔案存在、總體積 `<= 260 KB` 及雙重版本號一致性。
- `tests/ui_contracts.test.mjs`：
  - 驗證 `App.jsx` 對齊全部 40 頁官方頁面＋總目錄＋數位附錄之路由映射；
  - 驗證 `Legal.jsx` 保留與 `ROVERBOOK` 完全一致之 `Copyright © 2026 SCOUT SYSTEM` 及非官方工具免責聲明；
  - 驗證 PWA `index.html`、`manifest.webmanifest`、圖示資源與 `sw.js` 離線快取契約。
