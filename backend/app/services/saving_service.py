from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.rules import balance_delta
from app.models.domain import Category, GoalContribution, SavingGoal, Transaction, Wallet
from app.repositories.saving_repo import SavingRepository
from app.schemas.saving import ContributionCreate, SavingGoalCreate


def _add_months(dt: datetime, months: int) -> datetime:
    year = dt.year + (dt.month - 1 + months) // 12
    month = (dt.month - 1 + months) % 12 + 1
    max_day = [
        31,
        29 if (year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)) else 28,
        31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
    ][month - 1]
    day = min(dt.day, max_day)
    return dt.replace(year=year, month=month, day=day)


def _compute_deadline(goal: SavingGoal) -> datetime | None:
    start_dt = getattr(goal, "created_at", None)
    period = (getattr(goal, "period", None) or "").strip().lower()
    duration = getattr(goal, "duration_value", None)

    if not start_dt or not period or not duration:
        return None

    duration = int(duration)
    if duration <= 0:
        return None

    if period in ("thang", "tháng", "month", "months"):
        return _add_months(start_dt, duration)
    if period in ("nam", "năm", "year", "years"):
        return _add_months(start_dt, duration * 12)
    return None


def _sync_goal_status(goal: SavingGoal) -> bool:
    current_amt = int(getattr(goal, "current_amount", 0) or 0)
    target_amt = int(getattr(goal, "target_amount", 0) or 0)
    current_status = (getattr(goal, "status", None) or "active").lower()

    if current_status == "cancelled":
        return False

    if target_amt > 0 and current_amt >= target_amt:
        if current_status != "completed":
            goal.status = "completed"
            return True
        return False

    if current_status != "active":
        return False

    deadline = _compute_deadline(goal)
    if not deadline:
        return False

    now = datetime.now(timezone.utc) if deadline.tzinfo else datetime.now()
    if now > deadline:
        goal.status = "expired"
        return True

    return False


