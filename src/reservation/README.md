# 設備予約モック

`index.html` をブラウザーで開くと表示できます。ビルドは不要です。
画面のURL・ブラウザーの戻る／進むは、引き続き利用できます。

## ファイル構成

- `index.html`：画面の入口とHTML構造
- `css/`：基本スタイル、予約表、レスポンシブ対応、配色
- `js/`：画面表示、予約操作、検索、メニュー、URL制御
- `js/mock-data.js`：設備・予約のダミーデータ
- `assets/`：表示に使うロゴなどの素材
- `previews/`：開発中の表示確認スクリーンショット。画面表示には使いません。

JavaScriptはグローバルの関数・状態を共有する構成です。
`index.html` のスクリプト読込順を維持してください。

整形はプロジェクトルートから共通フォーマッターを実行します。

```powershell
node "$env:USERPROFILE\.codex\formatting\format.mjs" --root . <変更ファイル...>
node "$env:USERPROFILE\.codex\formatting\format.mjs" --root . --check <同じファイル...>
```
