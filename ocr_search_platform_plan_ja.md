# 学会資料OCR検索システム 設計案

## 1. 目的
- 学会資料（PDF / Word / PowerPoint / Excel）を Google Drive / Dropbox にアップロードするだけで、内容をOCR＋テキスト抽出して全文検索できるようにする。
- ファイル本文だけでなく、発表者名・学会名・開催年・セッション名などのメタデータでも検索できるようにする。

## 2. 全体アーキテクチャ
1. **ストレージ連携層**
   - Google Drive API / Dropbox API で対象フォルダを監視（Webhook + 定期同期）。
   - 新規・更新ファイルを検知し、処理キューに投入。
2. **前処理・変換層**
   - MIMEタイプ判定、ページ分割、画像化、文字抽出可否チェック（PDFテキスト埋め込み有無）。
3. **OCR/抽出層**
   - テキスト埋め込みPDF: 直接抽出。
   - スキャンPDF・画像: OCR（日本語＋英語）。
   - Word/PowerPoint/Excel: 構造を保持しつつテキスト抽出し、必要なら画像部分のみOCR。
4. **検索インデックス層**
   - OpenSearch / Elasticsearch に全文とメタデータを格納。
   - 必要に応じてベクトルDB（ハイブリッド検索）を追加。
5. **検索UI/API層**
   - キーワード検索、絞り込み、ハイライト表示、原本へのリンク。
6. **運用層**
   - 再処理ジョブ、失敗リトライ、監査ログ、権限管理。

## 3. 推奨技術スタック（例）
- **バックエンド**: Python (FastAPI)
- **非同期ジョブ**: Celery / RQ + Redis
- **OCR**:
  - まずは Tesseract（検証）
  - 本番は Google Document AI / Azure AI Document Intelligence / AWS Textract の比較採用
- **文書抽出**:
  - PDF: pypdf / pdfplumber
  - Office: python-docx, python-pptx, openpyxl
- **検索**: OpenSearch
- **認証認可**: Google OAuth / Dropbox OAuth + アプリ内RBAC
- **インフラ**: Docker + Cloud Run / ECS / Kubernetes

## 4. Google Drive / Dropbox 連携設計（具体）

### 4-1. Google Drive 連携
- 使うAPI: Google Drive API v3（Changes API + Files API）
- 認可方式: OAuth 2.0（推奨スコープ: `drive.readonly`）
- 監視方式:
  - 初回同期: 対象フォルダ配下を全件列挙し、`file_id` / `modifiedTime` を保存
  - 差分同期: `changes.getStartPageToken` と `changes.list` で更新分のみ取得
  - 即時通知: `files.watch`（Webhook）を利用し、通知受信後に差分同期を実行
- 取得メタデータ例:
  - `id`, `name`, `mimeType`, `modifiedTime`, `owners`, `parents`, `webViewLink`
- ダウンロード:
  - Google Docs系は `files.export`（PDFまたはテキスト）
  - バイナリは `files.get?alt=media`

### 4-2. Dropbox 連携
- 使うAPI: Dropbox API v2（Files API + List Folder Longpoll）
- 認可方式: OAuth 2.0（Scoped app）
- 監視方式:
  - 初回同期: `/files/list_folder` を再帰で実行
  - 差分同期: `/files/list_folder/continue` でカーソル追跡
  - 擬似リアルタイム: `/files/list_folder/longpoll` で更新検知
- 取得メタデータ例:
  - `id`, `path_display`, `name`, `server_modified`, `content_hash`
- ダウンロード:
  - `/files/download`

### 4-3. 共通イベント処理（Drive/Dropbox）
1. 更新イベント受信（Webhook or longpoll検知）
2. ファイルメタデータ取得
3. 既存インデックスの `source + external_file_id + modified_time/hash` と比較
4. 新規/更新時のみダウンロード
5. 抽出/OCRジョブをキュー投入
6. インデックス更新（成功時に同期カーソル更新）
7. 失敗時はDLQ（Dead Letter Queue）へ退避し再実行

### 4-4. 重複処理防止と整合性
- 冪等キー: `source:external_file_id:version`（Driveは`modifiedTime`、Dropboxは`content_hash`）
- ロック: 同一キー処理中は重複ワーカー起動を抑止
- 削除イベント:
  - 論理削除フラグ `is_deleted=true` をインデックスに反映
  - 一定期間後に物理削除

