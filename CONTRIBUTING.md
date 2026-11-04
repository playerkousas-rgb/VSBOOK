# CONTRIBUTING.md — 修改與貢獻守則

歡迎為 `VSBOOK` 提交修正或改進建議。請注意本專案採用 **All Rights Reserved** 專有版權（見 [`LICENSE`](LICENSE)），任何提交至本倉庫之貢獻均歸屬 `SCOUT SYSTEM` 統一管理及保護。

## 開發與修改流程

1. 先閱讀 [`AGENTS.md`](AGENTS.md)、[`SCOPE.md`](SCOPE.md) 及 [`GLOSSARY.md`](GLOSSARY.md)，確認改動屬於專案範圍內且使用統一詞彙。
2. 如涉及架構、儲存格式或二維碼協定變更，請先在 [`docs/adr/README.md`](docs/adr/README.md) 新增一頁 ADR 紀錄取捨原因。
3. 如涉及介面、字級、間距、配色或列印版面變更，須在 390px（手機）、768px（平板）及 1440px（桌面）三個斷點實測，並更新 [`docs/design-review.md`](docs/design-review.md)。
4. 嚴禁引入任何將成員個人資料上傳至遠端伺服器之程式碼、第三方追蹤器或硬編碼金鑰。

## 提交前必跑檢查清單

```bash
# 1. 單元與資料模型守衛測試（必須 0 fail）
npm test

# 2. 生產版建置與體積／安全／HTML 單檔契約檢查
npm run build
node scripts/guard.mjs
node scripts/final_check_v1.0.mjs --json

# 3. 清理建置產物後執行倉庫健康與開局閘門檢查
rm -rf dist
node scripts/preflight_v1.0.mjs . --json
```

## 雙重版本號規則（Rule V）

每次發佈使用者可見的變更時，必須同步更新以下四處版本號並保持一致：

1. `package.json` 的 `"version"`
2. `shared/book.js` 的 `APP_VERSION`
3. `web/index.html` 的頂部 `GENERATED` 註解、`<meta name="app-version">`、`window.APP_VERSION` 及靜態頁尾文字
4. [`CHANGELOG.md`](CHANGELOG.md) 的版本紀錄
