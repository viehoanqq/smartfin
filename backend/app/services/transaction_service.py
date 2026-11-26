import csv
from datetime import date, datetime
import io
import math
from typing import Optional
from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.rules import balance_delta
from app.models import GoalContribution, SavingGoal
from app.repositories import transaction_repo
from app.schemas.transaction import TransactionBulkCreate, TransactionCreate, TransactionUpdate
from app.services.budget_service import BudgetService

SAVING_LOCKED_MSG = "Giao dịch tiết kiệm được quản lý ở mục Mục tiêu tiết kiệm, không sửa hoặc xóa tại đây"


class TransactionService:

    @staticmethod
    def _validate_wallet_balance(wallet, delta: float | int, action_label: str = "thực hiện giao dịch"):
        if delta < 0 and (wallet.balance + delta) < 0:
            raise HTTPException(
                status_code=400,
                detail=f"Số dư ví không đủ để {action_label} (số dư hiện có: {int(wallet.balance):,} VND)"
            )

    @staticmethod
    def _attach_and_sync_budget(db: Session, user_id: int, txn, txn_type: str, category_id: Optional[int], txn_date,
                                old_budget_id: Optional[int] = None):
        matched_budget = (
            BudgetService.find_matching_budget(db, user_id, category_id, txn_date)
            if txn_type == "expense"
            else None
        )
        new_budget_id = matched_budget.id if matched_budget else None

        if getattr(txn, "budget_id", None) != new_budget_id:
            txn.budget_id = new_budget_id
            db.flush()

        for budget_id in sorted({bid for bid in (old_budget_id, new_budget_id) if bid is not None}):
            BudgetService.sync_budget_spent(db, budget_id, user_id=user_id)

    @staticmethod
    def _attach_and_sync_saving(db: Session, user_id: int, txn, data: TransactionCreate):
        if data.type != "saving":
            return

        goal_id = getattr(data, "goal_id", None) or getattr(data, "saving_id", None)
        if not goal_id:
            raise HTTPException(status_code=400, detail="Vui lòng chọn mục tiêu tiết kiệm")

        goal = (
            db.query(SavingGoal)
            .filter(SavingGoal.id == goal_id, SavingGoal.user_id == user_id)
            .first()
        )
        if not goal:
            raise HTTPException(status_code=404, detail="Không tìm thấy mục tiêu tiết kiệm")

        if getattr(goal, "status", "active") != "active":
            raise HTTPException(status_code=400, detail="Mục tiêu tiết kiệm này đã hoàn thành hoặc không còn hoạt động")

        contribution = GoalContribution(
            goal_id=goal.id,
            transactions_id=txn.id,
            amount=int(data.amount),
            contributed_at=txn.txn_date or datetime.now(),
        )
        db.add(contribution)

        goal.current_amount = int(goal.current_amount or 0) + int(data.amount)
        if getattr(goal, "target_amount", None) and goal.current_amount >= int(goal.target_amount):
            if hasattr(goal, "status"):
                goal.status = "completed"
        db.flush()

    @staticmethod
    def get_transactions(db: Session, user_id: int, skip: int = 0, limit: int = 50):
        return transaction_repo.get_user_transactions(db, user_id, skip, limit)

    @staticmethod
    def create_transaction(db: Session, user_id: int, data: TransactionCreate):
        if data.amount <= 0:
            raise HTTPException(status_code=400, detail="Số tiền giao dịch phải lớn hơn 0")

        wallet = transaction_repo.get_wallet_by_id(db, data.wallet_id, user_id)
        if not wallet:
            raise HTTPException(status_code=422, detail="Ví không tồn tại hoặc không thuộc người dùng")

        amount_delta = balance_delta(data.type, data.amount)
        TransactionService._validate_wallet_balance(wallet, amount_delta, "tạo giao dịch")

        try:
            txn = transaction_repo.create_transaction_atomic(
                db=db,
                user_id=user_id,
                wallet=wallet,
                txn_in=data,
                amount_delta=amount_delta
            )
            TransactionService._attach_and_sync_saving(db=db, user_id=user_id, txn=txn, data=data)
            txn_date = getattr(data, "txn_date", None) or getattr(txn, "txn_date", None)
            TransactionService._attach_and_sync_budget(
                db=db,
                user_id=user_id,
                txn=txn,
                txn_type=data.type,
                category_id=data.category_id,
                txn_date=txn_date
            )
            db.commit()
            db.refresh(txn)
            return txn
        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Không thể lưu giao dịch: {str(e)}")

    @staticmethod
    def update_transaction(db: Session, user_id: int, txn_id: int, data: TransactionUpdate):
        txn = transaction_repo.get_transaction_by_id(db, txn_id, user_id)
        if not txn:
            raise HTTPException(status_code=404, detail="Không tìm thấy giao dịch")
        if txn.type == "saving":
            raise HTTPException(status_code=400, detail=SAVING_LOCKED_MSG)

        old_budget_id = getattr(txn, "budget_id", None)
        old_wallet = transaction_repo.get_wallet_by_id(db, txn.wallet_id, user_id)
        revert_delta = -balance_delta(txn.type, txn.amount)

        update_fields = data.model_dump(exclude_unset=True)
        if "amount" in update_fields and update_fields["amount"] is not None and update_fields["amount"] <= 0:
            raise HTTPException(status_code=400, detail="Số tiền giao dịch phải lớn hơn 0")

        new_wallet_id = update_fields.get("wallet_id", txn.wallet_id)
        new_type = update_fields.get("type", txn.type)
        new_amount = update_fields.get("amount", txn.amount)
        new_category_id = update_fields.get("category_id", txn.category_id)
        new_txn_date = update_fields.get("txn_date", txn.txn_date)

        new_wallet = (
            old_wallet
            if new_wallet_id == txn.wallet_id
            else transaction_repo.get_wallet_by_id(db, new_wallet_id, user_id)
        )
        if not new_wallet:
            raise HTTPException(status_code=422, detail="Ví mới không tồn tại hoặc không thuộc người dùng")

        apply_delta = balance_delta(new_type, new_amount)

        if old_wallet.id == new_wallet.id:
            projected_balance = old_wallet.balance + revert_delta + apply_delta
            if projected_balance < 0:
                raise HTTPException(
                    status_code=400,
                    detail="Số dư ví không đủ để cập nhật giao dịch này"
                )
        else:
            TransactionService._validate_wallet_balance(old_wallet, revert_delta, "hoàn tác giao dịch ở ví cũ")
            TransactionService._validate_wallet_balance(new_wallet, apply_delta, "áp dụng giao dịch vào ví mới")

        try:
            updated_txn = transaction_repo.update_transaction_atomic(
                db=db,
                txn=txn,
                old_wallet=old_wallet,
                new_wallet=new_wallet,
                revert_delta=revert_delta,
                apply_delta=apply_delta,
                update_fields=update_fields
            )
            TransactionService._attach_and_sync_budget(
                db=db,
                user_id=user_id,
                txn=updated_txn,
                txn_type=new_type,
                category_id=new_category_id,
                txn_date=new_txn_date,
                old_budget_id=old_budget_id,
            )

            db.commit()
            db.refresh(updated_txn)
            return updated_txn
        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Lỗi cập nhật giao dịch: {str(e)}")

    @staticmethod
    def soft_delete_transaction(db: Session, user_id: int, txn_id: int):
        txn = transaction_repo.get_transaction_by_id(db, txn_id, user_id)
        if not txn:
            raise HTTPException(status_code=404, detail="Không tìm thấy giao dịch")

        if txn.type == "saving":
            raise HTTPException(status_code=400, detail=SAVING_LOCKED_MSG)

        old_budget_id = getattr(txn, "budget_id", None)
        wallet = transaction_repo.get_wallet_by_id(db, txn.wallet_id, user_id)
        revert_delta = -balance_delta(txn.type, txn.amount)
        TransactionService._validate_wallet_balance(wallet, revert_delta, "xóa giao dịch")

        try:
            transaction_repo.soft_delete_transaction_atomic(db, txn, wallet, revert_delta)
            if old_budget_id:
                BudgetService.sync_budget_spent(db, old_budget_id, user_id=user_id)
            db.commit()
            return {"message": "Đã xóa giao dịch"}
        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Lỗi khi xóa giao dịch: {str(e)}")

    @staticmethod
    def restore_transaction(db: Session, user_id: int, txn_id: int):
        txn = transaction_repo.get_transaction_by_id(db, txn_id, user_id, include_deleted=True)
        if not txn or txn.delete_at is None:
            raise HTTPException(status_code=404, detail="Giao dịch không tồn tại hoặc chưa bị xóa")

        wallet = transaction_repo.get_wallet_by_id(db, txn.wallet_id, user_id)
        apply_delta = balance_delta(txn.type, txn.amount)
        TransactionService._validate_wallet_balance(wallet, apply_delta, "hoàn tác giao dịch")

        try:
            restored_txn = transaction_repo.restore_transaction_atomic(db, txn, wallet, apply_delta)
            TransactionService._attach_and_sync_budget(
                db=db,
                user_id=user_id,
                txn=restored_txn,
                txn_type=restored_txn.type,
                category_id=restored_txn.category_id,
                txn_date=restored_txn.txn_date
            )
            db.commit()
            db.refresh(restored_txn)
            return restored_txn
        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
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

        unique_wallet_ids = set(t.wallet_id for t in bulk_in.transactions)
        wallets_map = {}

        for w_id in unique_wallet_ids:
            wallet = transaction_repo.get_wallet_by_id(db, w_id, user_id)
            if not wallet:
                raise HTTPException(status_code=422, detail=f"Ví ID {w_id} không tồn tại hoặc không thuộc người dùng")
            wallets_map[w_id] = wallet

        projected_deltas = {w_id: 0 for w_id in unique_wallet_ids}
        for t in bulk_in.transactions:
            if t.amount <= 0:
                raise HTTPException(status_code=400, detail="Số tiền giao dịch phải lớn hơn 0")
            projected_deltas[t.wallet_id] += balance_delta(t.type, t.amount)

        for w_id, total_delta in projected_deltas.items():
            TransactionService._validate_wallet_balance(wallets_map[w_id], total_delta, "tạo danh sách giao dịch")

        try:
            created_txns = transaction_repo.create_bulk_transactions_atomic(
                db=db,
                user_id=user_id,
                transactions_in=bulk_in.transactions,
                wallets_map=wallets_map
            )
            synced_budget_ids = set()
            for txn, t_in in zip(created_txns, bulk_in.transactions):
                if txn.type == "saving":
                    TransactionService._attach_and_sync_saving(db=db, user_id=user_id, txn=txn, data=t_in)
                matched_budget = (
                    BudgetService.find_matching_budget(db, user_id, txn.category_id, txn.txn_date)
                    if txn.type == "expense"
                    else None
                )
                if matched_budget:
                    txn.budget_id = matched_budget.id
                    synced_budget_ids.add(matched_budget.id)

            if synced_budget_ids:
                db.flush()
                for b_id in sorted(synced_budget_ids):
                    BudgetService.sync_budget_spent(db, b_id, user_id=user_id)

            db.commit()
            return created_txns
        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Lỗi tạo hàng loạt: {str(e)}")

    @staticmethod
    def export_transactions_csv(db: Session, user_id: int, from_date: Optional[date] = None, to_date: Optional[date] = None):
        txns = transaction_repo.get_all_for_export(db, user_id, from_date, to_date)

        output = io.StringIO()
        output.write('\ufeff')
        writer = csv.writer(output)

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
                elif txn_type not in ("income", "expense", "saving"):
                    is_valid, error_msg = False, "Loại giao dịch phải là income, expense hoặc saving"
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