## 5. ファイル種別ごとの処理方針
- **PDF**:
  - `is_text_pdf` 判定 → trueなら抽出、falseならOCR。
- **Word（.docx）**:
  - 段落・表・ヘッダを抽出、画像埋め込み部分はOCR。
- **PowerPoint（.pptx）**:
  - スライド単位でテキスト抽出、図表画像はOCR。
- **Excel（.xlsx）**:
  - シート名・セル座標付きで抽出（検索結果に「どのシートのどのセルか」を表示）。

## 6. インデックス設計（最低限）
- `doc_id`
- `source`（gdrive / dropbox）
- `external_file_id`
- `source_path`
- `file_type`
- `title`
- `authors`
- `conference`
- `year`
- `slide_or_page`
- `content`（全文）
- `content_ja_normalized`（NFKCや表記ゆれ正規化後）
- `web_link`（Drive/Dropbox原本URL）
- `version`（modified_time or content_hash）
- `updated_at`
- `acl`（閲覧可能ユーザー/グループ）
- `is_deleted`

## 7. 連携API（アプリ側）最低定義
- `POST /integrations/google-drive/connect`
  - OAuth開始URLを発行
- `GET /integrations/google-drive/callback`
  - OAuthコード交換・トークン保存
- `POST /integrations/google-drive/webhook`
  - Drive通知受信（署名/チャネル検証）
- `POST /integrations/dropbox/connect`
  - OAuth開始URLを発行
- `GET /integrations/dropbox/callback`
  - OAuthコード交換・トークン保存
- `POST /integrations/dropbox/webhook`（またはlongpollワーカー起動API）
  - Dropbox更新検知をトリガー
- `POST /sync/run`
  - 手動同期
- `GET /sync/status/{job_id}`
  - 同期ジョブ状態確認

## 8. 検索体験（最低要件）
- キーワード検索（AND/OR）
- ファイル種別フィルタ
- 年度・学会名フィルタ
- ハイライト表示
- 原文プレビュー（ページ/スライド/セル単位）
- 原本（Drive/Dropbox）へのリンク

## 9. セキュリティ・ガバナンス
- OAuthトークンの安全保管（Secrets Manager）
- ストレージ側ACLを検索結果にも反映（権限のない文書はヒットさせない）
- 監査ログ（誰が何を検索・閲覧したか）
- 個人情報を含む文書向けのマスキング方針
- Webhookエンドポイントの署名検証・リプレイ対策

## 10. PoC（4〜6週間）ロードマップ
1. **Week 1**: 要件定義・対象フォルダ決定・サンプル文書収集
2. **Week 2**: Google Drive連携（OAuth + 差分同期） + PDF抽出
3. **Week 3**: Dropbox連携 + Office抽出 + OCR統合
4. **Week 4**: OpenSearchインデックス作成 + 検索API/UI最小版
5. **Week 5-6**: 権限制御、精度改善（辞書・前処理・再OCRルール）、運用設計

## 11. 概算コスト観点
- OCRは従量課金のため、**1ページ当たり単価 × 月間ページ数**で見積もる。
- まずはサンプル1000〜5000ページで実測し、
  - OCR精度
  - 処理時間
  - 1文書あたりコスト
  を比較して採用サービスを決める。

## 12. 最初の実装ステップ（実務向け）
- 先に **PDF + Google Drive連携（OAuth/差分同期/Webhook）** でPoCを作る。
- 次にDropbox連携（cursor/longpoll）を追加する。
- その後、Officeファイル抽出・辞書登録（学会固有用語）・ベクトル検索を導入する。

---

必要であれば次に、
- FastAPIの雛形コード（Drive/Dropbox OAuth・Webhook受信）
- OpenSearchマッピングJSON
- 非同期ジョブ（Celery）構成例
まで具体化できます。


## 13. 「サーバーレスでDrive/Dropbox上で動かす」要件への回答
- **結論**: サーバーレス構成は可能です。
- ただし **Google Drive / Dropboxの“中で”アプリを実行することは基本できません**。
  - Drive/Dropboxはストレージであり、任意のOCR検索バックエンド実行環境ではないためです。
