from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class ColumnMapping(BaseModel):
    source_column: str
    target_field: str


class ImportConfig(BaseModel):
    target: str  # "transactions" | "holdings" | "assets" | "prices"
    mappings: list[ColumnMapping] = []
    date_format: str = "%Y-%m-%d"
    skip_rows: int = 0


class RowError(BaseModel):
    row: int
    field: str | None
    error: str


class ImportPreviewResponse(BaseModel):
    valid_count: int
    error_count: int
    total_rows: int
    preview: list[dict[str, Any]]  # first 10 valid rows
    errors: list[RowError]
    file_type: str


class ImportCommitRequest(BaseModel):
    preview_token: str  # signed token from preview
    config: ImportConfig


class ImportCommitResponse(BaseModel):
    imported: int
    skipped: int
    errors: int
    error_details: list[RowError]


class ImportTemplate(BaseModel):
    name: str
    target: str
    description: str
    columns: list[str]
    example_row: dict[str, str]
