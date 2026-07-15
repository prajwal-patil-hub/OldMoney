from __future__ import annotations

import csv
import io
import json
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any
from uuid import UUID

import structlog

try:
    import magic
    _HAVE_MAGIC = True
except ImportError:
    _HAVE_MAGIC = False

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ValidationError
from app.modules.imports.schemas import (
    ImportPreviewResponse,
    ImportTemplate,
    RowError,
)

log = structlog.get_logger(__name__)

TEMPLATES: list[ImportTemplate] = [
    ImportTemplate(
        name="transactions",
        target="transactions",
        description="Import buy/sell transactions",
        columns=[
            "external_id", "account_id", "portfolio_id", "asset_symbol",
            "transaction_type", "trade_date", "quantity", "price",
            "fees", "currency", "notes",
        ],
        example_row={
            "external_id": "TX-001",
            "account_id": "<uuid>",
            "portfolio_id": "<uuid>",
            "asset_symbol": "AAPL",
            "transaction_type": "BUY",
            "trade_date": "2024-01-15",
            "quantity": "100",
            "price": "185.50",
            "fees": "0.99",
            "currency": "USD",
            "notes": "",
        },
    ),
    ImportTemplate(
        name="holdings",
        target="holdings",
        description="Import current holdings snapshot",
        columns=[
            "account_id", "portfolio_id", "asset_symbol",
            "quantity", "cost_basis", "as_of_date",
        ],
        example_row={
            "account_id": "<uuid>",
            "portfolio_id": "<uuid>",
            "asset_symbol": "AAPL",
            "quantity": "100",
            "cost_basis": "18550.00",
            "as_of_date": "2024-01-15",
        },
    ),
    ImportTemplate(
        name="prices",
        target="prices",
        description="Import asset price history",
        columns=["date", "symbol", "close", "open", "high", "low", "volume"],
        example_row={
            "date": "2024-01-15",
            "symbol": "AAPL",
            "close": "185.50",
            "open": "183.00",
            "high": "186.00",
            "low": "182.50",
            "volume": "52000000",
        },
    ),
]


def _detect_file_type(content: bytes, filename: str) -> str:
    if filename.endswith(".xlsx") or filename.endswith(".xls"):
        return "excel"
    if filename.endswith(".json"):
        return "json"
    if _HAVE_MAGIC:
        mime = magic.from_buffer(content[:2048], mime=True)
        if "spreadsheet" in mime or "excel" in mime:
            return "excel"
        if mime == "application/json":
            return "json"
    return "csv"


def _parse_csv(content: bytes, skip_rows: int = 0) -> tuple[list[dict], list[str]]:
    text = content.decode("utf-8-sig")
    lines = text.splitlines()
    if skip_rows:
        lines = lines[skip_rows:]
    reader = csv.DictReader(io.StringIO("\n".join(lines)))
    rows = list(reader)
    headers = list(reader.fieldnames or [])
    return rows, headers


def _parse_excel(content: bytes) -> tuple[list[dict], list[str]]:
    try:
        import openpyxl
        wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
        ws = wb.active
        rows = list(ws.iter_rows(values_only=True))
        if not rows:
            return [], []
        headers = [str(h) if h is not None else "" for h in rows[0]]
        data = []
        for row in rows[1:]:
            data.append(dict(zip(headers, [str(c) if c is not None else "" for c in row])))
        return data, headers
    except Exception as e:
        raise ValidationError(f"Failed to parse Excel file: {e}") from e


def _parse_json(content: bytes) -> tuple[list[dict], list[str]]:
    try:
        data = json.loads(content)
        if isinstance(data, dict):
            data = data.get("data", data.get("rows", [data]))
        if not isinstance(data, list):
            raise ValidationError("JSON must be an array of objects")
        headers = list(data[0].keys()) if data else []
        return data, headers
    except json.JSONDecodeError as e:
        raise ValidationError(f"Invalid JSON: {e}") from e


def _parse_date(raw: str, date_format: str) -> date:
    """Parse with the requested format first, falling back to ISO."""
    raw = raw.strip()
    try:
        return datetime.strptime(raw, date_format).date()
    except ValueError:
        return date.fromisoformat(raw)


