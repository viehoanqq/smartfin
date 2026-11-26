from datetime import date, datetime
from typing import Dict, List, Optional

from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from app.core.rules import balance_delta
from app.models.domain import NLPFeedback, Transaction, Wallet
from app.schemas.transaction import TransactionCreate


def get_wallet_by_id(db: Session, wallet_id: int, user_id: int):
    return db.query(Wallet).filter(Wallet.id == wallet_id, Wallet.user_id == user_id).first()


def get_transaction_by_id(db: Session, txn_id: int, user_id: int, include_deleted: bool = False):
    query = db.query(Transaction).filter(Transaction.id == txn_id, Transaction.user_id == user_id)
    if not include_deleted:
        query = query.filter(Transaction.delete_at.is_(None))
    return query.first()


def get_user_transactions(db: Session, user_id: int, skip: int = 0, limit: int = 50):
    return (
        db.query(Transaction)
        .filter(Transaction.user_id == user_id, Transaction.delete_at.is_(None))
        .order_by(Transaction.txn_date.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def create_transaction_atomic(
    db: Session,
    user_id: int,
    wallet: Wallet,
    txn_in: TransactionCreate,
    amount_delta: int
) -> Transaction:
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

    wallet.balance += amount_delta

    if txn_in.source == "nlp" and getattr(txn_in, "feedback", None) and txn_in.raw_text:
        fb = NLPFeedback(
            user_id=user_id,
            transaction_id=new_txn.id,
            raw_text=txn_in.raw_text,
            predicted_json=txn_in.feedback.predicted_json,
            corrected_json=txn_in.feedback.corrected_json
        )
        db.add(fb)

    db.flush()
    return new_txn


def update_transaction_atomic(
    db: Session,
    txn: Transaction,
    old_wallet: Wallet,
    new_wallet: Wallet,
    revert_delta: int,
    apply_delta: int,
    update_fields: dict
) -> Transaction:
    old_wallet.balance += revert_delta

    for key, value in update_fields.items():
        setattr(txn, key, value)

    new_wallet.balance += apply_delta
    db.flush()
    return txn


def soft_delete_transaction_atomic(db: Session, txn: Transaction, wallet: Wallet, revert_delta: int):
    # The service commits wallet, transaction, budget and notification together.
    wallet.balance += revert_delta
    txn.delete_at = func.now()
    db.flush()
    return True


def restore_transaction_atomic(db: Session, txn: Transaction, wallet: Wallet, apply_delta: int) -> Transaction:
    wallet.balance += apply_delta
    txn.delete_at = None
    db.flush()
    return txn
    
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
        Transaction.delete_at.is_(None)
    )

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
        query = query.filter(Transaction.note.ilike(f"%{search_q}%"))

    total = query.count()

    items = (
        query.order_by(Transaction.txn_date.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return items, total


def get_all_for_export(db: Session, user_id: int, from_date: Optional[date] = None, to_date: Optional[date] = None):
    """Lấy toàn bộ giao dịch (không phân trang) để xuất ra file CSV"""
    query = db.query(Transaction).filter(Transaction.user_id == user_id, Transaction.delete_at.is_(None))
    if from_date:
        query = query.filter(func.date(Transaction.txn_date) >= from_date)
    if to_date:
        query = query.filter(func.date(Transaction.txn_date) <= to_date)
    return query.order_by(Transaction.txn_date.desc()).all()


def create_bulk_transactions_atomic(
    db: Session,
    user_id: int,
    transactions_in: List[TransactionCreate],
    wallets_map: Dict[int, Wallet]
) -> List[Transaction]:
    created_txns = []
    for txn_in in transactions_in:
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

        wallet = wallets_map[txn_in.wallet_id]
        delta = balance_delta(txn_in.type, txn_in.amount)
        wallet.balance += delta

        if txn_in.source == "nlp" and getattr(txn_in, "feedback", None) and txn_in.raw_text:
            fb = NLPFeedback(
                user_id=user_id,
                transaction_id=new_txn.id,
                raw_text=txn_in.raw_text,
                predicted_json=txn_in.feedback.predicted_json,
                corrected_json=txn_in.feedback.corrected_json
            )
            db.add(fb)

        created_txns.append(new_txn)

    db.flush()
    return created_txns
