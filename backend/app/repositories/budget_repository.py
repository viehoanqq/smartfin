from sqlalchemy.orm import Session
from ..models import Budget

class BudgetRepository:
    @staticmethod
    def get_by_user_and_category(db: Session, user_id: int, category_id: int, period: str):
        return db.query(Budget).filter(
            Budget.user_id == user_id,
            Budget.category_id == category_id,
            Budget.period == period
        ).first()

    @staticmethod
    def get_all_by_user(db: Session, user_id: int):
        return db.query(Budget).filter(Budget.user_id == user_id).all()

    @staticmethod
    def upsert(db: Session, user_id: int, category_id: int, limit_amount: float, period: str):
        existing = BudgetRepository.get_by_user_and_category(db, user_id, category_id, period)
        if existing:
            existing.limit_amount = limit_amount
            db.commit()
            db.refresh(existing)
            return existing
        else:
            new_budget = Budget(
                user_id=user_id,
                category_id=category_id,
                limit_amount=limit_amount,
                period=period
            )
            db.add(new_budget)
            db.commit()
            db.refresh(new_budget)
            return new_budget