class SavingService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = SavingRepository(db)

    def _sync_many_and_commit(self, goals: list[SavingGoal]):
        changed = False
        for goal in goals:
            if _sync_goal_status(goal):
                changed = True
        if changed:
            self.db.commit()
            for goal in goals:
                self.db.refresh(goal)
        return goals

    def get_user_goals(self, user_id: int):
        goals = self.repo.get_by_user(user_id)
        return self._sync_many_and_commit(goals)

    def get_goal_detail(self, user_id: int, goal_id: int):
        goal = self.repo.get_by_id(goal_id, user_id)
        if not goal:
            return None
        if _sync_goal_status(goal):
            self.db.commit()
            self.db.refresh(goal)
        return goal

    def create_goal(self, user_id: int, data: SavingGoalCreate):
        goal = SavingGoal(
            user_id=user_id,
            name=data.name,
            target_amount=data.target_amount,
            current_amount=0,
            period=data.period,
            duration_value=data.duration_value,
            status="active",
        )
        return self.repo.create_goal(goal)

    def _get_default_category_id(self) -> int:
        cat = (
            self.db.query(Category)
            .filter(
                (Category.name.ilike("%tiết kiệm%"))
                | (Category.name.ilike("%saving%"))
                | (Category.name.ilike("%thu nhập%"))
                | (Category.name.ilike("%income%"))
            )
            .first()
        )
        if cat:
            return int(cat.id)
        first_cat = self.db.query(Category).order_by(Category.id.asc()).first()
        if not first_cat:
            raise HTTPException(status_code=400, detail="Chưa có danh mục nào trong hệ thống")
        return int(first_cat.id)

    def deposit(self, user_id: int, goal_id: int, data: ContributionCreate):
        amount = int(data.amount)
        if amount <= 0:
            raise HTTPException(status_code=400, detail="Số tiền nạp phải lớn hơn 0")

        goal = self.repo.get_by_id(goal_id, user_id)
        if not goal:
            raise HTTPException(status_code=404, detail="Mục tiêu tiết kiệm không tồn tại")

        if _sync_goal_status(goal):
            self.db.commit()
            self.db.refresh(goal)

        goal_status = (getattr(goal, "status", None) or "active").lower()
        if goal_status == "completed":
            raise HTTPException(status_code=400, detail="Mục tiêu tiết kiệm đã hoàn thành")
        if goal_status == "expired":
            raise HTTPException(status_code=400, detail="Mục tiêu tiết kiệm đã quá hạn, không thể nạp thêm")
        if goal_status == "cancelled":
            raise HTTPException(status_code=400, detail="Mục tiêu tiết kiệm đã hủy")

        wallet = self.db.query(Wallet).filter(Wallet.user_id == user_id).first()
        if not wallet:
            raise HTTPException(status_code=404, detail="Không tìm thấy ví người dùng")

        delta = balance_delta("saving", amount)
        if delta < 0 and (int(wallet.balance or 0) + delta) < 0:
            raise HTTPException(status_code=400, detail="Số dư ví không đủ để nạp tiết kiệm")

        try:
            # SỬA: Dùng timezone.utc để đồng bộ chuẩn với cột timestamptz của PostgreSQL
            now_dt = datetime.now(timezone.utc)
            txn = Transaction(
                user_id=user_id,
                wallet_id=wallet.id,
                category_id=self._get_default_category_id(),
                type="saving",
                amount=amount,
                txn_date=now_dt,
                note=f"Tiết kiệm: {goal.name}",
                source="manual",
            )
            self.db.add(txn)
            self.db.flush()

            wallet.balance = int(wallet.balance or 0) + delta

            contribution = GoalContribution(
                goal_id=goal.id,
                transactions_id=txn.id,
                amount=amount,
                contributed_at=now_dt,
            )
            self.db.add(contribution)

            goal.current_amount = int(goal.current_amount or 0) + amount
            _sync_goal_status(goal)

            self.db.commit()
            self.db.refresh(contribution)
            self.db.refresh(goal)
            return contribution
        except HTTPException:
            self.db.rollback()
            raise
        except Exception as e:
            self.db.rollback()
            raise HTTPException(status_code=500, detail=f"Lỗi nộp tiền vào mục tiêu: {str(e)}")

    def withdraw_and_cancel(self, user_id: int, goal_id: int):
        goal = self.repo.get_by_id(goal_id, user_id)
        if not goal:
            raise HTTPException(status_code=404, detail="Mục tiêu tiết kiệm không tồn tại")

        current_status = (getattr(goal, "status", None) or "active").lower()
        if current_status == "cancelled":
            raise HTTPException(status_code=400, detail="Mục tiêu tiết kiệm này đã hủy trước đó")

        withdraw_amount = int(goal.current_amount or 0)
        wallet = self.db.query(Wallet).filter(Wallet.user_id == user_id).first()
        if not wallet:
            raise HTTPException(status_code=404, detail="Không tìm thấy ví người dùng")

        try:
            created_txn = None
            if withdraw_amount > 0:
                income_delta = balance_delta("income", withdraw_amount)
                created_txn = Transaction(
                    user_id=user_id,
                    wallet_id=wallet.id,
                    category_id=self._get_default_category_id(),
                    type="income",
                    amount=withdraw_amount,
                    # SỬA: Dùng timezone.utc cho giao dịch thu nhập lúc rút tiền
                    txn_date=datetime.now(timezone.utc),
                    note=f"Rút tiền từ mục tiêu tiết kiệm {goal.name} về ví",
                    source="manual",
                )
                self.db.add(created_txn)
                self.db.flush()
                wallet.balance = int(wallet.balance or 0) + income_delta

            goal.current_amount = 0
            goal.status = "cancelled"

            self.db.commit()
            self.db.refresh(goal)
            return {
                "message": "Đã dừng mục tiêu, rút tiền về ví và tạo giao dịch thu nhập",
                "goal_id": goal.id,
                "status": goal.status,
                "current_amount": goal.current_amount,
                "withdrawn_amount": withdraw_amount,
                "transaction_id": created_txn.id if created_txn else None,
            }
        except HTTPException:
            self.db.rollback()
            raise
        except Exception as e:
            self.db.rollback()
            raise HTTPException(status_code=500, detail=f"Lỗi rút tiền và hủy mục tiêu: {str(e)}")
        
    def extend_goal(self, user_id: int, goal_id: int, extra_duration: int):
        extra = int(extra_duration)
        if extra <= 0:
            raise HTTPException(status_code=400, detail="Thời gian gia hạn phải lớn hơn 0")

        goal = self.repo.get_by_id(goal_id, user_id)
        if not goal:
            raise HTTPException(status_code=404, detail="Mục tiêu tiết kiệm không tồn tại")

        current_status = (getattr(goal, "status", None) or "active").lower()
        if current_status == "cancelled":
            raise HTTPException(status_code=400, detail="Mục tiêu tiết kiệm đã hủy, không thể gia hạn")

        goal.duration_value = int(goal.duration_value or 0) + extra

        # Nếu chưa hoàn thành thì đưa về active rồi kiểm tra lại hạn mới
        current_amt = int(goal.current_amount or 0)
        target_amt = int(goal.target_amount or 0)
        if not (target_amt > 0 and current_amt >= target_amt):
            goal.status = "active"
            _sync_goal_status(goal)
        else:
            goal.status = "completed"

        self.db.commit()
        self.db.refresh(goal)
        return goal