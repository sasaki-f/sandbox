# Mock Flow Gallery

スクリーンショット付きの画面一覧。

生成元:

- スクリプト: [scripts/capture-mock-flows.js](/c:/Users/佐々木史/Documents/workspace/sandbox/scripts/capture-mock-flows.js)
- 元画面: [src/mock.html](/c:/Users/佐々木史/Documents/workspace/sandbox/src/mock.html)

## 一覧

### 1. タイムライン

起点: タイムライン初期表示

![タイムライン](./screenshots/01-timeline.png)

### 2. 投稿メニュー

起点: 投稿カード -> メニュー

![投稿メニュー](./screenshots/02-post-menu.png)

### 3. メディアプレビュー

起点: 投稿カード -> 画像/動画

![メディアプレビュー](./screenshots/03-media-preview.png)

### 4. 既読者モーダル

起点: 投稿カード -> 既読人数

![既読者モーダル](./screenshots/04-readers-modal.png)

### 5. コメントビュー

起点: 投稿カード -> コメント

![コメントビュー](./screenshots/05-comment-view.png)

### 6. コメントヘッダーメニュー

起点: コメントビュー -> ヘッダーメニュー

![コメントヘッダーメニュー](./screenshots/06-comment-header-menu.png)

### 7. コメントアクションシート

起点: コメント長押し

![コメントアクションシート](./screenshots/07-comment-action-sheet.png)

### 8. コメント編集中

起点: コメントアクションシート -> 編集

![コメント編集中](./screenshots/08-comment-editing.png)

### 9. グループ一覧

起点: 上部タブ -> グループ

![グループ一覧](./screenshots/09-groups-view.png)

### 10. グループ詳細モーダル

起点: グループ一覧 -> グループ行

![グループ詳細モーダル](./screenshots/10-group-detail.png)

### 11. グループ行メニュー

起点: グループ一覧 -> ･･･

![グループ行メニュー](./screenshots/11-group-menu.png)

### 12. メンバー管理モーダル

起点: グループ一覧 -> メンバー管理

![メンバー管理モーダル](./screenshots/12-manage-users.png)

### 13. 招待申請モーダル

起点: グループ一覧 -> 招待

![招待申請モーダル](./screenshots/13-invite-users.png)

### 14. グループ作成申請モーダル

起点: グループ一覧 -> グループ作成

![グループ作成申請モーダル](./screenshots/14-group-request.png)

### 15. 通知ビュー

起点: 上部タブ -> 通知

![通知ビュー](./screenshots/15-notifications-general.png)

### 16. 管理者向け通知ビュー

起点: 通知 -> 管理者向け通知タブ

![管理者向け通知ビュー](./screenshots/16-notifications-admin.png)

### 17. 設定ビュー

起点: 上部タブ -> 設定

![設定ビュー](./screenshots/17-settings-view.png)

### 18. 報告理由モーダル

起点: 投稿/コメント -> 通報

![報告理由モーダル](./screenshots/18-report-reason.png)

### 19. お知らせダイアログ

起点: `showAlert` 系

![お知らせダイアログ](./screenshots/19-app-dialog-alert.png)

### 20. 確認ダイアログ

起点: `showConfirm` 系

![確認ダイアログ](./screenshots/20-app-dialog-confirm.png)

### 21. 投稿編集ダイアログ

起点: 投稿メニュー -> 編集

![投稿編集ダイアログ](./screenshots/21-edit-post-dialog.png)

### 22. シェア投稿ダイアログ

起点: 投稿カード -> シェア

![シェア投稿ダイアログ](./screenshots/22-share-dialog.png)

### 23. 管理者向け報告一覧モーダル

起点: 通知 or 管理導線 -> 報告一覧

![管理者向け報告一覧モーダル](./screenshots/23-admin-reports.png)

### 24. ヘッダーバージョンポップアップ

起点: ヘッダー -> ロゴ長押し

![ヘッダーバージョンポップアップ](./screenshots/24-header-version-popup.png)

## 再生成

ローカルで HTTP サーバーを立てた状態で次を実行すると再生成できます。

```powershell
npm run capture:mock-flows
```
