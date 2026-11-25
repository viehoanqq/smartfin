"""Commit a temporary chat, read it through a fresh client, then delete it."""
import sys
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.db.session import engine
from app.models.domain import ChatSession, User
from main import app


def main():
    with Session(engine) as db:
        user = db.query(User).order_by(User.id).first()
        if user is None:
            raise RuntimeError("Cần ít nhất một user trong DB")
        user_id = user.id
    token = create_access_token(user_id)
    headers = {"Authorization": f"Bearer {token}"}
    unique_question = "Kiểm tra lưu chat " + uuid4().hex[:12]
    session_id = None
    try:
        with patch("app.api.v1.routers.chat_api.generate_answer", return_value="Đã lưu phiên kiểm tra."):
            with TestClient(app) as client:
                created = client.post("/api/v1/chat/messages", json={"message": unique_question}, headers=headers)
                assert created.status_code == 200, created.text
                session_id = created.json()["session_id"]
        with Session(engine) as db:
            stored = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == user_id).first()
            assert stored is not None
        with TestClient(app) as fresh_client:
            listing = fresh_client.get("/api/v1/chat/sessions", headers=headers)
            assert listing.status_code == 200
            assert session_id in [row["id"] for row in listing.json()]
            history = fresh_client.get(f"/api/v1/chat/sessions/{session_id}/messages", headers=headers)
            assert history.status_code == 200
            assert [m["role"] for m in history.json()] == ["user", "model"]
            assert history.json()[0]["content"] == unique_question
        print("Chat session persisted and loaded from a fresh database connection.")
    finally:
        if session_id is not None:
            with Session(engine) as db:
                stored = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == user_id).first()
                if stored:
                    db.delete(stored)
                    db.commit()
            print("Temporary chat session removed.")


if __name__ == "__main__":
    main()
