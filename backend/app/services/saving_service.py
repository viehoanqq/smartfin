from sqlalchemy.orm import Session
from app.repositories.saving_repo import SavingRepository
from app.schemas.saving import SavingGoalCreate, ContributionCreate
from app.models.domain import SavingGoal, GoalContribution

class SavingService:
    def __init__(self, db: Session):
        self.repo = SavingRepository(db)

    def get_user_goals(self, user_id: int):
        return self.repo.get_by_user(user_id)

    def create_goal(self, user_id: int, data: SavingGoalCreate):
        goal = SavingGoal(
            user_id=user_id,
            name=data.name,
            target_amount=data.target_amount,
            current_amount=0,
            period=data.period,
            duration_value=data.duration_value
        )
        return self.repo.create_goal(goal)

    def deposit(self, user_id: int, goal_id: int, data: ContributionCreate):
        goal = self.repo.get_by_id(goal_id, user_id)
        if not goal:
            raise ValueError("Mục tiêu tiết kiệm không tồn tại")
        
        contribution = GoalContribution(
            goal_id=goal_id,
            amount=data.amount
        )
        return self.repo.add_contribution(contribution, goal)