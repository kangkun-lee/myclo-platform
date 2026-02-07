"""Chat domain router."""

import logging
from fastapi import Query
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.database import get_db
from app.domains.user.model import User
from app.ai.workflows.chat_workflow import get_chat_workflow
from app.ai.schemas.workflow_state import ChatState
from .model import ChatMessage, ChatSession
from .schema import ChatRequest

logger = logging.getLogger(__name__)

chat_router = APIRouter()


def _normalize_role(sender: str) -> str:
    s = (sender or "").strip().lower()
    if s in {"assistant", "agent", "ai", "bot"}:
        return "assistant"
    return "user"


def _serialize_dt(dt):
    return dt.isoformat() if dt else None


@chat_router.post("/chat/sessions")
def create_chat_session(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        session = ChatSession(user_id=current_user.id)
        db.add(session)
        db.commit()
        db.refresh(session)
        return {
            "success": True,
            "session_id": str(session.id),
            "created_at": _serialize_dt(session.created_at),
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Create chat session error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to process chat message.")


@chat_router.get("/chat/sessions")
def list_chat_sessions(
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        sessions = (
            db.query(ChatSession)
            .filter(ChatSession.user_id == current_user.id)
            .order_by(ChatSession.created_at.desc())
            .limit(limit)
            .all()
        )

        items = []
        for s in sessions:
            latest_message = (
                db.query(ChatMessage)
                .filter(ChatMessage.session_id == s.id)
                .order_by(ChatMessage.created_at.desc())
                .first()
            )
            message_count = (
                db.query(ChatMessage).filter(ChatMessage.session_id == s.id).count()
            )
            preview = (
                (latest_message.content or "").strip()
                if latest_message and latest_message.content
                else (s.session_summary or "New chat")
            )
            items.append(
                {
                    "session_id": str(s.id),
                    "title": preview[:40] if preview else "New chat",
                    "message_count": message_count,
                    "created_at": _serialize_dt(s.created_at),
                    "updated_at": _serialize_dt(
                        latest_message.created_at if latest_message else s.created_at
                    ),
                }
            )

        return {"success": True, "items": items}
    except Exception as e:
        logger.error(f"List chat sessions error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to process chat message.")


@chat_router.get("/chat/sessions/{session_id}/messages")
def get_chat_session_messages(
    session_id: str,
    limit: int = Query(100, ge=1, le=300),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        session = (
            db.query(ChatSession)
            .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
            .first()
        )
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found.")

        messages = (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == session.id)
            .order_by(ChatMessage.created_at.asc())
            .limit(limit)
            .all()
        )

        items = [
            {
                "id": str(m.id),
                "role": _normalize_role(m.sender),
                "content": (m.content or "").strip(),
                "created_at": _serialize_dt(m.created_at),
            }
            for m in messages
            if (m.content or "").strip()
        ]
        return {"success": True, "session_id": str(session.id), "items": items}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get chat session messages error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to process chat message.")


@chat_router.post("/chat")
async def send_message(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Process chat message and persist session/messages."""
    try:
        session: ChatSession | None = None

        if request.session_id:
            session = (
                db.query(ChatSession)
                .filter(
                    ChatSession.id == request.session_id,
                    ChatSession.user_id == current_user.id,
                )
                .first()
            )

        if not session:
            session = ChatSession(user_id=current_user.id)
            db.add(session)
            db.commit()
            db.refresh(session)
        if not session.session_summary:
            session.session_summary = request.query[:120]
            db.commit()

        # Persist user message first.
        db.add(
            ChatMessage(
                session_id=session.id,
                sender="USER",
                content=request.query,
                extracted_5w1h={"text": request.query},
            )
        )
        db.commit()

        # Build workflow history from DB so context is server-driven.
        db_messages = (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == session.id)
            .order_by(ChatMessage.created_at.asc())
            .limit(30)
            .all()
        )

        history: list[dict[str, str]] = []
        for m in db_messages:
            text = (m.content or "").strip()
            if not text and isinstance(m.extracted_5w1h, dict):
                text = str(m.extracted_5w1h.get("text") or "").strip()
            if not text:
                continue
            history.append({"role": _normalize_role(m.sender), "content": text})

        if not history and request.history:
            history = request.history

        initial_state: ChatState = {
            "messages": history,
            "user_query": request.query,
            "context": {
                "user_id": str(current_user.id),
                "is_pick_updated": False,
                "lat": request.lat,
                "lon": request.lon,
                "session_id": str(session.id),
            },
            "response": None,
            "recommendations": None,
            "todays_pick": None,
        }

        workflow = get_chat_workflow()
        final_state = await workflow.ainvoke(initial_state)

        assistant_text = str(final_state.get("response") or "").strip()
        if assistant_text:
            db.add(
                ChatMessage(
                    session_id=session.id,
                    sender="AGENT",
                    content=assistant_text,
                    extracted_5w1h={"text": assistant_text},
                )
            )
            db.commit()

        return {
            "success": True,
            "session_id": str(session.id),
            "response": final_state.get("response"),
            "is_pick_updated": final_state.get("context", {}).get(
                "is_pick_updated", False
            ),
            "recommendations": final_state.get("recommendations"),
            "todays_pick": final_state.get("todays_pick"),
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Chat processing error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to process chat message.")
