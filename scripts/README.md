# scripts/ — 自動化守衛與工具腳本

本目錄存放由上游治理真理倉（`playerkousas-rgb/readme`）同步之零依賴品質閘門腳本，以及本專案之圖示生成腳本：

| 腳本 | 用途 |
| :--- | :--- |
| `preflight_v1.0.mjs` | 開局與交付總閘門（一次過執行 placeholder、UTF-8、語法、`guard`、`final_check`、`repo_health`、`check_skills` 共 8 項檢查） |
| `guard.mjs` | 檢查必備治理檔、機密外洩（A1）、大檔與 `dist < 5MB` 體積上限（S6/S7/S10）、Markdown 內部連結（G10）及禁止行內版本註解（F15） |
| `final_check_v1.0.mjs` | 六角度收工閘門（`vercel.json` 契約、機密掃描、`dist/` 大小、`node --test` 測試結果及單檔 HTML 審計） |
| `audit_single_html_v1.0.mjs` | 檢查 `index.html` 之雙重版本號、版權標記（`© SCOUT SYSTEM`）與本機儲存安全包裝 |
| `repo_health_v1.0.mjs` | 檢查 12 項起手包結構、版權檔、機密、體積與內部連結健康度 |
| `check_skills_v1.0.mjs` | 驗證 `skills/` 目錄（如有）之 frontmatter 與索引一致性 |
| `generate_icons.mjs` | 以純 Node.js + ImageMagick 決定性生成 `web/public/icons/` 全套 9 個符合 G11 標準之深資酒紅燙金圖示（總體積 `<= 260 KB`） |
