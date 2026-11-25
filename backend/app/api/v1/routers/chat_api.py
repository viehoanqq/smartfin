from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ai.chat.service import financial_context, generate_answer
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.domain import ChatMessage, ChatSession

router = APIRouter(prefix="/chat", tags=["Chat"])


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    session_id: int | None = None


def _session(db: Session, user_id: int, session_id: int):
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == user_id).first()
    if session is None:
        raise HTTPException(404, "Không tìm thấy cuộc trò chuyện")
    return session


@router.get("/sessions")
def list_sessions(db: Session = Depends(get_db), user=Depends(get_current_user)):
    latest = db.query(ChatMessage.session_id, func.max(ChatMessage.id).label("last_message_id")).group_by(
        ChatMessage.session_id
    ).subquery()
    rows = db.query(ChatSession).outerjoin(latest, latest.c.session_id == ChatSession.id).filter(
        ChatSession.user_id == user.id
    ).order_by(func.coalesce(latest.c.last_message_id, 0).desc(), ChatSession.created_at.desc()).limit(30).all()
    return [{"id": s.id, "title": s.title, "created_at": s.created_at} for s in rows]


@router.get("/sessions/{session_id}/messages")
def list_messages(session_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    _session(db, user.id, session_id)
    rows = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.id.desc()).limit(100).all()
    rows.reverse()
    return [{"id": m.id, "role": m.role, "content": m.content, "created_at": m.created_at} for m in rows]


@router.delete("/sessions/{session_id}", status_code=204)
def delete_session(session_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    session = _session(db, user.id, session_id)
    db.delete(session)
    db.commit()


@router.post("/messages")
def send_message(data: ChatRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    question = data.message.strip()
    if not question:
        raise HTTPException(422, "Nội dung không được để trống")
    session = _session(db, user.id, data.session_id) if data.session_id is not None else None
    previous = []
    if session:
        rows = db.query(ChatMessage).filter(ChatMessage.session_id == session.id).order_by(ChatMessage.id.desc()).limit(8).all()
        previous = [{"role": m.role, "content": m.content} for m in reversed(rows) if m.role in {"user", "model"}]
    facts = financial_context(db, user.id, question)
    answer = generate_answer(question, facts, previous)
    if session is None:
        session = ChatSession(user_id=user.id, title=question[:80])
        db.add(session)
        db.flush()
    db.add(ChatMessage(session_id=session.id, role="user", content=question))
    reply = ChatMessage(session_id=session.id, role="model", content=answer)
    db.add(reply)
    db.commit()
    db.refresh(reply)
    return {"session_id": session.id, "message": {"id": reply.id, "role": "model", "content": answer, "created_at": reply.created_at}}
