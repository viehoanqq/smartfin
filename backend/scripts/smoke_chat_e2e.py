"""Check chat ownership and period aggregates without calling Gemini or retaining DB writes."""
import sys
from contextlib import nullcontext
from datetime import datetime
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.ai.chat.service import financial_context
from app.core.security import create_access_token
from app.db.session import engine, get_db
from app.models.domain import ChatMessage, ChatSession, Transaction, User
from main import app


def main():
    live = "--live" in sys.argv
    connection = engine.connect()
    outer = connection.begin()

    def isolated_db():
        with Session(bind=connection, join_transaction_mode="create_savepoint") as db:
            yield db

    app.dependency_overrides[get_db] = isolated_db
    session_id = None
    try:
        with Session(bind=connection, join_transaction_mode="create_savepoint") as db:
            users = db.query(User).order_by(User.id).limit(2).all()
            assert len(users) == 2, "Need two seeded users"
            owner, outsider = users
            owner_facts = financial_context(db, owner.id, "tháng này")
            outsider_facts = financial_context(db, outsider.id, "tháng này")
            compared = financial_context(db, owner.id, "so sánh tháng 10/2026 và tháng 11/2026")
            assert compared["period"]["from"] == "2026-10-01"
            assert compared["comparison_periods"][0]["period"]["from"] == "2026-11-01"
            owner_sum = sum(int(t.amount) for t in db.query(Transaction).filter(
                Transaction.user_id == owner.id, Transaction.delete_at.is_(None),
                Transaction.txn_date >= datetime.fromisoformat(owner_facts["period"]["from"]),
                Transaction.txn_date < datetime.fromisoformat(owner_facts["period"]["to_exclusive"]),
                Transaction.type == "expense",
            ).all())
            assert owner_facts["period_totals"].get("expense", 0) == owner_sum
        owner_headers = {"Authorization": f"Bearer {create_access_token(owner.id)}"}
        outsider_headers = {"Authorization": f"Bearer {create_access_token(outsider.id)}"}
        answer_context = nullcontext() if live else patch(
            "app.api.v1.routers.chat_api.generate_answer",
            return_value="Chi tiêu tháng này đã được tổng hợp.",
        )
        with answer_context as mocked:
            client = TestClient(app)
            assert client.post("/api/v1/chat/messages", json={"message": "Chi tiêu tháng này?"}).status_code == 401
            result = client.post("/api/v1/chat/messages", json={"message": "Chi tiêu tháng này?"}, headers=owner_headers)
            assert result.status_code == 200, result.text
            session_id = result.json()["session_id"]
            if mocked:
                assert mocked.call_args.args[1] == owner_facts
            assert client.get(f"/api/v1/chat/sessions/{session_id}/messages", headers=owner_headers).status_code == 200
            assert client.get(f"/api/v1/chat/sessions/{session_id}/messages", headers=outsider_headers).status_code == 404
            assert client.post("/api/v1/chat/messages", json={"message": "Tiếp tục", "session_id": session_id}, headers=outsider_headers).status_code == 404
            assert client.delete(f"/api/v1/chat/sessions/{session_id}", headers=outsider_headers).status_code == 404
            assert all(s["id"] != session_id for s in client.get("/api/v1/chat/sessions", headers=outsider_headers).json())
            assert owner_facts != outsider_facts or owner.id != outsider.id
            assert client.delete(f"/api/v1/chat/sessions/{session_id}", headers=owner_headers).status_code == 204
            assert client.get(f"/api/v1/chat/sessions/{session_id}/messages", headers=owner_headers).status_code == 404
            with Session(bind=connection, join_transaction_mode="create_savepoint") as db:
                assert db.query(ChatMessage).filter(ChatMessage.session_id == session_id).count() == 0
        print("Chat API ownership, SQL totals and history passed.")
    finally:
        app.dependency_overrides.clear()
        outer.rollback()
        connection.close()
    with Session(engine) as db:
        assert db.query(ChatSession).filter(ChatSession.id == session_id).first() is None
    print("Rollback verified.")


if __name__ == "__main__":
    main()
