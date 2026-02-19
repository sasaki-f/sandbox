from __future__ import annotations


import json
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Callable, Dict, Optional
from urllib.parse import parse_qs, urlparse

from src.prototype_search import InMemorySearchService

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

  </style>
</head>
<body>
  <h1>OCR Search Prototype</h1>
  <div class=\"row\">
    <input id=\"q\" placeholder=\"検索語 (例: AAA)\" size=\"32\" />
    <button onclick=\"doSearch()\">検索</button>
    <label><input id=\"admin\" type=\"checkbox\" /> 管理者</label>

  </div>
  <div class=\"row\">
    <button onclick=\"seed()\">サンプル投入</button>
    <button onclick=\"showExcluded()\">除外一覧</button>
  </div>
  <div id=\"results\"></div>
  <script>
    function esc(text) {
      return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    }
    function highlightBracketed(text) {
      return esc(text).replace(/\[(.*?)\]/g, '<span class="marker">$1</span>');
    }
    function adminHeaders() {
      return document.getElementById('admin').checked ? {'X-Admin':'true','X-Actor':'admin-ui'} : {};
    }
    async function seed() {
      const docs = [
        {doc_id:'doc-1', title:'発表資料A', content:'テキストテキストAAAテキスト', thumbnail_url:'/thumb/doc-1', source:'gdrive', page_or_slide:'p1'},
        {doc_id:'doc-2', title:'発表資料B', content:'BBBを含む資料。AAAも含む。', thumbnail_url:'/thumb/doc-2', source:'gdrive', page_or_slide:'p2'}
      ];
      for (const d of docs) {
        await fetch('/api/documents', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(d)});
      }
      alert('サンプル投入完了');
    }
    async function doSearch() {
      const q = document.getElementById('q').value;
      const res = await fetch('/api/search?q=' + encodeURIComponent(q));
      const data = await res.json();
      const root = document.getElementById('results');
      root.innerHTML = '';
      if (data.length === 0) {
        root.innerHTML = '<p>結果なし</p>';
        return;
      }
      for (const r of data) {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
          <div class='line'>
            <div class='thumb'>thumb</div>
            <div>
              <div><b>${esc(r.title)}</b> (<code>${esc(r.doc_id)}</code>)</div>
              <div>${highlightBracketed(r.snippet)}</div>
              <div><small>hit_positions: ${esc(JSON.stringify(r.hit_positions))}</small></div>
            </div>
          </div>
          <div style='margin-top:8px;'>
            <button data-id='${esc(r.doc_id)}' class='exclude'>除外</button>
            <button data-id='${esc(r.doc_id)}' class='include'>除外解除</button>
          </div>
        `;
        root.appendChild(card);
      }
      document.querySelectorAll('.exclude').forEach(btn => btn.onclick = () => setExclude(btn.dataset.id, true));
      document.querySelectorAll('.include').forEach(btn => btn.onclick = () => setExclude(btn.dataset.id, false));
    }
    async function setExclude(docId, doExclude) {
      const path = doExclude ? `/api/documents/${docId}/exclude` : `/api/documents/${docId}/include`;
      const res = await fetch(path, {method:'POST', headers:{'Content-Type':'application/json', ...adminHeaders()}});
      if (!res.ok) {
        alert('権限不足またはエラー');
        return;
      }
      await doSearch();
    }
    async function showExcluded() {
      const res = await fetch('/api/documents/excluded', {headers: adminHeaders()});
      if (!res.ok) {
        alert('管理者のみ参照可');
        return;
      }
      const data = await res.json();
      alert(JSON.stringify(data, null, 2));
    }
  </script>
</body>
</html>
"""


def create_handler(service: InMemorySearchService) -> type[BaseHTTPRequestHandler]:

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:  # noqa: N802
            parsed = urlparse(self.path)
            if parsed.path == "/":
                self._send_html(INDEX_HTML)
                return

            if parsed.path == "/api/search":
                params = parse_qs(parsed.query)
                q = (params.get("q") or [""])[0]
                self._send_json(service.search(q))
                return

            if parsed.path == "/api/documents/excluded":
                try:
                    rows = service.list_excluded_documents(is_admin=self._is_admin())
                except PermissionError as exc:
                    self._send_json({"error": str(exc)}, status=HTTPStatus.FORBIDDEN)
                    return
                self._send_json(rows)
                return
            self._send_json({"error": "not found"}, status=HTTPStatus.NOT_FOUND)

        def do_POST(self) -> None:  # noqa: N802
            parsed = urlparse(self.path)

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
        self._server = ThreadingHTTPServer((host, port), create_handler(self.service))

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