- 実運用は、
  - Drive/Dropbox = データ保存先
  - GCP/AWS/Azureのサーバーレス = 処理実行基盤
  という分離構成にします。

### 13-1. 代表的なサーバーレス構成例（GCP）
1. Drive Webhook受信: Cloud Run
2. Dropbox更新検知: Cloud Run Job（longpoll）
3. 同期キュー: Pub/Sub
4. OCR処理: Cloud Run / Cloud Functions + Document AI
5. インデックス: OpenSearch（またはVertex AI Search）
6. メタデータDB: Firestore
7. 認証: Identity Platform / Google OAuth

### 13-2. 代表的なサーバーレス構成例（AWS）
1. Webhook受信: API Gateway + Lambda
2. 同期オーケストレーション: EventBridge + SQS
3. OCR: Lambda + Textract
4. インデックス: OpenSearch Service
5. メタデータDB: DynamoDB
6. 機密情報: Secrets Manager

### 13-3. 「できるだけDrive側で完結」したい場合
- Google Drive限定なら、Google Apps Scriptで
  - Driveイベント起点
  - 外部OCR API呼び出し
  - 検索用インデックスAPI連携
  は可能です。
- ただし、
  - 実行時間制限
  - 大量ファイル処理
  - 高度な再試行・監視
  の面で制約があるため、本番はCloud Run/Lambda中心を推奨します。

### 13-4. 最小実装の推奨
- Step 1: Google Drive + Cloud Run + Document AI + OpenSearch
- Step 2: Dropboxを同じイベントパイプラインに追加
- Step 3: 権限同期と運用監視を強化

## 14. サーバーレス + Windowsアプリ構成
- **結論**: 「Windowsアプリとして利用」しつつ、処理基盤をサーバーレスにする構成は可能です。
- 構成の考え方:
  - Windowsアプリ（UI）: 検索画面・設定画面・同期状況表示
  - サーバーレスAPI（クラウド）: OAuth連携、同期ジョブ、OCR、検索API
  - Drive/Dropbox: 原本保存

### 14-1. Windowsアプリの実装候補
- フレームワーク候補:
  - .NET 8 + WPF（業務アプリ向け）
  - .NET 8 + WinUI 3（新規UI）
  - Electron（Web技術中心）
- Windowsアプリ側の責務:
  - ログイン（OIDC）
  - 検索条件入力、結果表示、ハイライト表示
  - Drive/Dropbox原本を既定ブラウザで開く
  - 同期ステータス確認（ジョブID単位）
- サーバーレス側の責務:
  - `/search` API
  - `/integrations/*` API
  - OCRパイプライン・再処理・監査ログ

### 14-2. 配布・運用
- MSIXまたはインストーラで配布
- アプリ設定（APIエンドポイント、テナントID）は外部設定ファイルで差し替え
- バージョン更新は自動更新（Squirrel / MSIX更新）を推奨

## 15. Drive/Dropboxで「削除・変更」が起きたときの対応設計

### 15-1. 変更（更新）検知
- Drive:
  - `changes.list` で変更イベント取得
  - `fileId` と `modifiedTime` を比較
- Dropbox:
  - `list_folder/continue` で変更イベント取得
  - `id` と `content_hash` を比較
- 対応方針:
  1. 変更イベント受信
  2. 既存`version`と比較
  3. 変更ありなら再抽出・再OCR
  4. インデックスをupsert更新

### 15-2. 削除検知
- Drive:
  - Changes APIの`removed=true`を検知
- Dropbox:
  - `DeletedMetadata` を検知
- 対応方針:
  1. 削除イベント受信
  2. インデックスを `is_deleted=true` に更新
  3. 検索結果には表示しない
  4. 保持期間経過後に物理削除（監査要件次第）

### 15-3. リネーム・移動対応
- 外部ID（`external_file_id`）を主キー運用し、`source_path`は属性として更新
- リネーム/移動時は再OCR不要、メタデータ更新のみ

### 15-4. 競合・一時失敗時の運用
- APIレート制限時: exponential backoff + jitter
- OCR失敗時: DLQへ移送し、管理画面から再実行
- 通知取りこぼし対策:
  - 日次フル差分整合ジョブ（spot-check）
  - カーソル不整合時は安全側で再同期

