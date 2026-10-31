import csv
from datetime import date, datetime  
import math
from typing import Optional
from fastapi import UploadFile
import io

from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.schemas.transaction import TransactionBulkCreate, TransactionCreate, TransactionUpdate
from app.repositories import transaction_repo
from app.core.rules import balance_delta

SAVING_LOCKED_MSG = "Giao dịch tiết kiệm được quản lý ở mục Mục tiêu tiết kiệm, không sửa hoặc xóa tại đây"


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
        amount_delta = balance_delta(data.type, data.amount)

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
        if txn.type == "saving":
            raise HTTPException(status_code=400, detail=SAVING_LOCKED_MSG)
        
        # 2. Lấy ví cũ và tính số tiền cần hoàn tác
        old_wallet = transaction_repo.get_wallet_by_id(db, txn.wallet_id, user_id)
        revert_delta = -balance_delta(txn.type, txn.amount)

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
        apply_delta = balance_delta(new_type, new_amount)

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

        if txn.type == "saving":
            raise HTTPException(status_code=400, detail=SAVING_LOCKED_MSG)

        wallet = transaction_repo.get_wallet_by_id(db, txn.wallet_id, user_id)
        revert_delta = -balance_delta(txn.type, txn.amount)

        try:
            transaction_repo.soft_delete_transaction_atomic(db, txn, wallet, revert_delta)
            return {"message": "Đã xóa giao dịch"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Lỗi khi xóa giao dịch: {str(e)}")

    @staticmethod
    def restore_transaction(db: Session, user_id: int, txn_id: int):
        txn = transaction_repo.get_transaction_by_id(db, txn_id, user_id, include_deleted=True)
        if not txn or txn.delete_at is None:
            raise HTTPException(status_code=404, detail="Giao dịch không tồn tại hoặc chưa bị xóa")

        wallet = transaction_repo.get_wallet_by_id(db, txn.wallet_id, user_id)
        apply_delta = balance_delta(txn.type, txn.amount)

        try:
            return transaction_repo.restore_transaction_atomic(db, txn, wallet, apply_delta)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Lỗi khi hoàn tác giao dịch: {str(e)}")
        
    @staticmethod
    def get_transactions_filtered(
        db: Session,
        user_id: int,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
        category_id: Optional[int] = None,
        wallet_id: Optional[int] = None,
        txn_type: Optional[str] = None,
        q: Optional[str] = None,
        page: int = 1,
        size: int = 20
    ):
        if page < 1:
            page = 1
        skip = (page - 1) * size

        items, total = transaction_repo.get_filtered_transactions(
            db=db, user_id=user_id,
            from_date=from_date, to_date=to_date,
            category_id=category_id, wallet_id=wallet_id,
            txn_type=txn_type, search_q=q,
            skip=skip, limit=size
        )

        total_pages = math.ceil(total / size) if total > 0 else 1
        return {
            "items": items,
            "total": total,
            "page": page,
            "size": size,
            "total_pages": total_pages
        }

    @staticmethod
    def create_bulk_transactions(db: Session, user_id: int, bulk_in: TransactionBulkCreate):
        if not bulk_in.transactions:
            raise HTTPException(status_code=400, detail="Danh sách giao dịch trống")

        # 1. Tìm tất cả các wallet_id xuất hiện trong danh sách để kiểm tra quyền sở hữu 1 lần
        unique_wallet_ids = set(t.wallet_id for t in bulk_in.transactions)
        wallets_map = {}

        for w_id in unique_wallet_ids:
            wallet = transaction_repo.get_wallet_by_id(db, w_id, user_id)
            if not wallet:
                raise HTTPException(status_code=422, detail=f"Ví ID {w_id} không tồn tại hoặc không thuộc người dùng")
            wallets_map[w_id] = wallet

        # 2. Giao cho Repo thực thi Atomic Bulk Insert
        try:
            return transaction_repo.create_bulk_transactions_atomic(
                db=db,
                user_id=user_id,
                transactions_in=bulk_in.transactions,
                wallets_map=wallets_map
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Lỗi tạo hàng loạt: {str(e)}")

    @staticmethod
    def export_transactions_csv(db: Session, user_id: int, from_date: Optional[date] = None, to_date: Optional[date] = None):
        """Xuất danh sách giao dịch ra chuỗi CSV"""
        txns = transaction_repo.get_all_for_export(db, user_id, from_date, to_date)
        
        output = io.StringIO()
        # Ghi BOM để mở bằng Excel trên Windows không bị lỗi font tiếng Việt
        output.write('\ufeff') 
        writer = csv.writer(output)
        
        # Header của file CSV
        writer.writerow(["ID", "Ngày giao dịch", "Loại", "Số tiền", "Ví ID", "Danh mục ID", "Ghi chú", "Nguồn"])
        
        for t in txns:
            writer.writerow([
                t.id,
                t.txn_date.strftime("%Y-%m-%d %H:%M:%S") if t.txn_date else "",
                t.type,
                t.amount,
                t.wallet_id,
                t.category_id,
                t.note or "",
                t.source or "manual"
            ])
            
        output.seek(0)
        return output

    @staticmethod
    def preview_import_csv(db: Session, user_id: int, file: UploadFile):
        """Đọc file CSV tải lên, kiểm tra hợp lệ và trả về bản xem trước (chưa lưu DB)"""
        if not file.filename.endswith(".csv"):
            raise HTTPException(status_code=400, detail="Chỉ hỗ trợ định dạng file .csv")

        content = file.file.read().decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(content))
        
        preview_list = []
        for idx, row in enumerate(reader, start=1):
            try:
                amount = int(row.get("amount", 0))
                wallet_id = int(row.get("wallet_id", 0))
                category_id = int(row.get("category_id", 0))
                txn_type = row.get("type", "expense").strip().lower()
                
                is_valid = True
                error_msg = None

                if amount <= 0:
                    is_valid, error_msg = False, "Số tiền phải > 0"
                elif txn_type not in ("income", "expense"):
                    is_valid, error_msg = False, "Loại giao dịch phải là income hoặc expense"
                elif not transaction_repo.get_wallet_by_id(db, wallet_id, user_id):
                    is_valid, error_msg = False, f"Ví ID {wallet_id} không hợp lệ"

                preview_list.append({
                    "row_number": idx,
                    "wallet_id": wallet_id,
                    "category_id": category_id,
                    "type": txn_type,
                    "amount": amount,
                    "txn_date": row.get("txn_date") or datetime.now(),
                    "note": row.get("note", ""),
                    "is_valid": is_valid,
                    "error_message": error_msg
                })
            except Exception as e:
                preview_list.append({
                    "row_number": idx, "wallet_id": None, "category_id": None,
                    "type": "expense", "amount": 0, "txn_date": None, "note": "",
                    "is_valid": False, "error_message": f"Lỗi định dạng dữ liệu: {str(e)}"
                })
        return preview_list