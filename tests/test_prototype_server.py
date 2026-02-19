import json
import shutil
import tempfile
import threading
import time
import unittest
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from src import prototype_server
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

    def _post_json(self, path: str, payload: dict, headers: dict | None = None):
        data = json.dumps(payload).encode("utf-8")
        req = Request(self.base_url + path, data=data, method="POST")
        req.add_header("Content-Type", "application/json")
        for k, v in (headers or {}).items():
            req.add_header(k, v)
        with urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8")), resp.status

    def _post_multipart_upload(self, filename: str, content: bytes, source: str):
        boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
        body = b""
        body += f"--{boundary}\r\n".encode()
        body += b'Content-Disposition: form-data; name="source"\r\n\r\n'
        body += source.encode("utf-8") + b"\r\n"
        body += f"--{boundary}\r\n".encode()
        body += f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'.encode()
        body += b"Content-Type: application/octet-stream\r\n\r\n"
        body += content + b"\r\n"
        body += f"--{boundary}--\r\n".encode()

        req = Request(self.base_url + "/api/upload", data=body, method="POST")
        req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
        with urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8")), resp.status

    def _get_json(self, path: str, headers: dict | None = None):
        req = Request(self.base_url + path)
        for k, v in (headers or {}).items():
            req.add_header(k, v)
        with urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8")), resp.status

    def test_settings_save_and_load(self) -> None:
        payload = {"gdrive_folder_path": "/tmp/gdrive-sync", "dropbox_folder_path": "/tmp/dropbox-sync"}
        _, status = self._post_json("/api/integrations/settings", payload)
        self.assertEqual(200, status)

        settings, status = self._get_json("/api/integrations/settings")
        self.assertEqual(200, status)
        self.assertEqual("/tmp/gdrive-sync", settings["gdrive_folder_path"])
        self.assertEqual("/tmp/dropbox-sync", settings["dropbox_folder_path"])

    def test_upload_then_search(self) -> None:
        up, status = self._post_multipart_upload("my_file.txt", "テキストテキストAAAテキスト".encode("utf-8"), "gdrive")
        self.assertEqual(200, status)
        self.assertIn("doc_id", up)
        self.assertTrue(Path(up["stored_path"]).exists())

        rows, _ = self._get_json("/api/search?q=AAA")
        self.assertTrue(any(r["doc_id"] == up["doc_id"] for r in rows))

    def test_upload_source_validation(self) -> None:
        boundary = "----BOUND"
        body = (
            f"--{boundary}\r\n"
            "Content-Disposition: form-data; name=\"source\"\r\n\r\n"
            "invalid\r\n"
            f"--{boundary}\r\n"
            "Content-Disposition: form-data; name=\"file\"; filename=\"x.txt\"\r\n"
            "Content-Type: text/plain\r\n\r\n"
            "AAA\r\n"
            f"--{boundary}--\r\n"
        ).encode("utf-8")
        req = Request(self.base_url + "/api/upload", data=body, method="POST")
        req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
        with self.assertRaises(HTTPError) as cm:
            urlopen(req)
        self.assertEqual(400, cm.exception.code)

    def test_sync_from_local_folders(self) -> None:
        tempdir = tempfile.mkdtemp(prefix="proto-sync-")
        try:
            gd = Path(tempdir) / "gdrive"
            db = Path(tempdir) / "dropbox"
            gd.mkdir(parents=True, exist_ok=True)
            db.mkdir(parents=True, exist_ok=True)
            (gd / "a.txt").write_text("HELLO AAA", encoding="utf-8")
            (db / "b.txt").write_text("DROPBOX AAA", encoding="utf-8")

            self._post_json(
                "/api/integrations/settings",
                {"gdrive_folder_path": str(gd), "dropbox_folder_path": str(db)},
            )
            synced, status = self._post_json("/api/integrations/sync", {})
            self.assertEqual(200, status)
            self.assertGreaterEqual(synced["synced_count"], 2)

            rows, _ = self._get_json("/api/search?q=AAA")
            ids = [r["doc_id"] for r in rows]
            self.assertTrue(any(i.startswith("gdrive-") for i in ids))
            self.assertTrue(any(i.startswith("dropbox-") for i in ids))
        finally:
            shutil.rmtree(tempdir, ignore_errors=True)

    def test_settings_persisted_file_created(self) -> None:
        self._post_json(
            "/api/integrations/settings",
            {"gdrive_folder_path": "/tmp/x", "dropbox_folder_path": "/tmp/y"},
        )
        self.assertTrue(prototype_server.SETTINGS_FILE.exists())

    def test_full_flow_search_exclude_include(self) -> None:
        self._post_json(
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

        self._post_json(
            "/api/documents/doc-api-1/exclude",
            {},
            headers={"X-Admin": "true", "X-Actor": "admin"},
        )
        rows_after_exclude, _ = self._get_json("/api/search?q=AAA")
        self.assertFalse(any(r["doc_id"] == "doc-api-1" for r in rows_after_exclude))

        self._post_json(
            "/api/documents/doc-api-1/include",
            {},
            headers={"X-Admin": "true"},
        )
        rows_after_include, _ = self._get_json("/api/search?q=AAA")
        self.assertTrue(any(r["doc_id"] == "doc-api-1" for r in rows_after_include))

    def test_admin_only_excluded_list(self) -> None:
        self._post_json(
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
        self._post_json(
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
