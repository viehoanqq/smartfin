import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import io
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from datetime import datetime, date

from main import app
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.domain import User, Wallet, Transaction
from app.repositories import transaction_repo

# --- 1. SETUP GIẢ LẬP (MOCK DÙNG CHUNG) ---
def override_get_current_user():
    return User(
        id=1,
        email="admin@gmail.com",
        full_name="Nguyễn Việt Hoàng",
        role="admin",
        monthly_income=5000000
    )

def override_get_db():
    db = MagicMock()
    yield db

@pytest.fixture(autouse=True)
def setup_mocks(monkeypatch):
    from app.db import session as db_module
    def forbidden(*args, **kwargs):
        raise AssertionError('Application database access is forbidden in tests')
    monkeypatch.setattr(db_module.engine, 'connect', forbidden)
    monkeypatch.setattr(db_module, 'SessionLocal', forbidden)
    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()

client = TestClient(app)


# --- 2. CÁC TEST CASES CHO TRANSACTION (UC02 & UC01) ---

def test_create_expense_transaction_success(monkeypatch):
    """Test tạo giao dịch CHI TIÊU thủ công -> Số dư ví phải bị TRỪ đi tương ứng"""
    # Giả lập 1 ví đang có sẵn 1.000.000đ
    mock_wallet = Wallet(id=1, user_id=1, name="Ví Tiền Mặt", balance=1000000)

    # Khi Service gọi get_wallet_by_id, trả về cái ví giả lập này
    monkeypatch.setattr(transaction_repo, "get_wallet_by_id", lambda db, wallet_id, user_id: mock_wallet)

    # Giả lập hàm lưu DB của Repo: Cập nhật số dư ví và trả về object Transaction
    def mock_create_atomic(db, user_id, wallet, txn_in, amount_delta):
        wallet.balance += amount_delta
        return Transaction(
            id=101,
            user_id=user_id,
            wallet_id=txn_in.wallet_id,
            category_id=txn_in.category_id,
            type=txn_in.type,
            amount=txn_in.amount,
            txn_date=txn_in.txn_date or datetime.now(),
            note=txn_in.note,
            source=txn_in.source
        )
    monkeypatch.setattr(transaction_repo, "create_transaction_atomic", mock_create_atomic)

    payload = {
        "wallet_id": 1,
        "category_id": 2,
        "type": "expense",
        "amount": 45000,
        "note": "Ăn phở bò",
        "source": "manual"
    }

    response = client.post("/api/v1/transactions", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert data["amount"] == 45000
    assert data["type"] == "expense"
    assert data["note"] == "Ăn phở bò"
    # KIỂM TRA QUAN TRỌNG: Ví 1.000.000đ trừ 45.000đ phải còn 955.000đ
    assert mock_wallet.balance == 955000


def test_create_transaction_invalid_amount():
    """Test Ngoại lệ 4a (UC02): Số tiền <= 0 phải bị chặn ngay và trả lỗi 422"""
    payload = {
        "wallet_id": 1,
        "category_id": 2,
        "type": "expense",
        "amount": -50000, # Số tiền âm không hợp lệ
        "note": "Nhập sai tiền"
    }
    response = client.post("/api/v1/transactions", json=payload)
    assert response.status_code == 422


def test_create_transaction_unauthorized_wallet(monkeypatch):
    """Test Ngoại lệ 4a (UC02): Ví không tồn tại hoặc không thuộc người dùng -> Lỗi 422"""
    # Giả lập tìm không thấy ví của user này (trả về None)
    monkeypatch.setattr(transaction_repo, "get_wallet_by_id", lambda db, wallet_id, user_id: None)

    payload = {
        "wallet_id": 999,
        "category_id": 2,
        "type": "expense",
        "amount": 50000
    }
    response = client.post("/api/v1/transactions", json=payload)
    assert response.status_code == 422
    assert response.json()["detail"] == "Ví không tồn tại hoặc không thuộc người dùng"


def test_update_transaction_revert_and_apply_balance(monkeypatch):
    """Test Sửa giao dịch (UC02): Hoàn tác số dư cũ rồi áp dụng giá trị mới"""
    # Giả sử ban đầu ví có 1.000.000đ, đã chi 50.000đ -> Hiện tại ví còn 950.000đ
    mock_wallet = Wallet(id=1, user_id=1, balance=950000)
    existing_txn = Transaction(
        id=10, user_id=1, wallet_id=1, category_id=2,
        type="expense", amount=50000, txn_date=datetime.now(), source="manual"
    )

    monkeypatch.setattr(transaction_repo, "get_transaction_by_id", lambda db, txn_id, user_id: existing_txn)
    monkeypatch.setattr(transaction_repo, "get_wallet_by_id", lambda db, wallet_id, user_id: mock_wallet)

    # Người dùng sửa lại số tiền chi từ 50.000đ lên 80.000đ
    update_payload = {
        "amount": 80000,
        "note": "Sửa lại tiền ăn"
    }

    response = client.put("/api/v1/transactions/10", json=update_payload)

    assert response.status_code == 200
    data = response.json()
    assert data["amount"] == 80000
    # KIỂM TRA SỐ DƯ: 950.000đ + 50.000đ (hoàn tác cũ) - 80.000đ (áp dụng mới) = 920.000đ
    assert mock_wallet.balance == 920000


def test_soft_delete_and_restore_transaction(monkeypatch):
    """Test Xóa mềm & Hoàn tác trong 5s (UC02): Kiểm tra việc hoàn tiền và trừ lại tiền"""
    # Ví đang còn 900.000đ sau khi đã tiêu 100.000đ
    mock_wallet = Wallet(id=1, user_id=1, balance=900000)
    existing_txn = Transaction(
        id=20, user_id=1, wallet_id=1, category_id=2,
        type="expense", amount=100000, txn_date=datetime.now(), source="manual", delete_at=None
    )

    monkeypatch.setattr(transaction_repo, "get_wallet_by_id", lambda db, wallet_id, user_id: mock_wallet)
    monkeypatch.setattr(
        transaction_repo, 
        "get_transaction_by_id", 
        lambda db, txn_id, user_id, include_deleted=False: existing_txn
    )

    # --- BƯỚC 1: XÓA MỀM ---
    res_delete = client.delete("/api/v1/transactions/20")
    assert res_delete.status_code == 200
    # Sau khi xóa khoản chi 100k, tiền trong ví phải được cộng trả lại lên 1.000.000đ
    assert mock_wallet.balance == 1000000
    assert existing_txn.delete_at is not None

    # --- BƯỚC 2: BẤM HOÀN TÁC (RESTORE) ---
    res_restore = client.post("/api/v1/transactions/20/restore")
    assert res_restore.status_code == 200
    # Khôi phục lại giao dịch thì ví phải bị trừ lại 100k -> Về 900.000đ, delete_at về None
    assert mock_wallet.balance == 900000
    assert existing_txn.delete_at is None
    
def test_get_transactions_filtered_and_paginated(monkeypatch):
    """Test API lấy danh sách giao dịch có lọc đa điều kiện và phân trang"""
    mock_txns = [
        Transaction(
            id=1, user_id=1, wallet_id=1, category_id=2,
            type="expense", amount=45000, txn_date=datetime(2026, 10, 14, 8, 30),
            note="Ăn phở bò", source="manual"
        ),
        Transaction(
            id=2, user_id=1, wallet_id=1, category_id=2,
            type="expense", amount=25000, txn_date=datetime(2026, 10, 14, 9, 0),
            note="Cafe phở", source="nlp"
        )
    ]

    # Giả lập Repo trả về 2 bản ghi và tổng số bản ghi khớp điều kiện là 2
    monkeypatch.setattr(
        transaction_repo,
        "get_filtered_transactions",
        lambda **kwargs: (mock_txns, 2)
    )

    response = client.get("/api/v1/transactions?from=2026-10-01&to=2026-10-31&type=expense&q=phở&page=1&size=10")

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert data["page"] == 1
    assert data["total_pages"] == 1
    assert len(data["items"]) == 2
    assert data["items"][0]["note"] == "Ăn phở bò"


def test_create_bulk_transactions_success(monkeypatch):
    """Test API POST /transactions/bulk: Tạo nhiều giao dịch cùng lúc (Dùng cho NLP & Import Commit)"""
    # Giả lập 2 ví khác nhau của người dùng: Ví Tiền Mặt (1tr) và Ví MoMo (500k)
    wallet_cash = Wallet(id=1, user_id=1, name="Tiền mặt", balance=1000000)
    wallet_momo = Wallet(id=2, user_id=1, name="MoMo", balance=500000)
    wallets_db = {1: wallet_cash, 2: wallet_momo}

    monkeypatch.setattr(
        transaction_repo,
        "get_wallet_by_id",
        lambda db, wallet_id, user_id: wallets_db.get(wallet_id)
    )

    # Giả lập hàm gán ID tự động khi chạy db.flush() trong Repo
    def mock_bulk_atomic(db, user_id, transactions_in, wallets_map):
        created = []
        for idx, t in enumerate(transactions_in, start=201):
            w = wallets_map[t.wallet_id]
            w.balance += (-t.amount if t.type == "expense" else t.amount)
            created.append(Transaction(
                id=idx, user_id=user_id, wallet_id=t.wallet_id, category_id=t.category_id,
                type=t.type, amount=t.amount, txn_date=datetime.now(), note=t.note, source=t.source
            ))
        return created

    monkeypatch.setattr(transaction_repo, "create_bulk_transactions_atomic", mock_bulk_atomic)

    # Kịch bản câu NLP: "ăn phở 45k tiền mặt, cafe 25k momo"
    bulk_payload = {
        "transactions": [
            {"wallet_id": 1, "category_id": 2, "type": "expense", "amount": 45000, "note": "ăn phở", "source": "nlp"},
            {"wallet_id": 2, "category_id": 3, "type": "expense", "amount": 25000, "note": "cafe", "source": "nlp"}
        ]
    }

    response = client.post("/api/v1/transactions/bulk", json=bulk_payload)

    assert response.status_code == 201
    data = response.json()
    assert len(data) == 2
    # Kiểm tra cả 2 ví đều bị trừ tiền chuẩn xác
    assert wallet_cash.balance == 955000  # 1.000.000 - 45.000
    assert wallet_momo.balance == 475000  # 500.000 - 25.000


def test_import_transactions_csv_preview(monkeypatch):
    """Test API POST /transactions/import: Đọc file CSV và kiểm tra hợp lệ từng dòng"""
    mock_wallet = Wallet(id=1, user_id=1, balance=1000000)
    # Chỉ ví ID = 1 là hợp lệ, các ví khác trả về None
    monkeypatch.setattr(
        transaction_repo,
        "get_wallet_by_id",
        lambda db, wallet_id, user_id: mock_wallet if wallet_id == 1 else None
    )

    # Tạo nội dung file CSV giả gồm 2 dòng:
    # Dòng 1: Hợp lệ hoàn toàn
    # Dòng 2: Sai số tiền (-10000) -> Phải bị đánh dấu is_valid = False
    csv_content = (
        "wallet_id,category_id,type,amount,note\n"
        "1,2,expense,35000,Ăn sáng bún bò\n"
        "1,2,expense,-10000,Dòng bị lỗi số tiền âm\n"
    ).encode("utf-8")

    files = {
        "file": ("transactions.csv", csv_content, "text/csv")
    }

    response = client.post("/api/v1/transactions/import", files=files)

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    
    # Kiểm tra dòng 1 (Hợp lệ)
    assert data[0]["row_number"] == 1
    assert data[0]["is_valid"] is True
    assert data[0]["amount"] == 35000
    
    # Kiểm tra dòng 2 (Không hợp lệ)
    assert data[1]["row_number"] == 2
    assert data[1]["is_valid"] is False
    assert data[1]["error_message"] == "Số tiền phải > 0"


def test_export_transactions_csv(monkeypatch):
    """Test API GET /transactions/export: Tải xuống danh sách giao dịch dưới dạng CSV"""
    mock_txns = [
        Transaction(
            id=1, user_id=1, wallet_id=1, category_id=2,
            type="expense", amount=50000, txn_date=datetime(2026, 10, 14, 12, 0),
            note="Cơm trưa văn phòng", source="manual"
        )
    ]
    monkeypatch.setattr(transaction_repo, "get_all_for_export", lambda db, user_id, from_date, to_date: mock_txns)

    response = client.get("/api/v1/transactions/export")

    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert "attachment; filename=smartfin_transactions.csv" in response.headers["content-disposition"]
    
    # Kiểm tra nội dung text bên trong file CSV tải về có chứa đúng dữ liệu không
    csv_text = response.text
    assert "Cơm trưa văn phòng" in csv_text
    assert "50000" in csv_text
# Budget notifications: integration coverage on a private database, never PostgreSQL.
@pytest.fixture
def budget_db(setup_mocks, monkeypatch):
    from sqlalchemy import create_engine, MetaData, Integer, JSON
    from sqlalchemy.orm import Session
    from sqlalchemy.pool import StaticPool
    from app.db import session as db_module
    from app.models import Category, Budget, Notification
    def forbidden(*args, **kwargs):
        raise AssertionError('Application database access is forbidden in tests')
    monkeypatch.setattr(db_module.engine, 'connect', forbidden)
    monkeypatch.setattr(db_module, 'SessionLocal', forbidden)
    engine = create_engine('sqlite+pysqlite:///:memory:', poolclass=StaticPool,
                           connect_args={'check_same_thread': False})
    assert engine.dialect.name == 'sqlite' and engine.url.database == ':memory:'
    metadata = MetaData()
    for model in (User, Wallet, Category, Budget, Transaction, Notification):
        table = model.__table__.to_metadata(metadata)
        table.c.id.type = Integer()
        if model is Category:
            table.c.keywords.type = JSON()
    metadata.create_all(engine)
    db = Session(engine, autoflush=False)
    app.dependency_overrides[get_db] = lambda: db
    db.add_all([User(id=1, email='budget@example.com', password_hash='unused', role='user'),
                User(id=2, email='other@example.com', password_hash='unused', role='user'),
                Category(id=1, name='Food'), Category(id=2, name='Travel')])
    db.flush()
    db.add_all([Wallet(id=1, user_id=1, name='Main', initial_balance=10000, balance=10000),
                Wallet(id=2, user_id=2, name='Other', initial_balance=10000, balance=10000),
                Budget(id=1, user_id=1, category_id=1, budget_amount=1000, current_amount=0),
                Budget(id=2, user_id=1, category_id=2, budget_amount=1000, current_amount=0),
                Budget(id=3, user_id=2, category_id=1, budget_amount=1000, current_amount=0)])
    db.commit()
    try:
        yield db
    finally:
        db.close()
        engine.dispose()


def budget_create(amount, **extra):
    return client.post('/api/v1/transactions', json={
        'wallet_id': 1, 'category_id': 1, 'type': 'expense', 'amount': amount, **extra})


def budget_notices(db):
    from sqlalchemy import select
    from app.models import Notification
    return db.scalars(select(Notification).order_by(Notification.id)).all()


@pytest.mark.parametrize('amount,expected', [(799, []), (800, ['budget_80']),
    (999, ['budget_80']), (1000, ['budget_100']), (1200, ['budget_100'])])
def test_budget_threshold_boundaries(budget_db, amount, expected):
    from app.models import Budget
    assert budget_create(amount).status_code == 201
    assert [item.type for item in budget_notices(budget_db)] == expected
    assert all(item.user_id == 1 and item.is_read is False for item in budget_notices(budget_db))
    assert budget_db.get(Budget, 1).current_amount == amount
    assert budget_db.get(Wallet, 1).balance == 10000 - amount


def test_budget_levels_once_after_delete_restore(budget_db):
    from app.models import Budget
    first = budget_create(800).json()['id']
    assert budget_create(200).status_code == 201
    assert budget_create(100).status_code == 201
    assert [n.type for n in budget_notices(budget_db)] == ['budget_80', 'budget_100']
    assert client.delete(f'/api/v1/transactions/{first}').status_code == 200
    assert budget_db.get(Transaction, first).delete_at is not None
    assert budget_db.get(Budget, 1).current_amount == 300
    assert budget_db.get(Wallet, 1).balance == 9700
    assert client.post(f'/api/v1/transactions/{first}/restore').status_code == 200
    assert budget_db.get(Transaction, first).delete_at is None
    assert budget_db.get(Budget, 1).current_amount == 1100
    assert budget_db.get(Wallet, 1).balance == 8900
    assert client.post(f'/api/v1/transactions/{first}/restore').status_code == 404
    assert len(budget_notices(budget_db)) == 2
    assert budget_db.get(Budget, 1).alert_sent_level == 100


def test_budget_update_moves_both_budgets(budget_db):
    from app.models import Budget
    txn = budget_create(700).json()['id']
    response = client.put(f'/api/v1/transactions/{txn}', json={'amount': 1000, 'category_id': 2})
    assert response.status_code == 200
    assert budget_db.get(Budget, 1).current_amount == 0
    assert budget_db.get(Budget, 2).current_amount == 1000
    assert [n.type for n in budget_notices(budget_db)] == ['budget_100']
    assert budget_notices(budget_db)[0].content == 'Ngân sách Travel đã đạt hạn mức.'
    assert budget_db.get(Wallet, 1).balance == 9000


def test_budget_bulk_only_highest_final_level(budget_db):
    payload = {'transactions': [{'wallet_id': 1, 'category_id': 1, 'type': 'expense', 'amount': amount}
                                for amount in [800, 200, 100]]}
    assert client.post('/api/v1/transactions/bulk', json=payload).status_code == 201
    assert [n.type for n in budget_notices(budget_db)] == ['budget_100']


def test_budget_income_and_other_owner_no_notification(budget_db):
    assert budget_create(1200, type='income').status_code == 201
    assert budget_create(1200, wallet_id=2).status_code == 422
    assert budget_notices(budget_db) == []


@pytest.mark.parametrize('operation', ['create', 'update', 'delete', 'restore', 'bulk'])
def test_budget_notice_failure_rolls_back_everything(budget_db, monkeypatch, operation):
    from sqlalchemy import select
    from app.models import Budget
    from app.repositories import notification_repo
    txn_id = None
    if operation != 'create' and operation != 'bulk':
        txn_id = budget_create(900).json()['id']
        if operation == 'restore':
            assert client.delete(f'/api/v1/transactions/{txn_id}').status_code == 200
        # Simulate an existing unnotified budget; only this isolated test DB is changed.
        budget_db.get(Budget, 1).alert_sent_level = None
        budget_db.commit()
    before_wallet = budget_db.get(Wallet, 1).balance
    before_spent = budget_db.get(Budget, 1).current_amount
    before_txns = [(t.id, t.amount, t.delete_at) for t in budget_db.scalars(select(Transaction)).all()]
    before_notices = len(budget_notices(budget_db))
    add_notice = notification_repo.add_budget_notice
    def fail(*args, **kwargs):
        add_notice(*args, **kwargs)
        args[0].flush()
        raise RuntimeError('Simulated budget notification failure')
    monkeypatch.setattr(notification_repo, 'add_budget_notice', fail)
    if operation == 'create':
        response = budget_create(800)
    elif operation == 'bulk':
        response = client.post('/api/v1/transactions/bulk', json={'transactions': [
            {'wallet_id': 1, 'category_id': 1, 'type': 'expense', 'amount': 1000}]})
    elif operation == 'update':
        response = client.put(f'/api/v1/transactions/{txn_id}', json={'amount': 1000})
    elif operation == 'delete':
        # Keep remaining spending above 80% after removing a small expense.
        extra = Transaction(user_id=1, wallet_id=1, category_id=1, budget_id=1,
                            type='expense', amount=10, source='manual')
        budget_db.add(extra)
        budget_db.get(Wallet, 1).balance -= 10
        budget_db.get(Budget, 1).current_amount += 10
        budget_db.commit()
        before_wallet -= 10
        before_spent += 10
        before_txns = [(t.id, t.amount, t.delete_at) for t in budget_db.scalars(select(Transaction)).all()]
        response = client.delete(f'/api/v1/transactions/{extra.id}')
    else:
        response = client.post(f'/api/v1/transactions/{txn_id}/restore')
    assert response.status_code == 500
    budget_db.expire_all()
    assert budget_db.get(Wallet, 1).balance == before_wallet
    assert budget_db.get(Budget, 1).current_amount == before_spent
    assert [(t.id, t.amount, t.delete_at) for t in budget_db.scalars(select(Transaction)).all()] == before_txns
    assert len(budget_notices(budget_db)) == before_notices
    assert budget_db.get(Budget, 1).alert_sent_level is None or operation in ['create', 'bulk']


def test_budget_sync_does_not_notify_foreign_owner(budget_db):
    from app.models import Budget
    from app.services.budget_service import BudgetService
    foreign = budget_db.get(Budget, 3)
    foreign.current_amount = 2000
    budget_db.commit()
    BudgetService.sync_budget_spent(budget_db, 3, user_id=1)
    budget_db.commit()
    assert budget_notices(budget_db) == []
    assert foreign.current_amount == 2000


def test_budget_update_crosses_threshold_once(budget_db):
    txn = budget_create(700).json()['id']
    for amount in [800, 900, 1000, 1100]:
        assert client.put(f'/api/v1/transactions/{txn}', json={'amount': amount}).status_code == 200
    assert [n.type for n in budget_notices(budget_db)] == ['budget_80', 'budget_100']


def test_budget_restore_can_generate_first_alert(budget_db):
    from app.models import Budget
    txn = Transaction(user_id=1, wallet_id=1, category_id=1, budget_id=1,
                      type='expense', amount=800, source='manual', delete_at=datetime.now())
    budget_db.add(txn)
    budget_db.commit()
    assert client.post(f'/api/v1/transactions/{txn.id}/restore').status_code == 200
    assert [n.type for n in budget_notices(budget_db)] == ['budget_80']
    assert budget_db.get(Budget, 1).alert_sent_level == 80
    assert budget_db.get(Wallet, 1).balance == 9200


@pytest.mark.parametrize('spent,expected', [
    (800000, 'Ngân sách Ăn uống sắp đạt hạn mức. Đã chi 800.000đ / 1.000.000đ (80%).'),
    (805000, 'Ngân sách Ăn uống sắp đạt hạn mức. Đã chi 805.000đ / 1.000.000đ (80,5%).'),
    (999999, 'Ngân sách Ăn uống sắp đạt hạn mức. Đã chi 999.999đ / 1.000.000đ (99,99%).'),
    (1000000, 'Ngân sách Ăn uống đã đạt hạn mức.'),
    (1250000, 'Ngân sách Ăn uống đã vượt hạn mức. Đã chi 1.250.000đ / 1.000.000đ (125%), vượt 250.000đ.'),
    (1333333, 'Ngân sách Ăn uống đã vượt hạn mức. Đã chi 1.333.333đ / 1.000.000đ (133,33%), vượt 333.333đ.'),
])
def test_budget_notification_content_uses_category_and_vnd(budget_db, spent, expected):
    from app.models import Budget, Category
    budget_db.get(Category, 1).name = 'Ăn uống'
    budget_db.get(Budget, 1).budget_amount = 1000000
    budget_db.get(Wallet, 1).balance = 2000000
    budget_db.commit()
    assert budget_create(spent).status_code == 201
    notice = budget_notices(budget_db)[0]
    assert notice.content == expected
    assert notice.title == expected.split('. Đã chi')[0].rstrip('.')
    assert '#1' not in notice.content


def test_budget_notice_name_is_loaded_from_database(budget_db):
    from app.models import Category
    budget_db.get(Category, 1).name = 'Danh mục đổi tên'
    budget_db.commit()
    assert budget_create(800).status_code == 201
    assert budget_notices(budget_db)[0].content.startswith('Ngân sách Danh mục đổi tên sắp đạt hạn mức.')
