import unittest

from src.prototype_search import InMemorySearchService


class InMemorySearchServiceTest(unittest.TestCase):
    def setUp(self) -> None:
        self.svc = InMemorySearchService(snippet_window=20)
        self.svc.add_or_update_document(
            doc_id="doc-1",
            title="sample",
            content="テキストテキストAAAテキスト",
            thumbnail_url="/thumb/doc-1/p1.png",
            source="gdrive",
            page_or_slide="p1",
        )

    def test_search_returns_highlighted_snippet_and_hit_positions(self) -> None:
        results = self.svc.search("AAA")

        self.assertEqual(1, len(results))
        self.assertIn("[AAA]", results[0]["snippet"])
        self.assertEqual([{"start": 8, "end": 11}], results[0]["hit_positions"])
        self.assertEqual("/thumb/doc-1/p1.png", results[0]["thumbnail_url"])

    def test_excluded_document_is_hidden_from_search(self) -> None:
        self.svc.exclude_document("doc-1", actor="admin-user", is_admin=True)

        results = self.svc.search("AAA")
        self.assertEqual([], results)

    def test_include_document_restores_search_result(self) -> None:
        self.svc.exclude_document("doc-1", actor="admin-user", is_admin=True)
        self.svc.include_document("doc-1", is_admin=True)

        results = self.svc.search("AAA")
        self.assertEqual(1, len(results))

    def test_excluded_list_is_admin_only(self) -> None:
        self.svc.exclude_document("doc-1", actor="admin-user", is_admin=True)

        with self.assertRaises(PermissionError):
            self.svc.list_excluded_documents(is_admin=False)

        rows = self.svc.list_excluded_documents(is_admin=True)
        self.assertEqual(1, len(rows))
        self.assertEqual("doc-1", rows[0]["doc_id"])

    def test_exclude_and_include_are_admin_only(self) -> None:
        with self.assertRaises(PermissionError):
            self.svc.exclude_document("doc-1", actor="viewer", is_admin=False)

        with self.assertRaises(PermissionError):
            self.svc.include_document("doc-1", is_admin=False)


if __name__ == "__main__":
    unittest.main()
