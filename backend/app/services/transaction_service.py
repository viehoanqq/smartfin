from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.schemas.transaction import TransactionCreate, TransactionUpdate
from app.repositories import transaction_repo

class TransactionService:
    
    @staticmethod
    def get_transactions(db: Session, user_id: int, skip: int = 0, limit: int = 50):
        return transaction_repo.get_user_transactions(db, user_id, skip, limit)

    @staticmethod
    def create_transaction(db: Session, user_id: int, data: TransactionCreate):
        # 1. Kiểm tra ví có thuộc về người dùng không (Ngoại lệ 4a - UC02)
        wallet = transaction_repo.get_wallet_by_id(db, data.wallet_id, user_id)
        if not wallet:
            raise HTTPException(status_code=422, detail="Ví không tồn tại hoặc không thuộc người dùng")

        # 2. Tính toán độ lệch số dư (Chi thì trừ, Thu thì cộng)
        amount_delta = -data.amount if data.type == "expense" else data.amount

        # 3. Gọi Repo thực thi trọn gói trong 1 DB Transaction
        try:
            return transaction_repo.create_transaction_atomic(
                db=db,
                user_id=user_id,
                wallet=wallet,
                txn_in=data,
                amount_delta=amount_delta
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Không thể lưu giao dịch: {str(e)}")

    @staticmethod
    def update_transaction(db: Session, user_id: int, txn_id: int, data: TransactionUpdate):
        # 1. Tìm giao dịch hiện tại
        txn = transaction_repo.get_transaction_by_id(db, txn_id, user_id)
        if not txn:
            raise HTTPException(status_code=404, detail="Không tìm thấy giao dịch")

        # 2. Lấy ví cũ và tính số tiền cần hoàn tác
        old_wallet = transaction_repo.get_wallet_by_id(db, txn.wallet_id, user_id)
        revert_delta = txn.amount if txn.type == "expense" else -txn.amount

        # 3. Xác định các thông tin mới sau khi sửa
        update_fields = data.model_dump(exclude_unset=True)
        new_wallet_id = update_fields.get("wallet_id", txn.wallet_id)
        new_type = update_fields.get("type", txn.type)
        new_amount = update_fields.get("amount", txn.amount)

        # 4. Kiểm tra ví mới (nếu người dùng đổi sang ví khác)
        new_wallet = old_wallet if new_wallet_id == txn.wallet_id else transaction_repo.get_wallet_by_id(db, new_wallet_id, user_id)
        if not new_wallet:
            raise HTTPException(status_code=422, detail="Ví mới không tồn tại hoặc không thuộc người dùng")

        # 5. Tính số tiền mới cần áp dụng
        apply_delta = -new_amount if new_type == "expense" else new_amount

        # 6. Gọi Repo cập nhật nguyên tử
        try:
            return transaction_repo.update_transaction_atomic(
                db=db,
                txn=txn,
                old_wallet=old_wallet,
                new_wallet=new_wallet,
                revert_delta=revert_delta,
                apply_delta=apply_delta,
                update_fields=update_fields
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Lỗi cập nhật giao dịch: {str(e)}")

    @staticmethod
    def soft_delete_transaction(db: Session, user_id: int, txn_id: int):
        txn = transaction_repo.get_transaction_by_id(db, txn_id, user_id)
        if not txn:
            raise HTTPException(status_code=404, detail="Không tìm thấy giao dịch")

        wallet = transaction_repo.get_wallet_by_id(db, txn.wallet_id, user_id)
        revert_delta = txn.amount if txn.type == "expense" else -txn.amount

        try:
            transaction_repo.soft_delete_transaction_atomic(db, txn, wallet, revert_delta)
            return {"message": "Đã xóa giao dịch"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Lỗi khi xóa giao dịch: {str(e)}")

    @staticmethod
    def restore_transaction(db: Session, user_id: int, txn_id: int):
        txn = transaction_repo.get_transaction_by_id(db, txn_id, user_id, include_deleted=True)
        if not txn or txn.deleted_at is None:
            raise HTTPException(status_code=404, detail="Giao dịch không tồn tại hoặc chưa bị xóa")

        wallet = transaction_repo.get_wallet_by_id(db, txn.wallet_id, user_id)
        apply_delta = -txn.amount if txn.type == "expense" else txn.amount

        try:
            return transaction_repo.restore_transaction_atomic(db, txn, wallet, apply_delta)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Lỗi khi hoàn tác giao dịch: {str(e)}")