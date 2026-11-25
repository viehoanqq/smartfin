from sqlalchemy.orm import Session

from app.models import User
from app.repositories import user_repo
from app.schemas.user import UserUpdate, AdminUserCreate, AdminUserUpdate


class UserService:
    @staticmethod
    def update_user_profile(db: Session, user: User, user_in: UserUpdate):
        return user_repo.update_user_profile(db, user=user, user_in=user_in)

    @staticmethod
    def get_all_customers(db: Session):
        return user_repo.get_all_customers(db)

    @staticmethod
    def create_user_by_admin(db: Session, user_in: AdminUserCreate):
        if user_repo.get_user_by_email(db, email=user_in.email):
            raise ValueError("Email đã tồn tại trong hệ thống.")
        return user_repo.create_user_by_admin(db=db, user_in=user_in)

    @staticmethod
    def update_user_by_admin(db: Session, user_id: int, user_in: AdminUserUpdate):
        target_user = user_repo.get_user_by_id(db, user_id=user_id)
        if not target_user:
            raise LookupError("Không tìm thấy khách hàng.")

        if user_in.email and user_in.email != target_user.email:
            existing = user_repo.get_user_by_email(db, email=user_in.email)
            if existing and existing.id != user_id:
                raise ValueError("Email này đã được sử dụng bởi tài khoản khác.")

        return user_repo.update_user_by_admin(db=db, user=target_user, user_in=user_in)