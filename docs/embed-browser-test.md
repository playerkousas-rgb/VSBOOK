# VSBOOK 服務平台嵌入：瀏覽器實測紀錄

- **日期**：2026-11-14
- **版本**：`v1.0.5`
- **環境**：無頭 Chromium `153.0.8010.0`；本機 HTTPS 測試夾具按 `vercel.json` 回應實際標頭，載入生產建置 bundle 及 Service Worker。測試用 portal fixture 並非正式服務平台頁面。
- **結果**：27 項通過。

## 已驗證

1. 全站回應 `Content-Security-Policy: frame-ancestors 'self' https://member-portal-sigma-swart.vercel.app`。
2. `X-Frame-Options` 不存在；沒有 `DENY` 或 `SAMEORIGIN`。
3. `Permissions-Policy: camera=(self), microphone=(), geolocation=()` 保留。
4. 獨立開啟時不出現嵌入提示，原有版面不受影響。
5. 獨立版可建立紀錄冊、寫入 localStorage 及匯出完整 JSON 備份。
6. 指定服務平台來源可嵌入 VSBOOK。
7. 平台內 localStorage 與獨立版分割，舊資料不會自動出現。
8. 390px 手機寬度下，歡迎頁嵌入提示不超出 iframe 寬度。
9. 平台內歡迎頁可匯入完整備份並還原紀錄冊。
10. 頂部提示條可匯出平台內資料，作反向搬移。
11. 「知道了」只隱藏提示條，不刪除紀錄冊。
12. 嵌入選單提供「開啟獨立版（新分頁）」，`target="_blank"`。
13. 新分頁獨立版保留自身原有資料。
14. 選單匯入備份會彈出覆蓋確認對話框。
15. 平台內重新載入後，已還原資料仍在。
16. 平台內領袖模式相機掃描可啟動（測試用 fake camera）。
17. iframe `allow="camera; clipboard-write"` 可委派相機及剪貼簿權限。
18. 缺少 `allow="camera"` 時，相機掃描被瀏覽器拒絕。
19. 平台內 Service Worker 可啟動並使用獨立快取。
20. 平台頁面仍開著時，BOOK 可離線重新載入並讀取已還原資料。
21. BOOK 快取不能令服務平台本身離線啟動。
22. 非白名單網站嵌入被 CSP 攔截。
23. 服務平台再被非白名單外層網站嵌入時，BOOK 因整條祖先鏈被攔截。
24. 正確配置 `sandbox` 時，仍保留同源儲存存取。
25. 瀏覽器封鎖本機儲存時，會顯示「未儲存」警告而非崩潰。
26. 即使寫入失敗，仍可匯出記憶體中的完整備份。
27. 相機、QR、備份及離線相關程式路徑保留。

## 未實測／限制

- Safari、iPhone／iPad、Firefox 未在沙盒實測；相關儲存清除風險按瀏覽器平台行為及 WebKit 追蹤防止文件說明。
- 正式服務平台頁面尚未由本次部署自動改動；平台一方仍須使用公開正式別名及 `allow="camera; clipboard-write"`。
- 跨網站 iframe 儲存分割是瀏覽器私隱機制，CSP 不能令獨立版舊資料自動共用。
- 平台內離線快取只支援「平台頁面仍開著」或「平台本身支援離線」的情境；完整離線體驗建議使用獨立版 PWA。
