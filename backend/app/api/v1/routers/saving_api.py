from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.core.deps import get_current_user
from app.schemas.saving import SavingGoalCreate, SavingGoalResponse, ContributionCreate, ContributionResponse, SavingGoalDetailResponse
from app.services.saving_service import SavingService

router = APIRouter(prefix="/savings", tags=["Savings"])

@router.get("", response_model=List[SavingGoalResponse])
def get_savings(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    service = SavingService(db)
    return service.get_user_goals(current_user.id)

@router.post("", response_model=SavingGoalResponse, status_code=status.HTTP_201_CREATED)
def create_saving(data: SavingGoalCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    service = SavingService(db)
    return service.create_goal(current_user.id, data)

@router.post("/{goal_id}/deposit", response_model=ContributionResponse)
def deposit_to_saving(goal_id: int, data: ContributionCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    service = SavingService(db)
    try:
        return service.deposit(current_user.id, goal_id, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
@router.get("/{goal_id}", response_model=SavingGoalDetailResponse)
def get_saving_detail(
    goal_id: int, 
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    service = SavingService(db)
    detail = service.get_goal_detail(current_user.id, goal_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Không tìm thấy mục tiêu tiết kiệm")
    return detail