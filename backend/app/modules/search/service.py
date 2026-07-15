from __future__ import annotations

from typing import Any
from uuid import UUID

import structlog
from sqlalchemy import select, text
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

        valid_types: list[str] = [t for t in (types or []) if t in SUPPORTED_TYPES]

        # Build type filter using SQLite parameterised IN clause.
        # We cannot use SQLAlchemy bind params inside FTS5 MATCH expressions,
        # but the IN list is constructed from a strict whitelist so interpolation
        # is safe here. We still assert to make future regressions loud.
        assert all(t in SUPPORTED_TYPES for t in valid_types), "type whitelist violated"

        if valid_types:
            # SQLite doesn't support array binds so we use positional params
            in_clause = ",".join(["?"] * len(valid_types))
            type_filter = f"AND entity_type IN ({in_clause})"
        else:
            type_filter = ""
            valid_types = []

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

        params: dict = {"query": fts_query, "org_id": str(org_id), "limit": limit}
        # SQLAlchemy text() doesn't support positional ? for SQLite, so we
        # fall back to named params for the type list
        if valid_types:
            for i, t in enumerate(valid_types):
                params[f"t{i}"] = t
            # Rebuild with named params
            in_clause_named = ",".join([f":t{i}" for i in range(len(valid_types))])
            type_filter_named = f"AND entity_type IN ({in_clause_named})"
            sql = text(f"""
                SELECT entity_type, entity_id, title, body, metadata, rank
                FROM search_index
                WHERE search_index MATCH :query
                  AND org_id = :org_id
                  {type_filter_named}
                ORDER BY rank
                LIMIT :limit
            """)
        try:
            result = await self.db.execute(sql, params)
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

    async def rebuild_index(self) -> int:
        """Rebuild the whole FTS index from the source tables.

        Keeps search consistent even if an incremental index_entity call was
        missed. Returns the number of rows indexed.
        """
        from app.modules.assets.models import Asset
        from app.modules.portfolios.models import Portfolio
        from app.modules.transactions.models import Transaction

        await self.db.execute(text("DELETE FROM search_index"))
        count = 0

        portfolios = (
            await self.db.execute(
                select(Portfolio).where(Portfolio.deleted_at.is_(None))
            )
        ).scalars().all()
        for p in portfolios:
            await self.index_entity(
                "portfolio", str(p.id), str(p.org_id), p.name, p.description or ""
            )
            count += 1

        assets = (
            await self.db.execute(select(Asset).where(Asset.deleted_at.is_(None)))
        ).scalars().all()
        for a in assets:
            await self.index_entity(
                "asset", str(a.id), str(a.org_id), f"{a.symbol} {a.name}", a.sector or ""
            )
            count += 1

        transactions = (
            await self.db.execute(
                select(Transaction).where(Transaction.deleted_at.is_(None))
            )
        ).scalars().all()
        for t in transactions:
            await self.index_entity(
                "transaction",
                str(t.id),
                str(t.org_id),
                t.transaction_type.value,
                t.notes or "",
            )
            count += 1

        await self.db.commit()
        return count

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
