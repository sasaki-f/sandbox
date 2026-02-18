# OCR Search Prototype (Offline)

このリポジトリには、要件確認用のオフライン実装が入っています。

## 含まれるもの
- `src/prototype_search.py`
  - インメモリ検索サービス
  - 管理者限定の除外/除外解除/除外一覧
  - 検索結果 `snippet` / `hit_positions` / `thumbnail_url`
- `src/prototype_server.py`
  - 標準ライブラリだけで動くHTTP API + 簡易UI
- `tests/`
  - サービス層とAPI層のテスト

## 起動
```bash
python -m src.prototype_server
```

ブラウザで `http://127.0.0.1:8000` を開いてください。

## API
- `POST /api/documents`
- `GET /api/search?q=AAA`
- `POST /api/documents/{doc_id}/exclude` (`X-Admin: true` 必須)
- `POST /api/documents/{doc_id}/include` (`X-Admin: true` 必須)
- `GET /api/documents/excluded` (`X-Admin: true` 必須)

## テスト
```bash
python -m unittest discover -s tests -p 'test_*.py' -v
```
