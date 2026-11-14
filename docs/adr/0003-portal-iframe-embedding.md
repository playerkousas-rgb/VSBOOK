# ADR 0003：服務平台 iframe 嵌入白名單

- **日期**：2026-11-14
- **狀態**：已採納（Accepted）
- **參照**：CUBSBOOK PR #9

## 決策

VSBOOK 全站回應以下標頭，只容許自身及指定服務平台嵌入：

```
Content-Security-Policy: frame-ancestors 'self' https://member-portal-sigma-swart.vercel.app
```

移除原有 `X-Frame-Options: DENY`，不改成 `SAMEORIGIN`，亦不使用已廢棄的 `ALLOW-FROM`。兩者都不能表達指定跨網站白名單。白名單不使用萬用字元；`shared/embed.js` 保存來源常數，`tests/embed_contract.test.mjs` 核對實際 `vercel.json`。CSP 只設 `frame-ancestors`，不新增會阻擋 Vite 程式、圖片或現有功能的資源限制。

`Permissions-Policy: camera=(self), microphone=(), geolocation=()` 保持不變。服務平台必須用 `allow="camera; clipboard-write"` 委派權限，平台自己的政策亦不能封鎖相機；使用者仍須在 HTTPS 環境批准相機存取。BOOK 一方不能代替平台批出權限。

## 本機資料及備份

跨網站 iframe 的 localStorage、sessionStorage、Service Worker 及快取按頂層網站分割。服務平台與 BOOK 的 `vercel.app` 域名屬不同網站，平台內看不到獨立版原有資料。CSP 不會解除這個瀏覽器限制，BOOK 不繞過它，也不新增雲端個人資料儲存。

- 獨立版選單「匯出備份」→ 平台內歡迎頁「匯入備份」，可把完整 JSON 搬入平台；反向搬移亦然。
- 兩邊各自編輯後不會自動合併。匯入會覆蓋目的地的紀錄冊，請先匯出目的地現有嘅紀錄冊。兩邊嘅變更不會自動合併。
- BADGE 純進度檔不是完整 BOOK 備份，不能代替相片、簽名及頁面內容的轉移。
- 瀏覽器私隱設定、無痕模式或封鎖第三方儲存可能令寫入失敗；現有「未儲存」警告會提示立即匯出。關閉頁面後，未寫入的記憶體內資料不能保證保留。
- iPhone／iPad／Safari 可能清除嵌入模式資料；每次填寫後應匯出，長期紀錄建議使用獨立版。備份包含個人資料，應放在安全位置，不應上載至服務平台。

## 離線及平台配合

平台內須先連網開啟一次，待 Service Worker 快取完成，離線時才可能重開 BOOK。頂層平台頁面亦須仍然開著，或平台本身支援離線；只快取 BOOK 並不能令整個平台離線啟動。獨立版已安裝 PWA 的離線及更新流程不變，快取名隨版本遞增。

平台 iframe 建議：

```html
<iframe src="https://vsbook-sand.vercel.app/" allow="camera; clipboard-write"></iframe>
```

不要為了嵌入而加入寬鬆的 `sandbox`。如平台必須使用，至少按實際功能配置 `allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads`；缺少後三類權限可分別影響新分頁、覆蓋確認及備份下載。使用正式公開別名，而非受 Vercel 登入保護的 deployment/preview 網址。

`frame-ancestors` 會檢查整條祖先鏈。若服務平台再被區官網等第三方網站嵌入，而該網站不在本白名單，BOOK 仍會被阻擋；應直接開啟指定服務平台，不應為此放寬成所有網站。

平台網址變更時，須同步更新 `shared/embed.js`、`vercel.json`、文件及測試，重新部署後再驗證。嵌入提示只在 `window.self !== window.top` 時顯示，「知道了」只記於目前工作階段，不修改紀錄冊，不加入反嵌入跳轉。
