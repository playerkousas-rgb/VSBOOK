# 00 — VSBOOK 一頁速查卡（Quickcard）

| 項目 | 內容 |
| :--- | :--- |
| **定位** | 香港深資童軍個人隨身離線電子紀錄冊（紙本第 1–40 頁 ＋ 2026 第十一版訓練綱要 ＋ `PT/65`・`PT/19`・`PT/20`） |
| **網址路由** | `/` 封面・`/p/p01`–`/p/p40` 紙本第 1–40 頁・`/p/contents` 目錄・`/p/appendix` 數位附錄・`/forms` 官方表格（`pt65`、`pt19`、`pt20`、`all`）・`/scan` 掃描二維碼・`/print` 整本列印 |
| **本機儲存鍵** | `vsbook.book.v1`（紀錄冊主體）、`vsbook.lang`（語言 `zh`/`en`）、`vsbook.view`（視圖 `paper`/`card`）、`vsbook.signoff.applied.v1`（已寫入核簽序號） |
| **互通格式** | `vsbadge.progress.v1`（以 `scoutId` 對齊 `L1-*`、`L2-*`、`L3-*`、`L4-*`、`OT-*` 完成日期） |
| **二維碼協定** | `VS1.<base64url(gzip(JSON))>`（壓縮優先）或 `VS1P.<base64url(JSON)>`（無壓縮後備），上限 `2400` 字元 |
| **版權與聲明** | `Copyright © 2026 SCOUT SYSTEM — All Rights Reserved`（見 [`../LICENSE`](../LICENSE)）＋ 非官方獨立工具聲明 |

## 常用指令

```bash
npm run dev                                        # 本機開發（http://0.0.0.0:5173）
npm test                                           # 執行單元與資料守衛測試
npm run build                                      # 建置生產版至 dist/
node scripts/generate_icons.mjs                    # 重新生成 web/public/icons/ 全套 9 個 G11 圖示
node scripts/guard.mjs                             # 檔案／連結／體積／機密守衛
node scripts/final_check_v1.0.mjs --json           # 六角度收工閘門
rm -rf dist && node scripts/preflight_v1.0.mjs .   # 八項開局與倉庫健康總閘門
```

## 常見排障

1. **手機提示「儲存空間不足」**：前往 `/p/appendix`（數位附錄）→「本機儲存健康」，點擊「一鍵壓縮所有圖片與手寫墨跡」，並匯出 JSON 備份。
2. **二維碼超出容量（> 2,400 字元）**：在「出示二維碼」對話框取消勾選「近照」或「領袖簽署墨跡」等大檔案組別；如需完整轉移到新手機，請用數位附錄之「匯出完整紀錄冊 JSON」。
3. **表格列印出現頁首網址或邊界裁切**：在瀏覽器列印對話框選擇紙張 `A4`、邊界 `預設 / 無`、勾選「背景圖形」，並取消勾選「頁首及頁尾」；`PT/19` 及 `PT/20` 第 1–2 頁請按總會規定雙面列印於同一張紙。
