from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from datetime import datetime
from app.models.domain import Transaction, Wallet, NLPFeedback
from app.schemas.transaction import TransactionCreate

# --- CÁC HÀM TRUY VẤN (READ) ---

def get_wallet_by_id(db: Session, wallet_id: int, user_id: int):
    return db.query(Wallet).filter(Wallet.id == wallet_id, Wallet.user_id == user_id).first()

def get_transaction_by_id(db: Session, txn_id: int, user_id: int, include_deleted: bool = False):
    query = db.query(Transaction).filter(Transaction.id == txn_id, Transaction.user_id == user_id)
    if not include_deleted:
        query = query.filter(Transaction.deleted_at.is_(None))
    return query.first()

def get_user_transactions(db: Session, user_id: int, skip: int = 0, limit: int = 50):
    return (
        db.query(Transaction)
        .filter(Transaction.user_id == user_id, Transaction.deleted_at.is_(None))
        .order_by(Transaction.txn_date.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

# --- CÁC HÀM GHI DỮ LIỆU NGUYÊN TỬ (ATOMIC WRITE - 1 DB TRANSACTION) ---

def create_transaction_atomic(
    db: Session, 
    user_id: int, 
    wallet: Wallet, 
    txn_in: TransactionCreate, 
    amount_delta: int
) -> Transaction:
    try:
        # 1. Tạo bản ghi giao dịch mới
        new_txn = Transaction(
            user_id=user_id,
            wallet_id=txn_in.wallet_id,
            category_id=txn_in.category_id,
            type=txn_in.type,
            amount=txn_in.amount,
            txn_date=txn_in.txn_date or datetime.now(),
            note=txn_in.note,
            source=txn_in.source,
            raw_text=txn_in.raw_text,
            ai_confidence=txn_in.ai_confidence
        )
        db.add(new_txn)
        db.flush() # Lấy new_txn.id để dùng cho NLPFeedback nếu cần

        # 2. Cập nhật số dư ví
        wallet.balance += amount_delta

        # 3. Lưu feedback nếu là luồng NLP và người dùng có chỉnh sửa (UC01 - 5a)
        if txn_in.source == "nlp" and txn_in.feedback and txn_in.raw_text:
            fb = NLPFeedback(
                user_id=user_id,
                transaction_id=new_txn.id,
                raw_text=txn_in.raw_text,
                predicted_json=txn_in.feedback.predicted_json,
                corrected_json=txn_in.feedback.corrected_json
            )
            db.add(fb)

        # Chốt lưu toàn bộ vào CSDL
        db.commit()
        db.refresh(new_txn)
        return new_txn
    except Exception as e:
        db.rollback()
        raise e


def update_transaction_atomic(
    db: Session,
    txn: Transaction,
    old_wallet: Wallet,
    new_wallet: Wallet,
    revert_delta: int,
    apply_delta: int,
    update_fields: dict
) -> Transaction:
    try:
        # 1. Hoàn tác số dư trên ví cũ
        old_wallet.balance += revert_delta

        # 2. Cập nhật thông tin mới vào giao dịch
        for key, value in update_fields.items():
            setattr(txn, key, value)

        # 3. Áp dụng số dư mới lên ví mới (hoặc ví cũ nếu không đổi ví)
        new_wallet.balance += apply_delta

        db.commit()
        db.refresh(txn)
        return txn
    except Exception as e:
        db.rollback()
        raise e


def soft_delete_transaction_atomic(db: Session, txn: Transaction, wallet: Wallet, revert_delta: int):
    try:
        # 1. Hoàn lại số dư vào ví
        wallet.balance += revert_delta
        
        # 2. Đánh dấu xóa mềm
        txn.deleted_at = func.now()

        db.commit()
        return True
    except Exception as e:
        db.rollback()
        raise e


def restore_transaction_atomic(db: Session, txn: Transaction, wallet: Wallet, apply_delta: int) -> Transaction:
    try:
        # 1. Cộng/Trừ lại số dư vào ví
        wallet.balance += apply_delta
        
        # 2. Gỡ đánh dấu xóa mềm
        txn.deleted_at = None

        db.commit()
        db.refresh(txn)
        return txn
    except Exception as e:
        db.rollback()
        raise e