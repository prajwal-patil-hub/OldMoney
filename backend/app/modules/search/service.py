from __future__ import annotations

from typing import Any
from uuid import UUID

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

log = structlog.get_logger(__name__)

SUPPORTED_TYPES = {"portfolio", "account", "asset", "transaction"}


class SearchService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def search(
        self,
        query: str,
        org_id: UUID,
        types: list[str] | None = None,
        limit: int = 20,
    ) -> dict[str, list[dict]]:
        if not query.strip():
            return {}

        # Sanitize query for FTS5 — escape special chars
        fts_query = self._build_fts_query(query)

        type_filter = ""
        if types:
            valid_types = [t for t in types if t in SUPPORTED_TYPES]
            if valid_types:
                placeholders = ",".join(f"'{t}'" for t in valid_types)
                type_filter = f"AND entity_type IN ({placeholders})"

        sql = text(f"""
            SELECT entity_type, entity_id, title, body, metadata,
                   rank
            FROM search_index
            WHERE search_index MATCH :query
              AND org_id = :org_id
              {type_filter}
            ORDER BY rank
            LIMIT :limit
        """)

        try:
            result = await self.db.execute(
                sql,
                {"query": fts_query, "org_id": str(org_id), "limit": limit},
            )
            rows = result.mappings().all()
        except Exception as e:
            log.warning("fts_search_failed", error=str(e), query=query)
            return {}

        grouped: dict[str, list[dict]] = {}
        for row in rows:
            entity_type = row["entity_type"]
            if entity_type not in grouped:
                grouped[entity_type] = []
            grouped[entity_type].append(
                {
                    "entity_id": row["entity_id"],
                    "title": row["title"],
                    "body": row["body"],
                    "metadata": row["metadata"],
                }
            )

        return grouped

    async def index_entity(
        self,
        entity_type: str,
        entity_id: str,
        org_id: str,
        title: str,
        body: str,
        metadata: str = "",
    ) -> None:
        """Insert or replace an entity in the FTS5 index."""
        # Remove existing entry first
        await self.db.execute(
            text(
                "DELETE FROM search_index WHERE entity_type = :et AND entity_id = :eid"
            ),
            {"et": entity_type, "eid": entity_id},
        )
        await self.db.execute(
            text(
                "INSERT INTO search_index(entity_type, entity_id, org_id, title, body, metadata) "
                "VALUES (:et, :eid, :oid, :title, :body, :meta)"
            ),
            {
                "et": entity_type,
                "eid": entity_id,
                "oid": org_id,
                "title": title,
                "body": body,
                "meta": metadata,
            },
        )

    async def remove_entity(self, entity_type: str, entity_id: str) -> None:
        await self.db.execute(
            text(
                "DELETE FROM search_index WHERE entity_type = :et AND entity_id = :eid"
            ),
            {"et": entity_type, "eid": entity_id},
        )

    @staticmethod
    def _build_fts_query(query: str) -> str:
        """Build FTS5-safe query string."""
        # Strip FTS5 operators and wrap in quotes for phrase search, then add prefix search
        cleaned = query.strip().replace('"', "").replace("*", "").replace("(", "").replace(")", "")
        terms = cleaned.split()
        if not terms:
            return '""'
        # Prefix search on last term
        parts = [f'"{t}"' for t in terms[:-1]] + [f'"{terms[-1]}"*']
        return " ".join(parts)