def _validate_transaction_row(row: dict, row_num: int, date_format: str) -> tuple[dict | None, list[RowError]]:
    errors = []
    valid: dict[str, Any] = {}

    # account_id / portfolio_id are optional in the file: real brokerage and
    # bank exports never contain our internal UUIDs. When absent, the commit
    # step falls back to the portfolio selected in the import wizard.
    required = ["transaction_type", "trade_date"]
    for field in required:
        if not row.get(field, "").strip():
            errors.append(RowError(row=row_num, field=field, error=f"'{field}' is required"))

    if errors:
        return None, errors

    for id_field in ("account_id", "portfolio_id"):
        raw = row.get(id_field, "").strip()
        if raw:
            try:
                valid[id_field] = UUID(raw)
            except ValueError:
                errors.append(RowError(row=row_num, field=id_field, error="Invalid UUID"))
        else:
            valid[id_field] = None

    try:
        valid["trade_date"] = _parse_date(row["trade_date"], date_format)
    except ValueError:
        errors.append(RowError(row=row_num, field="trade_date", error="Invalid date format (use YYYY-MM-DD)"))

    valid["transaction_type"] = row.get("transaction_type", "").strip().upper()
    valid["asset_symbol"] = row.get("asset_symbol", "").strip().upper() or None
    valid["external_id"] = row.get("external_id", "").strip() or None
    valid["currency"] = row.get("currency", "USD").strip().upper()
    valid["notes"] = row.get("notes", "").strip() or None

    for field in ("quantity", "price", "fees"):
        raw = row.get(field, "").strip()
        if raw:
            try:
                valid[field] = Decimal(raw)
            except InvalidOperation:
                errors.append(RowError(row=row_num, field=field, error=f"Invalid number: {raw}"))
        else:
            valid[field] = None if field != "fees" else Decimal("0")

    return (valid if not errors else None), errors


def _validate_holding_row(row: dict, row_num: int, date_format: str) -> tuple[dict | None, list[RowError]]:
    errors = []
    valid: dict[str, Any] = {}

    required = ["asset_symbol", "quantity", "as_of_date"]
    for field in required:
        if not row.get(field, "").strip():
            errors.append(RowError(row=row_num, field=field, error=f"'{field}' is required"))

    if errors:
        return None, errors

    for id_field in ("account_id", "portfolio_id"):
        raw = row.get(id_field, "").strip()
        if raw:
            try:
                valid[id_field] = UUID(raw)
            except ValueError:
                errors.append(RowError(row=row_num, field=id_field, error="Invalid UUID"))
        else:
            valid[id_field] = None

    try:
        valid["as_of_date"] = _parse_date(row["as_of_date"], date_format)
    except ValueError:
        errors.append(RowError(row=row_num, field="as_of_date", error="Invalid date format"))

    valid["asset_symbol"] = row["asset_symbol"].strip().upper()

    try:
        valid["quantity"] = Decimal(row["quantity"].strip())
    except InvalidOperation:
        errors.append(RowError(row=row_num, field="quantity", error="Invalid number"))

    raw_cost = row.get("cost_basis", "").strip()
    if raw_cost:
        try:
            valid["cost_basis"] = Decimal(raw_cost)
        except InvalidOperation:
            errors.append(RowError(row=row_num, field="cost_basis", error="Invalid number"))

    return (valid if not errors else None), errors


def _validate_price_row(row: dict, row_num: int, date_format: str) -> tuple[dict | None, list[RowError]]:
    errors = []
    valid: dict[str, Any] = {}

    required = ["date", "symbol", "close"]
    for field in required:
        if not row.get(field, "").strip():
            errors.append(RowError(row=row_num, field=field, error=f"'{field}' is required"))

    if errors:
        return None, errors

    try:
        valid["price_date"] = _parse_date(row["date"], date_format)
    except ValueError:
        errors.append(RowError(row=row_num, field="date", error="Invalid date format"))

    valid["symbol"] = row["symbol"].strip().upper()

    try:
        valid["close"] = Decimal(row["close"].strip())
    except InvalidOperation:
        errors.append(RowError(row=row_num, field="close", error="Invalid number"))

    for opt_field in ("open", "high", "low", "volume"):
        raw = row.get(opt_field, "").strip()
        if raw:
            try:
                valid[opt_field] = Decimal(raw)
            except InvalidOperation:
                errors.append(RowError(row=row_num, field=opt_field, error=f"Invalid number: {raw}"))

    return (valid if not errors else None), errors


_VALIDATORS = {
    "transactions": _validate_transaction_row,
    "holdings": _validate_holding_row,
    "prices": _validate_price_row,
}


