"""Exercise parse -> bulk -> feedback inside an outer transaction that is rolled back."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.db.session import engine, get_db
from app.models.domain import Category, NLPFeedback, Transaction, Wallet
from main import app


def main():
    connection = engine.connect()
    outer = connection.begin()

    def isolated_db():
        with Session(bind=connection, join_transaction_mode="create_savepoint") as db:
            yield db

    app.dependency_overrides[get_db] = isolated_db
    try:
        with Session(bind=connection, join_transaction_mode="create_savepoint") as db:
            wallet = db.query(Wallet).filter(Wallet.balance >= 1).first()
            other_wallet = db.query(Wallet).filter(Wallet.user_id != wallet.user_id).first() if wallet else None
            categories = {c.name: c.id for c in db.query(Category).filter(Category.name.in_(["Ăn uống", "Di chuyển"])).all()}
            if not wallet or len(categories) < 2:
                raise RuntimeError("Cần DB demo có ví đủ tiền và danh mục Ăn uống/Di chuyển")
            user_id, wallet_id = wallet.user_id, wallet.id
            original_balance = int(wallet.balance)
            predicted_id, corrected_id = categories["Ăn uống"], categories["Di chuyển"]

        headers = {"Authorization": f"Bearer {create_access_token(user_id)}"}
        with TestClient(app) as client:
            parsed = client.post("/api/v1/nlp/parse", json={"text": "ăn phở 1đ"}, headers=headers)
            assert parsed.status_code == 200, parsed.text
            draft = parsed.json()["drafts"][0]
            assert draft["category_id"] == predicted_id, draft
            saved = client.post("/api/v1/transactions/bulk", json={"transactions": [{
                "wallet_id": wallet_id, "category_id": corrected_id, "type": "expense",
                "amount": draft["amount"], "txn_date": draft["txn_date"],
                "note": draft["note"], "source": "nlp", "raw_text": draft["raw_text"],
            }]}, headers=headers)
            assert saved.status_code == 201, saved.text
            txn_id = saved.json()[0]["id"]
            feedback = client.post("/api/v1/nlp/feedback", json={
                "transaction_id": txn_id, "raw_text": draft["raw_text"],
                "predicted_category_id": predicted_id, "corrected_category_id": corrected_id,
            }, headers=headers)
            assert feedback.status_code == 201, feedback.text
            with Session(bind=connection, join_transaction_mode="create_savepoint") as db:
                assert int(db.query(Wallet).filter(Wallet.id == wallet_id).first().balance) == original_balance - 1
                assert db.query(NLPFeedback).filter(NLPFeedback.transaction_id == txn_id).count() == 1
            again = client.post("/api/v1/nlp/parse", json={"text": "ăn phở 1đ"}, headers=headers)
            assert again.json()["drafts"][0]["category_id"] == corrected_id
            if other_wallet:
                other_headers = {"Authorization": f"Bearer {create_access_token(other_wallet.user_id)}"}
                other = client.post("/api/v1/nlp/parse", json={"text": "ăn phở 1đ"}, headers=other_headers)
                assert other.json()["drafts"][0]["category_id"] == predicted_id
            print("E2E API passed; database changes will be rolled back.")
    finally:
        app.dependency_overrides.clear()
        outer.rollback()
        connection.close()
    with Session(engine) as db:
        assert db.query(Transaction).filter(Transaction.id == txn_id).first() is None
        assert int(db.query(Wallet).filter(Wallet.id == wallet_id).first().balance) == original_balance
    print("Rollback verified: wallet and transaction data unchanged.")


if __name__ == "__main__":
    main()
