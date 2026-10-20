from sqlalchemy.orm import Session

from app.models.domain import User
from app.repositories import user_repo
from app.schemas.user import UserUpdate


class UserService:
    @staticmethod
    def update_user_profile(db: Session, user: User, user_in: UserUpdate):
        return user_repo.update_user_profile(db, user=user, user_in=user_in)
