from sqlalchemy.orm import Session
from app.models.domain import SavingGoal, GoalContribution

class SavingRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_user(self, user_id: int):
        return self.db.query(SavingGoal).filter(SavingGoal.user_id == user_id).all()

    def get_by_id(self, goal_id: int, user_id: int):
        return self.db.query(SavingGoal).filter(SavingGoal.id == goal_id, SavingGoal.user_id == user_id).first()

    def create_goal(self, goal: SavingGoal):
        self.db.add(goal)
        self.db.commit()
        self.db.refresh(goal)
        return goal

    def add_contribution(self, contribution: GoalContribution, goal: SavingGoal):
        # 1. Thêm bản ghi lịch sử nộp tiền
        self.db.add(contribution)
        
        # 2. Cộng trực tiếp tiền nộp vào current_amount
        goal.current_amount += contribution.amount
        
        # 3. Đánh dấu hoàn thành nếu đạt/vượt target_amount
        if goal.current_amount >= goal.target_amount:
            goal.status = 'completed'
            
        self.db.commit()
        self.db.refresh(contribution)
        self.db.refresh(goal)
        return contribution
    

    def get_detail_by_id(self, goal_id: int, user_id: int):
        goal = self.db.query(SavingGoal).filter(SavingGoal.id == goal_id, SavingGoal.user_id == user_id).first()
        if not goal:
            return None
            
        # Lấy danh sách đóng góp xếp theo thời gian mới nhất lên đầu
        contributions = self.db.query(GoalContribution)\
            .filter(GoalContribution.goal_id == goal.id)\
            .order_by(GoalContribution.contributed_at.desc()).all()
            
        goal.contributions = contributions
        return goal