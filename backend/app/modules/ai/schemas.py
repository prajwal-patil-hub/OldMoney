from __future__ import annotations

import enum
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class MessageRole(str, enum.Enum):
    USER = "USER"
    ASSISTANT = "ASSISTANT"
    SYSTEM = "SYSTEM"
    TOOL = "TOOL"


class AIConversationCreate(BaseModel):
    title: str | None = None
    portfolio_context_id: UUID | None = None


class AIConversationOut(BaseModel):
    id: UUID
    org_id: UUID
    user_id: UUID
    title: str | None
    portfolio_context_id: UUID | None
    provider: str
    model: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AIMessageOut(BaseModel):
    id: UUID
    conversation_id: UUID
    role: MessageRole
    content: str | None
    tool_calls: list | None
    token_count: int | None
    latency_ms: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


class AIConversationDetail(AIConversationOut):
    messages: list[AIMessageOut] = []


class SendMessageRequest(BaseModel):
    content: str = Field(min_length=1, max_length=32000)
    stream: bool = False


class AIStatusResponse(BaseModel):
    provider: str
    model: str
    is_available: bool
    latency_ms: int | None
    error: str | None = None
