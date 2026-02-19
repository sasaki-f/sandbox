from __future__ import annotations

import cgi
import json
from dataclasses import dataclass, asdict
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Dict, Optional
from urllib.parse import parse_qs, urlparse
from uuid import uuid4

from src.prototype_search import InMemorySearchService


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
SETTINGS_FILE = DATA_DIR / "integration_settings.json"


@dataclass
class IntegrationSettings:
    gdrive_folder_path: str = ""
    dropbox_folder_path: str = ""


def _ensure_dirs() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def _load_settings() -> IntegrationSettings:
    _ensure_dirs()
    if not SETTINGS_FILE.exists():
        return IntegrationSettings()
    raw = json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
    return IntegrationSettings(
        gdrive_folder_path=str(raw.get("gdrive_folder_path", "")),
        dropbox_folder_path=str(raw.get("dropbox_folder_path", "")),
    )


def _save_settings(settings: IntegrationSettings) -> None:
    _ensure_dirs()
    SETTINGS_FILE.write_text(json.dumps(asdict(settings), ensure_ascii=False, indent=2), encoding="utf-8")


def _doc_id_from_filename(filename: str) -> str:
    stem = Path(filename).stem.strip().replace(" ", "-")
    safe = "".join(ch for ch in stem if ch.isalnum() or ch in ("-", "_"))
    return safe or f"doc-{uuid4().hex[:8]}"


def _extract_text(file_path: Path) -> str:
    try:
        return file_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        # Binary fallback: decode lossy to still allow rough search.
        return file_path.read_bytes().decode("utf-8", errors="ignore")


INDEX_HTML = """<!doctype html>
<html lang=\"ja\">
<head>
  <meta charset=\"utf-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
  <title>OCR Search Prototype</title>
  <style>
    body { font-family: sans-serif; margin: 24px; }
    .row { margin-bottom: 12px; }
    .card { border: 1px solid #ddd; padding: 12px; margin: 10px 0; border-radius: 8px; }
    .thumb { width: 96px; height: 96px; background: #f2f2f2; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; }
    .line { display: flex; align-items: center; }
    .marker { background: yellow; font-weight: bold; }
    button { margin-right: 8px; }
    code { background: #f7f7f7; padding: 1px 4px; }
    input[type='text'] { width: 420px; }
  </style>
</head>
<body>
  <h1>OCR Search Prototype (Local Working Mode)</h1>

  <h2>連携設定（ローカル同期フォルダ）</h2>
  <div class=\"row\">Google Drive 同期フォルダPATH: <input id=\"gdrive_folder_path\" type=\"text\" placeholder=\"/path/to/gdrive_sync\" /></div>
  <div class=\"row\">Dropbox 同期フォルダPATH: <input id=\"dropbox_folder_path\" type=\"text\" placeholder=\"/path/to/dropbox_sync\" /></div>
  <div class=\"row\"><button onclick=\"saveSettings()\">設定保存</button><button onclick=\"loadSettings()\">設定再読込</button><button onclick=\"syncFolders()\">同期フォルダ取込</button></div>

  <h2>ファイルアップロード（実ファイル）</h2>
  <div class=\"row\">
    <input id=\"upload_file\" type=\"file\" />
    <select id=\"upload_source\"><option value=\"gdrive\">gdrive</option><option value=\"dropbox\">dropbox</option></select>
    <button onclick=\"uploadFile()\">アップロード</button>
  </div>

  <h2>検索</h2>
  <div class=\"row\">
    <input id=\"q\" placeholder=\"検索語 (例: AAA)\" size=\"32\" />
    <button onclick=\"doSearch()\">検索</button>
    <label><input id=\"admin\" type=\"checkbox\" /> 管理者</label>
    <button onclick=\"showExcluded()\">除外一覧</button>
  </div>
  <div id=\"results\"></div>

  <script>
    function esc(text) { return (text || '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }
    function highlightBracketed(text) { return esc(text).replace(/\[(.*?)\]/g, '<span class="marker">$1</span>'); }
    function adminHeaders() { return document.getElementById('admin').checked ? {'X-Admin':'true','X-Actor':'admin-ui'} : {}; }

    async function loadSettings() {
      const res = await fetch('/api/integrations/settings');
      const data = await res.json();
      document.getElementById('gdrive_folder_path').value = data.gdrive_folder_path || '';
      document.getElementById('dropbox_folder_path').value = data.dropbox_folder_path || '';
    }

    async function saveSettings() {
      const payload = {
        gdrive_folder_path: document.getElementById('gdrive_folder_path').value,
        dropbox_folder_path: document.getElementById('dropbox_folder_path').value,
      };
      const res = await fetch('/api/integrations/settings', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      alert(res.ok ? '設定保存完了' : '設定保存失敗');
    }

    async function syncFolders() {
      const res = await fetch('/api/integrations/sync', { method:'POST' });
      const data = await res.json();
      if (!res.ok) { alert('同期失敗: ' + JSON.stringify(data)); return; }
      alert('同期完了: ' + JSON.stringify(data));
      await doSearch();
    }

    async function uploadFile() {
      const input = document.getElementById('upload_file');
      const file = input.files[0];
      if (!file) { alert('ファイルを選択してください'); return; }
      const form = new FormData();
      form.append('file', file);
      form.append('source', document.getElementById('upload_source').value);
      const res = await fetch('/api/upload', { method:'POST', body: form });
      const data = await res.json();
      if (!res.ok) { alert('アップロード失敗: ' + JSON.stringify(data)); return; }
      alert('アップロード完了: ' + data.doc_id);
      await doSearch();
    }

    async function doSearch() {
      const q = document.getElementById('q').value;
      const res = await fetch('/api/search?q=' + encodeURIComponent(q));
      const data = await res.json();
      const root = document.getElementById('results');
      root.innerHTML = '';
      if (data.length === 0) { root.innerHTML = '<p>結果なし</p>'; return; }
      for (const r of data) {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
          <div class='line'>
            <div class='thumb'>thumb</div>
            <div>
              <div><b>${esc(r.title)}</b> (<code>${esc(r.doc_id)}</code>)</div>
              <div>${highlightBracketed(r.snippet)}</div>
              <div><small>source: ${esc(r.source || '')}, hit_positions: ${esc(JSON.stringify(r.hit_positions))}</small></div>
            </div>
          </div>
          <div style='margin-top:8px;'>
            <button data-id='${esc(r.doc_id)}' class='exclude'>除外</button>
            <button data-id='${esc(r.doc_id)}' class='include'>除外解除</button>
          </div>`;
        root.appendChild(card);
      }
      document.querySelectorAll('.exclude').forEach(btn => btn.onclick = () => setExclude(btn.dataset.id, true));
      document.querySelectorAll('.include').forEach(btn => btn.onclick = () => setExclude(btn.dataset.id, false));
    }

    async function setExclude(docId, doExclude) {
      const path = doExclude ? `/api/documents/${docId}/exclude` : `/api/documents/${docId}/include`;
      const res = await fetch(path, {method:'POST', headers:{'Content-Type':'application/json', ...adminHeaders()}});
      if (!res.ok) { alert('権限不足またはエラー'); return; }
      await doSearch();
    }

    async function showExcluded() {
      const res = await fetch('/api/documents/excluded', {headers: adminHeaders()});
      if (!res.ok) { alert('管理者のみ参照可'); return; }
      const data = await res.json();
      alert(JSON.stringify(data, null, 2));
    }

    loadSettings();
  </script>
</body>
</html>
"""


