
from typing import Dict, Optional, List

from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from datetime import date, datetime
from app.models.domain import Transaction, Wallet, NLPFeedback
from app.schemas.transaction import TransactionCreate
from app.core.rules import balance_delta

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
    
def get_filtered_transactions(
    db: Session,
    user_id: int,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    category_id: Optional[int] = None,
    wallet_id: Optional[int] = None,
    txn_type: Optional[str] = None,
    search_q: Optional[str] = None,
    skip: int = 0,
    limit: int = 20
):
    query = db.query(Transaction).filter(
        Transaction.user_id == user_id,
        Transaction.deleted_at.is_(None)
    )

    # Áp dụng các bộ lọc nếu có truyền lên
    if from_date:
        query = query.filter(func.date(Transaction.txn_date) >= from_date)
    if to_date:
        query = query.filter(func.date(Transaction.txn_date) <= to_date)
    if category_id:
        query = query.filter(Transaction.category_id == category_id)
    if wallet_id:
        query = query.filter(Transaction.wallet_id == wallet_id)
    if txn_type:
        query = query.filter(Transaction.type == txn_type)
    if search_q:
        # Tìm kiếm không phân biệt hoa thường trong phần ghi chú (note)
        query = query.filter(Transaction.note.ilike(f"%{search_q}%"))

    # Đếm tổng số bản ghi khớp điều kiện (để FE tính số trang)
    total = query.count()

    # Lấy dữ liệu phân trang
    items = (
        query.order_by(Transaction.txn_date.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return items, total


def get_all_for_export(db: Session, user_id: int, from_date: Optional[date] = None, to_date: Optional[date] = None):
    """Lấy toàn bộ giao dịch (không phân trang) để xuất ra file CSV"""
    query = db.query(Transaction).filter(Transaction.user_id == user_id, Transaction.deleted_at.is_(None))
    if from_date:
        query = query.filter(func.date(Transaction.txn_date) >= from_date)
    if to_date:
        query = query.filter(func.date(Transaction.txn_date) <= to_date)
    return query.order_by(Transaction.txn_date.desc()).all()


# --- 2. HÀM TẠO NHIỀU GIAO DỊCH CÙNG LÚC (BULK ATOMIC) ---
def create_bulk_transactions_atomic(
    db: Session,
    user_id: int,
    transactions_in: List[TransactionCreate],
    wallets_map: Dict[int, Wallet] # Map {wallet_id: Wallet_Object}
) -> List[Transaction]:
    try:
        created_txns = []
        for txn_in in transactions_in:
            # 1. Tạo record giao dịch
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
            db.flush()

            # 2. Cộng/Trừ số dư trên đúng cái Ví của giao dịch đó
            wallet = wallets_map[txn_in.wallet_id]
            delta = balance_delta(txn_in.type, txn_in.amount)
            wallet.balance += delta

            # 3. Lưu NLP Feedback nếu có
            if txn_in.source == "nlp" and txn_in.feedback and txn_in.raw_text:
                fb = NLPFeedback(
                    user_id=user_id,
                    transaction_id=new_txn.id,
                    raw_text=txn_in.raw_text,
                    predicted_json=txn_in.feedback.predicted_json,
                    corrected_json=txn_in.feedback.corrected_json
                )
                db.add(fb)

            created_txns.append(new_txn)

        # CHỐT HẠ: Cả đám thành công hết thì mới commit! 1 thằng lỗi là rollback sạch!
        db.commit()
        for t in created_txns:
            db.refresh(t)
        return created_txns

    except Exception as e:
        db.rollback()
        raise e