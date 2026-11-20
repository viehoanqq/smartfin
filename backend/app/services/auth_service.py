from app.schemas.user import UserCreate
from sqlalchemy.orm import Session
from app.repositories import user_repo
from app.core.security import verify_password
from app.core.security import create_access_token, create_refresh_token
from app.models import Wallet  # Import model Wallet
from app.repositories import notification_repo
from app.schemas.auth import validate_new_password
from app.services.password_recovery import PasswordRecovery

class AuthService:

    @staticmethod
    def register_user(db: Session, user_in: UserCreate):
        # 1. Kiểm tra nghiệp vụ: Email đã tồn tại chưa?
        if user_repo.get_user_by_email(db, email=user_in.email):
            raise ValueError("Email này đã được đăng ký.")
        # 2. Gọi Repo tạo user
        new_user = user_repo.create_user(db, user_in=user_in)
        # 3. TỰ ĐỘNG TẠO VÍ VÀ GÁN LƯƠNG THÁNG (MONTHLY_INCOME) LÀM SỐ DƯ
        initial_money = getattr(new_user, "monthly_income", 0) or 0

        default_wallet = Wallet(
            user_id=new_user.id,
            name="Ví chính",
            type="cash",                
            initial_balance=initial_money, 
            balance=initial_money,        
            is_archived=False
        )
        db.add(default_wallet)
        db.commit()                   
        db.refresh(new_user)

        return new_user

    # Các hàm bên dưới giữ nguyên...
    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> dict:
        user = user_repo.get_user_by_email(db, email=email)
        if not user or not verify_password(password, user.password_hash):
            raise ValueError("Sai email hoặc mật khẩu.")
        return {
            "access_token": create_access_token(subject=user.id),
            "refresh_token": create_refresh_token(subject=user.id),
            "token_type": "bearer"
        }
    
    @staticmethod
    def process_forgot_password(db: Session, email: str, recovery: PasswordRecovery, client: str) -> None:
        user = user_repo.get_user_by_email(db, email=email)
        recovery.issue(email, client, deliver=user is not None)

    @staticmethod
    def process_reset_password(db: Session, email: str, reset_code: str, new_password: str,
                               recovery: PasswordRecovery) -> None:
        validate_new_password(new_password)
        recovery.consume(email, reset_code)
        user = user_repo.get_user_by_email(db, email=email)
        if not user:
            raise ValueError("Mã khôi phục không hợp lệ hoặc đã hết hạn.")
        if verify_password(new_password, user.password_hash):
            raise ValueError("Mật khẩu mới phải khác mật khẩu hiện tại.")
        AuthService._save_password(db, user, new_password, reset=True)

    @staticmethod
    def _save_password(db: Session, user, new_password: str, *, reset: bool = False):
        try:
            user_repo.change_user_password(db, user, new_password, commit=False)
            notification_repo.add_password_notice(db, user.id, reset=reset)
            db.commit()
        except Exception:
            db.rollback()
            raise

    @staticmethod
    def process_change_password(db: Session, current_user, old_password: str, new_password: str) -> None:
        validate_new_password(new_password)
        if not verify_password(old_password, current_user.password_hash):
            raise ValueError("Mật khẩu cũ không chính xác.")
        if verify_password(new_password, current_user.password_hash):
            raise ValueError("Mật khẩu mới phải khác mật khẩu hiện tại.")
        AuthService._save_password(db, current_user, new_password)
