from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class ContributionCreate(BaseModel):
    amount: int

class ContributionResponse(BaseModel):
    id: int
    goal_id: int
    amount: int
    contributed_at: datetime

    model_config = ConfigDict(from_attributes=True)

class SavingGoalCreate(BaseModel):
    name: str
    target_amount: int
    period: str
    duration_value: int

class SavingGoalResponse(BaseModel):
    id: int
    user_id: int
    name: str
    target_amount: int
    current_amount: int
    period: str
    duration_value: int
    status: str
    created_at: datetime  # <--- Trả về ngày tạo mục tiêu

    model_config = ConfigDict(from_attributes=True)
    
class SavingGoalDetailResponse(SavingGoalResponse):
    contributions: List[ContributionResponse] = []

    model_config = ConfigDict(from_attributes=True)