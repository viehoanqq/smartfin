
from app.schemas.user import UserUpdate
from app.models.domain import User
from sqlalchemy.orm import Session
from app.repositories import userRepo # (Hoặc user_repo của bạn)
class UserService:    
    @staticmethod
    def update_user_profile(db: Session, user: User, user_in: UserUpdate):
        return userRepo.update_user_profile(db, user=user, user_in=user_in)