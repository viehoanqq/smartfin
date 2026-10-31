import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from datetime import datetime

from main import app
from app.core.deps import get_current_user
from app.core.rules import balance_delta
from app.db.session import get_db
from app.models.domain import User, Wallet, Transaction
from app.repositories import transaction_repo


def override_get_current_user():
    return User(id=1, email="admin@gmail.com", full_name="Test", role="admin", monthly_income=0)


def override_get_db():
    yield MagicMock()


@pytest.fixture(autouse=True)
def setup_mocks():
    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()


client = TestClient(app)


def test_balance_delta_rules():
    """income cộng; expense và saving trừ"""
    assert balance_delta("income", 100) == 100
    assert balance_delta("expense", 100) == -100
    assert balance_delta("saving", 100) == -100


def test_balance_delta_rejects_unknown_type():
    with pytest.raises(ValueError):
        balance_delta("transfer", 100)
    with pytest.raises(ValueError):
        balance_delta(None, 100)


def test_create_income_transaction_adds_to_wallet(monkeypatch):
    wallet = Wallet(id=1, user_id=1, name="Techcombank", balance=1000000)
    monkeypatch.setattr(transaction_repo, "get_wallet_by_id", lambda db, wallet_id, user_id: wallet)

    def fake_create(db, user_id, wallet, txn_in, amount_delta):
        wallet.balance += amount_delta
        return Transaction(id=1, user_id=user_id, wallet_id=txn_in.wallet_id, category_id=txn_in.category_id,
                           type=txn_in.type, amount=txn_in.amount, txn_date=datetime.now(), source="manual")
    monkeypatch.setattr(transaction_repo, "create_transaction_atomic", fake_create)

    res = client.post("/api/v1/transactions", json={"wallet_id": 1, "category_id": 13, "type": "income", "amount": 500000})
    assert res.status_code == 201
    assert wallet.balance == 1500000


def test_create_saving_transaction_via_generic_api_is_rejected():
    """Giao dịch tiết kiệm chỉ sinh ra từ mục Mục tiêu tiết kiệm, không tạo qua API giao dịch thường"""
    res = client.post("/api/v1/transactions", json={"wallet_id": 1, "category_id": 17, "type": "saving", "amount": 100000})
    assert res.status_code == 422


def test_update_saving_transaction_is_blocked(monkeypatch):
    txn = Transaction(id=30, user_id=1, wallet_id=1, category_id=17, type="saving", amount=2000000,
                      txn_date=datetime.now(), source="manual")
    monkeypatch.setattr(transaction_repo, "get_transaction_by_id", lambda db, txn_id, user_id, include_deleted=False: txn)
    res = client.put("/api/v1/transactions/30", json={"amount": 1000000})
    assert res.status_code == 400


def test_delete_saving_transaction_is_blocked(monkeypatch):
    wallet = Wallet(id=1, user_id=1, balance=8000000)
    txn = Transaction(id=30, user_id=1, wallet_id=1, category_id=17, type="saving", amount=2000000,
                      txn_date=datetime.now(), source="manual", delete_at=None)
    monkeypatch.setattr(transaction_repo, "get_wallet_by_id", lambda db, wallet_id, user_id: wallet)
    monkeypatch.setattr(transaction_repo, "get_transaction_by_id", lambda db, txn_id, user_id, include_deleted=False: txn)
    res = client.delete("/api/v1/transactions/30")
    assert res.status_code == 400
    assert wallet.balance == 8000000      # ví không bị thay đổi
    assert txn.delete_at is None


def test_restore_saving_transaction_subtracts_from_wallet(monkeypatch):
    """Nếu một giao dịch tiết kiệm đã bị xóa mềm (do mục tiêu tiết kiệm), hoàn tác phải TRỪ ví, không cộng"""
    wallet = Wallet(id=1, user_id=1, balance=10000000)
    txn = Transaction(id=31, user_id=1, wallet_id=1, category_id=17, type="saving", amount=2000000,
                      txn_date=datetime.now(), source="manual", delete_at=datetime.now())
    monkeypatch.setattr(transaction_repo, "get_wallet_by_id", lambda db, wallet_id, user_id: wallet)
    monkeypatch.setattr(transaction_repo, "get_transaction_by_id", lambda db, txn_id, user_id, include_deleted=False: txn)
    res = client.post("/api/v1/transactions/31/restore")
    assert res.status_code == 200
    assert wallet.balance == 8000000
    assert txn.delete_at is None


def test_filter_transactions_by_saving_type(monkeypatch):
    captured = {}

    def fake_filtered(db, user_id, from_date, to_date, category_id, wallet_id, txn_type, search_q, skip, limit):
        captured["txn_type"] = txn_type
        return [], 0
    monkeypatch.setattr(transaction_repo, "get_filtered_transactions", fake_filtered)
    res = client.get("/api/v1/transactions?type=saving")
    assert res.status_code == 200
    assert captured["txn_type"] == "saving"
