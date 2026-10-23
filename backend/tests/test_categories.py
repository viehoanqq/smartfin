"""Test dịch vụ danh mục. Cần PostgreSQL thật (có pgvector) vì model dùng ARRAY/vector.

Chạy: đặt TEST_DATABASE_URL trỏ tới một database RIÊNG để test (không dùng DB dev), ví dụ
    postgresql+psycopg://postgres:<mat_khau>@localhost:5434/smartfin_test
rồi: pytest tests/test_categories.py -q
Mỗi test chạy trong một transaction và được rollback, không để lại dữ liệu.
"""
import os

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from app.db.base import Base
from app.models.domain import Budget, Category, Transaction, User, Wallet
from app.services import category as svc
from app.services.category import CategoryError

URL = os.getenv("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not URL, reason="Chưa đặt TEST_DATABASE_URL")


@pytest.fixture(scope="module")
def engine():
    eng = create_engine(URL)
    with eng.begin() as c:
        c.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    Base.metadata.create_all(eng)
    yield eng
    eng.dispose()


@pytest.fixture()
def db(engine):
    conn = engine.connect()
    outer = conn.begin()
    session = Session(bind=conn, join_transaction_mode="create_savepoint")
    yield session
    session.close()
    outer.rollback()
    conn.close()


def _user_wallet(db):
    u = User(email="a@test.vn", password_hash="x")
    db.add(u); db.flush()
    w = Wallet(user_id=u.id, name="Tiền mặt", type="cash", initial_balance=0, balance=0)
    db.add(w); db.flush()
    return u, w


def test_create_and_duplicate_name(db):
    svc.create_category(db, "Nuôi mèo", ["hạt"])
    with pytest.raises(CategoryError) as e:
        svc.create_category(db, "nuôi MÈO", [])
    assert e.value.code == "CATEGORY_DUPLICATED"


def test_update_and_hide(db):
    c = svc.create_category(db, "Cafe", [])
    c = svc.update_category(db, c.id, is_hidden=True)
    assert c.is_hidden is True
    assert c.id not in [x.id for x in svc.list_categories(db)]
    assert c.id in [x.id for x in svc.list_categories(db, include_hidden=True)]


def test_merge_moves_transactions_and_hides_source(db):
    u, w = _user_wallet(db)
    src = svc.create_category(db, "Cafe", ["cf"])
    dst = svc.create_category(db, "Cà phê", ["cà phê"])
    for amt in (25000, 30000):
        db.add(Transaction(user_id=u.id, wallet_id=w.id, category_id=src.id, type="expense", amount=amt))
    db.flush()
    res = svc.merge_categories(db, src.id, dst.id)
    assert res["transactions_moved"] == 2
    assert db.get(Category, src.id).is_hidden is True
    assert db.query(Transaction).filter_by(category_id=dst.id).count() == 2
    assert set(db.get(Category, dst.id).keywords) == {"cà phê", "cf"}


def test_merge_combines_budgets_of_same_user(db):
    u, _ = _user_wallet(db)
    src = svc.create_category(db, "A", [])
    dst = svc.create_category(db, "B", [])
    db.add_all([
        Budget(user_id=u.id, category_id=src.id, budget_amount=1_000_000, current_amount=200_000),
        Budget(user_id=u.id, category_id=dst.id, budget_amount=500_000, current_amount=100_000),
    ])
    db.flush()
    res = svc.merge_categories(db, src.id, dst.id)
    assert res["budgets_combined"] == 1
    b = db.query(Budget).filter_by(user_id=u.id, category_id=dst.id).one()
    assert (b.budget_amount, b.current_amount) == (1_500_000, 300_000)
    assert db.query(Budget).filter_by(category_id=src.id).count() == 0


def test_merge_rejects_same_or_hidden_target(db):
    a = svc.create_category(db, "A", [])
    h = svc.update_category(db, svc.create_category(db, "H", []).id, is_hidden=True)
    with pytest.raises(CategoryError):
        svc.merge_categories(db, a.id, a.id)
    with pytest.raises(CategoryError):
        svc.merge_categories(db, a.id, h.id)
