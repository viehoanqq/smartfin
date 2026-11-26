from datetime import date, datetime
from typing import Optional
from sqlalchemy import func
from sqlalchemy.orm import Session

# Đổi đường dẫn import cho khớp file chứa các class Budget, Transaction của bạn
# Ví dụ: from app.models.models import Budget, Transaction
from app.models import Budget, Transaction
from app.services.notification_service import NotificationService


class BudgetService:
    @staticmethod
    def find_matching_budget(
        db: Session,
        user_id: int,
        category_id: Optional[int],
        txn_date: Optional[date | datetime] = None,
    ) -> Optional[Budget]:
        """Tìm ngân sách của user theo category_id (mỗi user - 1 ngân sách / danh mục)."""
        if not category_id:
            return None

        return (
            db.query(Budget)
            .filter(
                Budget.user_id == user_id,
                Budget.category_id == category_id,
            )
            .first()
        )

    @staticmethod
    def sync_budget_spent(db: Session, budget_id: Optional[int], *, user_id: Optional[int] = None) -> None:
        """Tính lại current_amount của budget từ các giao dịch expense chưa bị xóa mềm."""
        if not budget_id:
            return

        db.flush()
        # Refresh the high-water mark after waiting for concurrent transactions.
        query = db.query(Budget).filter(Budget.id == budget_id)
        if user_id is not None:
            query = query.filter(Budget.user_id == user_id)
        budget = query.populate_existing().with_for_update().first()
        if not budget:
            return

        total_spent = (
            db.query(func.coalesce(func.sum(Transaction.amount), 0))
            .filter(
                Transaction.budget_id == budget_id,
                Transaction.type == "expense",
                Transaction.delete_at.is_(None),
            )
            .scalar()
        )

        budget.current_amount = int(total_spent or 0)
        NotificationService.notify_budget_threshold(db, budget)
        db.flush()

    @staticmethod
    def get_budgets_with_progress(db: Session, user_id: int):
        """Lấy danh sách ngân sách kèm tiến độ chi tiêu."""
        budgets = (
            db.query(Budget)
            .filter(Budget.user_id == user_id)
            .order_by(Budget.id.desc())
            .all()
        )

        result = []
        for b in budgets:
            spent = int(b.current_amount or 0)
            limit_val = int(b.budget_amount or 0)
            remaining = limit_val - spent
            percent = round((spent / limit_val) * 100, 1) if limit_val > 0 else 0.0

            result.append({
                "budget": b,
                "spent": spent,
                "remaining": remaining,
                "percent": percent,
            })

        return result
