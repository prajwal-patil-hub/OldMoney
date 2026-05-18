from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.ai.schemas import AIConversationCreate, SendMessageRequest
from app.modules.ai.service import AIService
from app.shared.deps import get_current_user, get_token_payload
from app.shared.responses import success

router = APIRouter(prefix="/ai", tags=["ai"])


def _get_context(request: Request) -> tuple[UUID, UUID]:
    from app.core.exceptions import AuthorizationError
    payload = get_token_payload(request)
    org_id = payload.get("org_id")
    user_id = payload.get("sub")
    if not org_id:
        raise AuthorizationError("No organization context")
    return UUID(org_id), UUID(user_id)


@router.get("/status", response_model=dict)
async def get_status(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    org_id, user_id = _get_context(request)
    svc = AIService(db, org_id, user_id)
    status = await svc.get_status()
    return success(status.model_dump())


@router.post("/conversations", response_model=dict, status_code=201)
async def create_conversation(
    body: AIConversationCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    org_id, user_id = _get_context(request)
    svc = AIService(db, org_id, user_id)
    conv = await svc.create_conversation(
        title=body.title,
        portfolio_context_id=body.portfolio_context_id,
    )
    return success(conv.model_dump())


@router.get("/conversations", response_model=dict)
async def list_conversations(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    org_id, user_id = _get_context(request)
    svc = AIService(db, org_id, user_id)
    convs = await svc.list_conversations()
    return success([c.model_dump() for c in convs])


@router.get("/conversations/{conv_id}", response_model=dict)
async def get_conversation(
    conv_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    org_id, user_id = _get_context(request)
    svc = AIService(db, org_id, user_id)
    conv = await svc.get_conversation(conv_id)
    return success(conv.model_dump())


@router.post("/conversations/{conv_id}/messages", response_model=dict)
async def send_message(
    conv_id: UUID,
    body: SendMessageRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    org_id, user_id = _get_context(request)
    svc = AIService(db, org_id, user_id)

    if body.stream:
        async def event_generator():
            async for chunk in svc.send_message_stream(conv_id, body.content):
                yield chunk

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            },
        )

    msg = await svc.send_message(conv_id, body.content)
    return success(msg.model_dump())
