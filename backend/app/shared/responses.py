from __future__ import annotations

from typing import Any, Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ErrorDetail(BaseModel):
    code: str
    message: str
    detail: dict[str, Any] = {}


class Meta(BaseModel):
    request_id: str | None = None
    total: int | None = None
    page: int | None = None
    page_size: int | None = None
    has_next: bool | None = None


class ApiResponse(BaseModel, Generic[T]):
    data: T | None = None
    meta: Meta | None = None
    errors: list[ErrorDetail] = []

    @classmethod
    def ok(cls, data: T, meta: Meta | None = None) -> "ApiResponse[T]":
        return cls(data=data, meta=meta, errors=[])

    @classmethod
    def error(cls, code: str, message: str, detail: dict | None = None) -> "ApiResponse[None]":
        return cls(
            data=None,
            meta=None,
            errors=[ErrorDetail(code=code, message=message, detail=detail or {})],
        )


def success(data: Any, meta: Meta | None = None) -> dict:
    return {"data": data, "meta": meta.model_dump() if meta else None, "errors": []}


def paginated(items: list, total: int, page: int, page_size: int, request_id: str | None = None) -> dict:
    has_next = (page * page_size) < total
    return {
        "data": items,
        "meta": {
            "total": total,
            "page": page,
            "page_size": page_size,
            "has_next": has_next,
            "request_id": request_id,
        },
        "errors": [],
    }