### 15-5. 追加しておくべきAPI
- `POST /sync/reconcile`
  - 差分不整合時の再同期ジョブ起動
- `POST /documents/{doc_id}/reindex`
  - 単一文書の再OCR/再インデックス
- `DELETE /documents/{doc_id}`
  - 管理者による即時論理削除

## 16. OCRデータはどこに蓄積されるか
- **基本方針**: OCR結果は1か所ではなく、用途別に分けて保存します。

### 16-1. 保存先の分離
1. **検索インデックス（OpenSearch）**
   - 保存内容: 検索用テキスト（`content`）、正規化テキスト、メタデータ
   - 用途: 高速検索・ハイライト
2. **メタデータDB（Firestore / DynamoDB など）**
   - 保存内容: `doc_id`, `external_file_id`, `version`, 同期状態, 最終処理時刻, エラー情報
   - 用途: 同期制御・再処理管理
3. **オブジェクトストレージ（GCS / S3）**
   - 保存内容: OCR生データ（JSON）、ページ画像、抽出中間ファイル（必要な場合のみ）
   - 用途: 監査、再解析、モデル改善

### 16-2. どのデータを「残す」か
- 最小構成（コスト重視）:
  - OpenSearchに検索用テキストのみ保持
  - 中間画像/OCR生JSONは保持しない、または短期TTLで自動削除
- 監査重視構成:
  - OCR生JSONと処理ログを30〜180日保持
  - 再現性が必要な文書のみ長期保存

### 16-3. 削除・更新時のデータ整合
- 元ファイル更新時:
  - 新`version`で再OCRし、インデックスをupsert
  - 古いOCR生データは世代管理 or TTL削除
- 元ファイル削除時:
  - 検索インデックスは `is_deleted=true`
  - オブジェクトストレージのOCR生データもポリシーに従って削除
  - 監査要件がある場合はメタデータのみ保持

### 16-4. セキュリティ
- OCRテキストは機微情報を含む可能性があるため、
  - 保存時暗号化（KMS）
  - 転送時TLS
  - RBAC/監査ログ
  を必須にする。

## 17. OCRは有料か？（費用の考え方）
- **結論**: 
  - TesseractなどのOSS OCRエンジンは**ライセンス無料**です。
  - Google Document AI / Azure Document Intelligence / AWS Textract などのクラウドOCRは**基本的に有料（従量課金）**です。

### 17-1. 無料OCRと有料OCRの違い
- 無料（OSS）OCR:
  - 初期費用を抑えやすい
  - ただし運用コスト（サーバー、チューニング、保守）が発生
  - 日本語帳票や複雑レイアウトは精度調整が必要になりやすい
- 有料クラウドOCR:
  - APIですぐ使える、スケールしやすい
  - ただしページ数に応じて課金
  - 構造化抽出（表、フォーム）機能が充実

### 17-2. 実務上のおすすめ
- PoC段階:
  - 小規模データでOSS + クラウドOCRを並行比較
- 本番段階:
  - **精度要件**と**月間ページ数**で採用判断
  - 目安式: `月額OCR費 = 1ページ単価 × OCRページ数`

### 17-3. コスト最適化の基本
- テキスト埋め込みPDFはOCRをスキップ（抽出のみ）
- 変更がないファイルは再OCRしない（`version`比較）
- OCR生データはTTLで自動削除（必要分のみ保持）
- 高精度OCRは必要文書だけに限定

## 18. 無料で使用したい場合の推奨構成
- **結論**: 可能です。クラウドOCRを使わず、OSS中心で構成します。

### 18-1. 無料構成（実装例）
- OCR: Tesseract（日本語 `jpn` + 英語 `eng`）
- 文書抽出: pypdf / pdfplumber / python-docx / python-pptx / openpyxl
- 検索: OpenSearch（セルフホスト）または PostgreSQL + pg_trgm
- API: FastAPI
- 非同期処理: Celery + Redis（またはRQ）
- 実行環境: Windows PC 1台 or 社内VM（Docker可）

