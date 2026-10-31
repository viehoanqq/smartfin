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
def setup_mocks():
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