class ImportService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def preview(
        self,
        file_content: bytes,
        filename: str,
        target: str,
        date_format: str = "%Y-%m-%d",
        skip_rows: int = 0,
        default_portfolio_id: UUID | None = None,
    ) -> ImportPreviewResponse:
        file_type = _detect_file_type(file_content, filename)

        if file_type == "excel":
            rows, _ = _parse_excel(file_content)
        elif file_type == "json":
            rows, _ = _parse_json(file_content)
        else:
            rows, _ = _parse_csv(file_content, skip_rows=skip_rows)

        validator = _VALIDATORS.get(target)
        if not validator:
            raise ValidationError(f"Unknown import target: {target}")

        valid_rows = []
        all_errors: list[RowError] = []

        for i, row in enumerate(rows, start=2):
            valid_row, row_errors = validator(row, i, date_format)
            if valid_row and target in ("transactions", "holdings"):
                if valid_row.get("portfolio_id") is None and default_portfolio_id is None:
                    row_errors = list(row_errors) + [RowError(
                        row=i, field="portfolio_id",
                        error="No portfolio_id in file — select a target portfolio in the wizard",
                    )]
                    valid_row = None
            if valid_row:
                valid_rows.append(valid_row)
            all_errors.extend(row_errors)

        return ImportPreviewResponse(
            valid_count=len(valid_rows),
            error_count=len(rows) - len(valid_rows),
            total_rows=len(rows),
            preview=valid_rows[:10],
            errors=all_errors[:100],
            file_type=file_type,
        )

    async def commit(
        self,
        file_content: bytes,
        filename: str,
        org_id: UUID,
        user_id: UUID,
        target: str,
        date_format: str = "%Y-%m-%d",
        skip_rows: int = 0,
        default_portfolio_id: UUID | None = None,
    ) -> dict:
        file_type = _detect_file_type(file_content, filename)

        if file_type == "excel":
            rows, _ = _parse_excel(file_content)
        elif file_type == "json":
            rows, _ = _parse_json(file_content)
        else:
            rows, _ = _parse_csv(file_content, skip_rows=skip_rows)

        validator = _VALIDATORS.get(target)
        if not validator:
            raise ValidationError(f"Unknown import target: {target}")

        # Validate the wizard-selected portfolio belongs to this org before
        # using it as a fallback for rows that don't carry their own IDs.
        default_account_id: UUID | None = None
        if default_portfolio_id is not None:
            from app.modules.portfolios.service import PortfolioService
            pf_svc = PortfolioService(self.db)
            await pf_svc.get_portfolio(default_portfolio_id, org_id)  # raises NotFoundError
            default_account_id = await pf_svc.get_or_create_default_account_id(
                default_portfolio_id, org_id
            )

        imported = 0
        skipped = 0
        error_count = 0
        error_details: list[RowError] = []

        for i, row in enumerate(rows, start=2):
            valid_row, row_errors = validator(row, i, date_format)
            if row_errors:
                error_count += 1
                error_details.extend(row_errors)
                continue
            if valid_row is None:
                error_count += 1
                continue

            # Fall back to the wizard-selected portfolio/account when the file
            # doesn't carry internal IDs (the normal case for bank exports).
            if target in ("transactions", "holdings"):
                if valid_row.get("portfolio_id") is None:
                    if default_portfolio_id is None:
                        error_count += 1
                        error_details.append(RowError(
                            row=i, field="portfolio_id",
                            error="No portfolio_id in file — select a target portfolio in the wizard",
                        ))
                        continue
                    valid_row["portfolio_id"] = default_portfolio_id
                if valid_row.get("account_id") is None:
                    if valid_row["portfolio_id"] == default_portfolio_id and default_account_id:
                        valid_row["account_id"] = default_account_id
                    else:
                        from app.modules.portfolios.service import PortfolioService
                        pf_svc = PortfolioService(self.db)
                        valid_row["account_id"] = await pf_svc.get_or_create_default_account_id(
                            valid_row["portfolio_id"], org_id
                        )

            try:
                if target == "transactions":
                    did_import = await self._commit_transaction(valid_row, org_id, user_id)
                elif target == "holdings":
                    did_import = await self._commit_holding(valid_row, org_id)
                elif target == "prices":
                    did_import = await self._commit_price(valid_row, org_id)
                else:
                    did_import = False

                if did_import:
                    imported += 1
                else:
                    skipped += 1
            except Exception as e:
                error_count += 1
                error_details.append(RowError(row=i, field=None, error=str(e)))

        await self.db.flush()
        log.info(
            "import_committed",
            target=target,
            org_id=str(org_id),
            imported=imported,
            skipped=skipped,
            errors=error_count,
        )
        return {
            "imported": imported,
            "skipped": skipped,
            "errors": error_count,
            "error_details": [e.model_dump() for e in error_details[:50]],
        }

    async def _get_or_create_asset(self, symbol: str, org_id: UUID):
        """Resolve a symbol to an asset, creating a bare one when unknown.

        Bank/brokerage files routinely reference instruments that were never
        registered by hand; silently dropping the link (or erroring the row)
        makes imports look like they did nothing.
        """
        from app.modules.assets.repository import AssetRepository
        from app.modules.assets.models import AssetType

        asset_repo = AssetRepository(self.db)
        asset = await asset_repo.get_by_symbol(symbol, org_id)
        if asset:
            return asset
        asset = await asset_repo.create(
            org_id=org_id,
            symbol=symbol,
            name=symbol,
            asset_type=AssetType.EQUITY,
            currency="USD",
            metadata_={"auto_created": "import"},
        )
        log.info("import_auto_created_asset", symbol=symbol, org_id=str(org_id))
        return asset

    async def _commit_transaction(self, row: dict, org_id: UUID, user_id: UUID) -> bool:
        from app.modules.transactions.repository import TransactionRepository
        from app.modules.transactions.models import TransactionType
        from app.modules.transactions.service import TransactionService

        tx_repo = TransactionRepository(self.db)

        if row.get("external_id"):
            existing = await tx_repo.get_by_external_id(row["external_id"], org_id)
            if existing:
                return False

        asset_id = None
        if row.get("asset_symbol"):
            asset = await self._get_or_create_asset(row["asset_symbol"], org_id)
            asset_id = asset.id

        gross = None
        if row.get("quantity") and row.get("price"):
            gross = row["quantity"] * row["price"]
        net = gross - (row.get("fees") or Decimal("0")) if gross else None

        # Route through the service (not the repository) so BUY/SELL rows
        # update holdings — otherwise imported data never shows up in
        # dashboards, allocations, or portfolio values.
        tx_svc = TransactionService(self.db)
        await tx_svc.create_transaction(
            org_id=org_id,
            user_id=user_id,
            account_id=row["account_id"],
            portfolio_id=row["portfolio_id"],
            transaction_type=TransactionType(row["transaction_type"]),
            trade_date=row["trade_date"],
            external_id=row.get("external_id"),
            asset_id=asset_id,
            quantity=row.get("quantity"),
            price=row.get("price"),
            gross_amount=gross,
            fees=row.get("fees") or Decimal("0"),
            net_amount=net,
            currency=row.get("currency", "USD"),
            notes=row.get("notes"),
            metadata={},
        )
        return True

    async def _commit_holding(self, row: dict, org_id: UUID) -> bool:
        from app.modules.holdings.repository import HoldingRepository
        from app.modules.assets.repository import AssetRepository

        asset = await self._get_or_create_asset(row["asset_symbol"], org_id)

        holding_repo = HoldingRepository(self.db)
        existing = await holding_repo.get_by_unique(
            row["account_id"], asset.id, row["as_of_date"]
        )
        if existing:
            return False

        await holding_repo.upsert(
            org_id=org_id,
            account_id=row["account_id"],
            portfolio_id=row["portfolio_id"],
            asset_id=asset.id,
            as_of_date=row["as_of_date"],
            quantity=row["quantity"],
            cost_basis=row.get("cost_basis"),
        )
        return True

    async def _commit_price(self, row: dict, org_id: UUID) -> bool:
        from app.modules.assets.repository import AssetRepository

        asset_repo = AssetRepository(self.db)
        asset = await self._get_or_create_asset(row["symbol"], org_id)

        await asset_repo.upsert_price(
            asset_id=asset.id,
            org_id=org_id,
            price_date=row["price_date"],
            close=row["close"],
            open=row.get("open"),
            high=row.get("high"),
            low=row.get("low"),
            volume=row.get("volume"),
        )
        return True

    @staticmethod
    def get_templates() -> list[ImportTemplate]:
        return TEMPLATES