### 18-2. 無料運用時の注意点
- ライセンス費は0円でも、以下は必要です:
  - サーバー/PCの運用コスト（電気代・保守）
  - バックアップ運用
  - OCR精度改善の作業工数
- 特に日本語のスキャン品質が低い資料は、
  - 前処理（傾き補正・ノイズ除去・二値化）
  を入れないと精度が落ちやすい。

### 18-3. 無料で精度を上げる実践策
- PDF内テキストが取れる場合はOCRしない（抽出優先）
- OCR対象を絞る（画像ページのみ）
- 学会用語辞書を作り、検索時に同義語展開
- 低信頼ページのみ再OCR（全件再処理しない）

### 18-4. 段階的移行（無料→有料）
- Step 1: 全面無料構成でPoC
- Step 2: 精度不足の文書タイプだけ有料OCRへ部分移行
- Step 3: 費用対効果が確認できたら対象範囲を拡大

## 19. 追加要件: インデックス除外機能と除外リスト管理

### 19-1. 要件定義
- ユーザーが任意のファイルを「インデックス対象外」にできること。
- 除外したファイルの一覧を、管理画面からいつでも確認できること。
- 除外中のファイルは検索結果に表示しないこと。
- 除外解除した場合は再インデックスできること。

### 19-2. データモデル拡張（最低限）
- 既存メタデータに以下を追加:
  - `is_excluded` (bool): インデックス除外状態
  - `excluded_at` (datetime|null): 除外日時
  - `excluded_by` (string|null): 操作者
- 既存の `is_deleted` とは別管理にする（削除と除外は意味が異なるため）。
- **権限制御**: 除外/除外解除操作は管理者ロールのみ実行可能にする。

### 19-3. API案
- `POST /documents/{doc_id}/exclude`
  - 対象ファイルを除外状態にする（`is_excluded=true`）
  - 検索インデックスからは非表示化（論理除外）
- `POST /documents/{doc_id}/include`
  - 除外解除（`is_excluded=false`）
  - 必要に応じて再抽出・再インデックスをジョブ投入
- `GET /documents/excluded`
  - 除外ファイル一覧を返す（ページング・ソート・フィルタ対応）
  - 一般ユーザーには閲覧不可、管理者のみ参照可能

### 19-4. 同期イベント時の挙動（Drive/Dropbox連携時）
- 除外中ファイルに更新イベントが来た場合:
  - デフォルト方針は「ダウンロード/再OCRをスキップ」
  - ただしメタデータ（更新時刻、パス変更）は追跡して整合性を維持
- 除外中ファイルが削除された場合:
  - `is_deleted=true` を反映し、除外リスト上でも状態表示（削除済み）

### 19-5. UI要件（Windowsアプリ）
- 検索結果行に「除外」「除外解除」アクションを表示（管理者のみ）
- 「除外ファイル一覧」画面を追加し、以下を表示:
  - ファイル名、保存元（Drive/Dropbox）、除外日時、最終更新時刻、現在状態（有効/削除）
- 一括操作:
  - 複数選択で除外解除
  - 条件絞り込み（保存元、期間、操作者）

## 20. 追加要件: 検索結果のサムネイル・マーカー・前後文表示

### 20-1. 表示要件
- 各検索結果カードに以下を表示:
  1. ファイルサムネイル（1検索結果=1枚、代表ヒット位置のページ/スライド/シートを表示）
  2. ヒット箇所のハイライト（マーカー）
  3. ヒット前後のスニペット（前後文脈）
  4. 原本を開くリンク（Drive/Dropboxの `web_link`）

### 20-1-1. マーカー表示の具体
- マーカーは**文字列そのもの**を強調する方式にする。
- 例: 本文が `テキストテキストAAAテキスト` で検索語が `AAA` の場合、
  - `テキストテキスト[AAA]テキスト` のように `AAA` 部分だけをマーカー表示する。
- PDF座標ベースの矩形ハイライトは必須要件にしない（将来拡張）。

### 20-2. インデックス設計の追加項目
- `snippets[]`: ヒット候補となる短文（前後文を含む）
- `hit_positions[]`: 文字オフセット（開始/終了）
- `preview_asset_path`: サムネイル画像の保存先
- `page_or_slide`: ヒット位置（ページ番号/スライド番号/シート名+セル）

