import json

import threading
import time
import unittest
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from src.prototype_server import PrototypeServer


class PrototypeServerTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.server = PrototypeServer(host="127.0.0.1", port=0)
        host, port = cls.server.server_address
        cls.base_url = f"http://{host}:{port}"
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        time.sleep(0.05)

    @classmethod
    def tearDownClass(cls) -> None:
        cls.server.shutdown()
        cls.thread.join(timeout=1)


    def _post(self, path: str, payload: dict, headers: dict | None = None):
        data = json.dumps(payload).encode("utf-8")
        req = Request(self.base_url + path, data=data, method="POST")
        req.add_header("Content-Type", "application/json")
        for k, v in (headers or {}).items():
            req.add_header(k, v)

        return urlopen(req)


    def _get_json(self, path: str, headers: dict | None = None):
        req = Request(self.base_url + path)
        for k, v in (headers or {}).items():
            req.add_header(k, v)
        with urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8")), resp.status

    def test_full_flow_search_exclude_include(self) -> None:
        self._post(
            "/api/documents",
            {
                "doc_id": "doc-api-1",
                "title": "api sample",
                "content": "テキストテキストAAAテキスト",
                "thumbnail_url": "/thumb/doc-api-1",
                "source": "gdrive",
                "page_or_slide": "p1",
            },
        )

        rows, _ = self._get_json("/api/search?q=AAA")
        self.assertTrue(any(r["doc_id"] == "doc-api-1" for r in rows))
        self._post(
            "/api/documents/doc-api-1/exclude",
            {},
            headers={"X-Admin": "true", "X-Actor": "admin"},
        )
        rows_after_exclude, _ = self._get_json("/api/search?q=AAA")
        self.assertFalse(any(r["doc_id"] == "doc-api-1" for r in rows_after_exclude))
        self._post(
            "/api/documents/doc-api-1/include",
            {},
            headers={"X-Admin": "true"},
        )
        rows_after_include, _ = self._get_json("/api/search?q=AAA")
        self.assertTrue(any(r["doc_id"] == "doc-api-1" for r in rows_after_include))

    def test_admin_only_excluded_list(self) -> None:
        self._post(
            "/api/documents",
            {
                "doc_id": "doc-api-2",
                "title": "api sample 2",
                "content": "AAA",
                "thumbnail_url": "/thumb/doc-api-2",
                "source": "gdrive",
                "page_or_slide": "p1",
            },
        )
        self._post(
            "/api/documents/doc-api-2/exclude",
            {},
            headers={"X-Admin": "true", "X-Actor": "admin"},
        )

        req = Request(self.base_url + "/api/documents/excluded")
        with self.assertRaises(HTTPError) as cm:
            urlopen(req)
        self.assertEqual(403, cm.exception.code)

        rows, status = self._get_json("/api/documents/excluded", headers={"X-Admin": "true"})
        self.assertEqual(200, status)
        self.assertTrue(any(r["doc_id"] == "doc-api-2" for r in rows))


if __name__ == "__main__":
    unittest.main()
