from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import re
from typing import Dict, List, Optional


@dataclass
class DocumentRecord:
    doc_id: str
    title: str
    content: str
    thumbnail_url: str
    source: str
    page_or_slide: str
    is_deleted: bool = False
    is_excluded: bool = False
    excluded_at: Optional[datetime] = None
    excluded_by: Optional[str] = None


class InMemorySearchService:
    """Prototype implementation for exclusion + highlighted search results.

    This intentionally uses only the Python standard library so it can run
    offline and be used as a coding baseline for API integration.
    """

    def __init__(self, snippet_window: int = 40) -> None:
        self._docs: Dict[str, DocumentRecord] = {}
        self._snippet_window = snippet_window

    def add_or_update_document(
        self,
        doc_id: str,
        title: str,
        content: str,
        thumbnail_url: str,
        source: str,
        page_or_slide: str,
        is_deleted: bool = False,
    ) -> None:
        current = self._docs.get(doc_id)
        excluded = current.is_excluded if current else False
        excluded_at = current.excluded_at if current else None
        excluded_by = current.excluded_by if current else None
        self._docs[doc_id] = DocumentRecord(
            doc_id=doc_id,
            title=title,
            content=content,
            thumbnail_url=thumbnail_url,
            source=source,
            page_or_slide=page_or_slide,
            is_deleted=is_deleted,
            is_excluded=excluded,
            excluded_at=excluded_at,
            excluded_by=excluded_by,
        )

    def exclude_document(self, doc_id: str, actor: str, is_admin: bool) -> None:
        self._require_admin(is_admin)
        doc = self._require_doc(doc_id)
        doc.is_excluded = True
        doc.excluded_at = datetime.now(timezone.utc)
        doc.excluded_by = actor

    def include_document(self, doc_id: str, is_admin: bool) -> None:
        self._require_admin(is_admin)
        doc = self._require_doc(doc_id)
        doc.is_excluded = False
        doc.excluded_at = None
        doc.excluded_by = None

    def list_excluded_documents(self, is_admin: bool) -> List[dict]:
        self._require_admin(is_admin)
        excluded = [d for d in self._docs.values() if d.is_excluded]
        excluded.sort(key=lambda d: d.excluded_at or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
        return [
            {
                "doc_id": d.doc_id,
                "title": d.title,
                "source": d.source,
                "excluded_at": d.excluded_at.isoformat() if d.excluded_at else None,
                "excluded_by": d.excluded_by,
                "is_deleted": d.is_deleted,
            }
            for d in excluded
        ]

    def search(self, query: str) -> List[dict]:
        if not query:
            return []

        results: List[dict] = []
        for d in self._docs.values():
            if d.is_deleted or d.is_excluded:
                continue

            hit_positions = self._find_hit_positions(d.content, query)
            if not hit_positions:
                continue

            start, end = hit_positions[0]
            snippet = self._build_snippet(d.content, start, end)
            highlighted = self._highlight(snippet, query)
            results.append(
                {
                    "doc_id": d.doc_id,
                    "title": d.title,
                    "thumbnail_url": d.thumbnail_url,
                    "page_or_slide": d.page_or_slide,
                    "snippet": highlighted,
                    "hit_positions": [{"start": s, "end": e} for s, e in hit_positions],
                }
            )

        return results

    def _find_hit_positions(self, content: str, query: str) -> List[tuple[int, int]]:
        pattern = re.compile(re.escape(query), re.IGNORECASE)
        return [(m.start(), m.end()) for m in pattern.finditer(content)]

    def _build_snippet(self, content: str, start: int, end: int) -> str:
        left = max(0, start - self._snippet_window)
        right = min(len(content), end + self._snippet_window)
        prefix = "..." if left > 0 else ""
        suffix = "..." if right < len(content) else ""
        return f"{prefix}{content[left:right]}{suffix}"

    def _highlight(self, text: str, query: str) -> str:
        pattern = re.compile(re.escape(query), re.IGNORECASE)
        return pattern.sub(lambda m: f"[{m.group(0)}]", text)

    def _require_doc(self, doc_id: str) -> DocumentRecord:
        if doc_id not in self._docs:
            raise KeyError(f"document not found: {doc_id}")
        return self._docs[doc_id]

    @staticmethod
    def _require_admin(is_admin: bool) -> None:
        if not is_admin:
            raise PermissionError("admin role required")