### 20-3. 生成パイプライン（概要）
1. 抽出/OCR後に文を分割し、検索用に正規化
2. ページ/スライド単位でサムネイルを生成し保存
3. 検索時にマッチ位置を計算し、前後N文字のスニペットを生成
4. UIへ `thumbnail + highlight_range + snippet` を返す

### 20-4. 実装時の注意
- OCR誤認識に備えて、完全一致だけでなく部分一致・あいまい一致も併用
- 大きい文書はサムネイル事前生成で表示性能を確保
- 権限未保有ユーザーにはサムネイル/スニペットも返さない（情報漏えい防止）

## 21. 原因調査（前回うまく反映されなかった理由）と次の手順

### 21-1. 原因調査（リポジトリ内の事実ベース）
- 現在の設計書は「無料OCR構成（18章）」までで、
  - インデックス除外機能
  - 除外リスト確認機能
  - サムネイル+マーカー+前後文表示要件
  が未記載だった。
- そのため、後続のユーザー要望（TURN_9以降）に対する仕様差分がドキュメントに反映されず、次の実装判断がしづらい状態になっていた。

### 21-2. 次の手順案（実装着手順）
1. **仕様凍結（この文書）**
   - 19章・20章の要件で合意を取る。
2. **API最小実装**
   - `exclude/include/list` の3APIを先行実装。
3. **検索レスポンス拡張**
   - `snippet`, `highlight_range`, `thumbnail_url` を返す。
4. **Windows UI反映**
   - 検索結果カードにサムネイル+ハイライト+前後文表示を追加。
   - 除外一覧画面を追加。
5. **同期連携の整合性確認**
   - 除外中更新・削除時の動作をテストケース化。

### 21-3. 不足情報（要確認）
- 本ドキュメントでは以下で仕様確定とする。
  - サムネイル: 1検索結果につき1枚（代表ヒット）
  - マーカー: 検索語文字列そのものをハイライト（例: `AAA` のみ）
  - 除外操作: 管理者限定
  - 除外理由: 入力不要（項目を持たない）

## 22. この仕様でまず作るための実装スコープ（MVP）

### 22-1. MVP対象（最小）
- まずは **Google Drive + PDF** を対象に先行実装する。
- 実装範囲:
  1. 取り込み・抽出・OCR・インデックス登録
  2. 検索API（キーワード検索）
  3. 検索結果での「1件1枚サムネイル + ヒット文字列マーカー + 前後文スニペット」表示
  4. 管理者限定の除外/除外解除/除外一覧

### 22-2. 実装タスク分解
1. **バックエンド（API）**
   - `POST /documents/{doc_id}/exclude`（管理者のみ）
   - `POST /documents/{doc_id}/include`（管理者のみ）
   - `GET /documents/excluded`（管理者のみ）
   - `GET /search` のレスポンスに `thumbnail_url`, `snippet`, `hit_positions` を追加
2. **インデックス更新**
   - `is_excluded` を検索フィルタに組み込み、`true` は検索結果から除外
   - `hit_positions` は文字オフセット（開始/終了）で保持
3. **表示データ生成**
   - サムネイルは代表ヒットページを1枚生成
   - スニペットはヒット前後N文字（例: 前後40文字）で生成
   - マーカーは検索語と一致した文字列だけを強調
4. **Windows UI**
   - 検索結果カードにサムネイル・マーカー・前後文表示
   - 管理者ログイン時のみ除外操作ボタンを表示
   - 「除外ファイル一覧」画面を追加

### 22-3. 受け入れ基準（Definition of Done）
- 検索語 `AAA` で `テキストテキストAAAテキスト` がヒットしたとき、`AAA` 部分のみマーカー表示される。
- 除外したファイルは検索結果に表示されない。
- 除外一覧に対象ファイルが表示され、除外解除で再表示可能になる。
- 一般ユーザーでは除外API・除外一覧APIが使えず、管理者のみ利用できる。

### 22-4. 実装順（推奨）
1. API + 権限制御
2. インデックスの `is_excluded` 連携
3. 検索レスポンス（snippet/hit_positions/thumbnail_url）
4. UI反映
5. E2E確認（除外→検索非表示→除外解除→検索再表示）
