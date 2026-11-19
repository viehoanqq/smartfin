from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.session import get_db
from app.models import Budget, User
from app.api.v1.routers.auth_api import get_current_user

router = APIRouter(prefix="/budget", tags=["Budget"])

class BudgetCreateUpdate(BaseModel):
    category_id: int
    limit_amount: int  # Tương ứng với budget_amount (BigInteger)

@router.post("")
def upsert_budget(
    data: BudgetCreateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Kiểm tra thu nhập hàng tháng của user từ bảng users
    monthly_income = current_user.monthly_income or 0

    # 2. Tính tổng budget hiện tại của các danh mục khác (tránh tính trùng danh mục đang cập nhật)
    existing_budgets = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.category_id != data.category_id
    ).all()
    
    total_other_budgets = sum(b.budget_amount for b in existing_budgets)
    projected_total_budget = total_other_budgets + data.limit_amount
    
    # 3. Chặn nếu tổng budget vượt quá thu nhập hàng tháng
    if monthly_income > 0 and projected_total_budget > monthly_income:
        raise HTTPException(
            status_code=400,
            detail=f"Tổng ngân sách dự kiến ({projected_total_budget:,} đ) vượt quá thu nhập hàng tháng ({monthly_income:,} đ)!"
        )

    # 4. Thực hiện Upsert (Cập nhật nếu đã có, tạo mới nếu chưa có)
    existing_budget = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.category_id == data.category_id
    ).first()

    if existing_budget:
        existing_budget.budget_amount = data.limit_amount
        db.commit()
        db.refresh(existing_budget)
        target_budget = existing_budget
    else:
        new_budget = Budget(
            user_id=current_user.id,
            category_id=data.category_id,
            budget_amount=data.limit_amount,
            current_amount=0
        )
        db.add(new_budget)
        db.commit()
        db.refresh(new_budget)
        target_budget = new_budget

    return {
        "message": "Lưu ngân sách thành công",
        "budget": {
            "id": target_budget.id,
            "category_id": target_budget.category_id,
            "limit_amount": target_budget.budget_amount,
            "spent_amount": target_budget.current_amount
        }
    }

@router.get("")
def get_user_budgets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    budgets = db.query(Budget).filter(Budget.user_id == current_user.id).all()
    
    result = []
    for b in budgets:
        result.append({
            "id": b.id,
            "category_id": b.category_id,
            "limit_amount": b.budget_amount,
            "spent_amount": b.current_amount,
            "period": "monthly"
        })
        
    return result