def create_handler(service: InMemorySearchService, settings: IntegrationSettings) -> type[BaseHTTPRequestHandler]:
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:  # noqa: N802
            parsed = urlparse(self.path)
            if parsed.path == "/":
                self._send_html(INDEX_HTML)
                return

            if parsed.path == "/api/search":
                params = parse_qs(parsed.query)
                q = (params.get("q") or [""])[0]
                rows = service.search(q)
                self._send_json(rows)
                return

            if parsed.path == "/api/documents/excluded":
                try:
                    rows = service.list_excluded_documents(is_admin=self._is_admin())
                except PermissionError as exc:
                    self._send_json({"error": str(exc)}, status=HTTPStatus.FORBIDDEN)
                    return
                self._send_json(rows)
                return

            if parsed.path == "/api/integrations/settings":
                self._send_json(asdict(settings))
                return

            self._send_json({"error": "not found"}, status=HTTPStatus.NOT_FOUND)

        def do_POST(self) -> None:  # noqa: N802
            parsed = urlparse(self.path)

            if parsed.path == "/api/integrations/settings":
                body = self._read_json_body()
                settings.gdrive_folder_path = str(body.get("gdrive_folder_path", "")).strip()
                settings.dropbox_folder_path = str(body.get("dropbox_folder_path", "")).strip()
                _save_settings(settings)
                self._send_json({"ok": True, "settings": asdict(settings)})
                return

            if parsed.path == "/api/integrations/sync":
                synced = self._sync_from_configured_folders()
                self._send_json({"ok": True, "synced_count": synced})
                return

            if parsed.path == "/api/upload":
                try:
                    result = self._handle_multipart_upload()
                except ValueError as exc:
                    self._send_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
                    return
                self._send_json({"ok": True, **result})
                return

            body = self._read_json_body()
            if parsed.path == "/api/documents":
                required = ["doc_id", "title", "content", "thumbnail_url", "source", "page_or_slide"]
                missing = [k for k in required if k not in body]
                if missing:
                    self._send_json({"error": f"missing keys: {', '.join(missing)}"}, status=HTTPStatus.BAD_REQUEST)
                    return
                service.add_or_update_document(
                    doc_id=body["doc_id"],
                    title=body["title"],
                    content=body["content"],
                    thumbnail_url=body["thumbnail_url"],
                    source=body["source"],
                    page_or_slide=body["page_or_slide"],
                    is_deleted=bool(body.get("is_deleted", False)),
                )
                self._send_json({"ok": True})
                return

            if parsed.path.startswith("/api/documents/") and parsed.path.endswith("/exclude"):
                doc_id = parsed.path.split("/")[3]
                try:
                    service.exclude_document(doc_id, actor=self.headers.get("X-Actor", "admin"), is_admin=self._is_admin())
                except PermissionError as exc:
                    self._send_json({"error": str(exc)}, status=HTTPStatus.FORBIDDEN)
                    return
                except KeyError as exc:
                    self._send_json({"error": str(exc)}, status=HTTPStatus.NOT_FOUND)
                    return
                self._send_json({"ok": True})
                return

            if parsed.path.startswith("/api/documents/") and parsed.path.endswith("/include"):
                doc_id = parsed.path.split("/")[3]
                try:
                    service.include_document(doc_id, is_admin=self._is_admin())
                except PermissionError as exc:
                    self._send_json({"error": str(exc)}, status=HTTPStatus.FORBIDDEN)
                    return
                except KeyError as exc:
                    self._send_json({"error": str(exc)}, status=HTTPStatus.NOT_FOUND)
                    return
                self._send_json({"ok": True})
                return

            self._send_json({"error": "not found"}, status=HTTPStatus.NOT_FOUND)

        def _sync_from_configured_folders(self) -> int:
            total = 0
            for source, path_str in (("gdrive", settings.gdrive_folder_path), ("dropbox", settings.dropbox_folder_path)):
                if not path_str:
                    continue
                root = Path(path_str).expanduser().resolve()
                if not root.exists() or not root.is_dir():
                    continue
                for file_path in root.rglob("*"):
                    if not file_path.is_file():
                        continue
                    content = _extract_text(file_path)
                    if not content.strip():
                        continue
                    rel = file_path.relative_to(root)
                    doc_id = f"{source}-{_doc_id_from_filename(str(rel))}"
                    service.add_or_update_document(
                        doc_id=doc_id,
                        title=rel.name,
                        content=content,
                        thumbnail_url=f"/thumb/{doc_id}",
                        source=source,
                        page_or_slide="p1",
                    )
                    total += 1
            return total

        def _handle_multipart_upload(self) -> Dict[str, str]:
            content_type = self.headers.get("Content-Type", "")
            if "multipart/form-data" not in content_type:
                raise ValueError("multipart/form-data required")

            form = cgi.FieldStorage(fp=self.rfile, headers=self.headers, environ={"REQUEST_METHOD": "POST"})
            source = str(form.getfirst("source", "gdrive"))
            if source not in ("gdrive", "dropbox"):
                raise ValueError("source must be gdrive or dropbox")

            upload = form["file"] if "file" in form else None
            if upload is None or not getattr(upload, "filename", ""):
                raise ValueError("file is required")

            filename = Path(str(upload.filename)).name
            data = upload.file.read()
            if not isinstance(data, bytes):
                data = bytes(data)
            _ensure_dirs()
            file_id = uuid4().hex
            stored_name = f"{file_id}_{filename}"
            stored_path = UPLOADS_DIR / stored_name
            stored_path.write_bytes(data)

            content = data.decode("utf-8", errors="ignore")
            doc_id = f"upload-{_doc_id_from_filename(filename)}-{file_id[:6]}"
            service.add_or_update_document(
                doc_id=doc_id,
                title=filename,
                content=content,
                thumbnail_url=f"/thumb/{doc_id}",
                source=source,
                page_or_slide="p1",
            )
            return {"doc_id": doc_id, "stored_path": str(stored_path)}

        def log_message(self, fmt: str, *args: Any) -> None:
            return

        def _is_admin(self) -> bool:
            return self.headers.get("X-Admin", "").lower() == "true"

        def _read_json_body(self) -> Dict[str, Any]:
            length = int(self.headers.get("Content-Length", "0"))
            if length == 0:
                return {}
            raw = self.rfile.read(length)
            return json.loads(raw.decode("utf-8"))

        def _send_json(self, data: Any, status: HTTPStatus = HTTPStatus.OK) -> None:
            payload = json.dumps(data, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

        def _send_html(self, html: str, status: HTTPStatus = HTTPStatus.OK) -> None:
            payload = html.encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

    return Handler


class PrototypeServer:
    def __init__(self, host: str = "127.0.0.1", port: int = 8000, service: Optional[InMemorySearchService] = None) -> None:
        self.service = service or InMemorySearchService()
        self.settings = _load_settings()
        self._server = ThreadingHTTPServer((host, port), create_handler(self.service, self.settings))

    @property
    def server_address(self) -> tuple[str, int]:
        host, port = self._server.server_address
        return str(host), int(port)

    def serve_forever(self) -> None:
        self._server.serve_forever()

    def shutdown(self) -> None:
        self._server.shutdown()
        self._server.server_close()


def run() -> None:
    server = PrototypeServer()
    host, port = server.server_address
    print(f"Prototype server running at http://{host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.shutdown()


if __name__ == "__main__":
    run()
