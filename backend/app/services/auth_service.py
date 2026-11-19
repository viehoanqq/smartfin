from random import Random

from app.schemas.user import UserCreate
from sqlalchemy.orm import Session
from app.repositories import user_repo
from app.core.security import get_password_hash, verify_password
from app.core.security import create_access_token, create_refresh_token
from app.models import Wallet  # Import model Wallet

class AuthService:    
    OTP_TEST = {}

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
            name="Ví mặc định",
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
    def process_forgot_password(db: Session, email: str) -> None:
        user = user_repo.get_user_by_email(db, email=email)
        if not user:
            raise ValueError("Email không tồn tại trong hệ thống.")
        AuthService.OTP_TEST[email] = Random().randint(100000, 999999)     
        print(f"[MOCK EMAIL] Mã OTP khôi phục mật khẩu cho {email} là: {AuthService.OTP_TEST[email]}")

    @staticmethod
    def process_reset_password(db: Session, email: str, reset_code: str, new_password: str) -> None:
        if reset_code != str(AuthService.OTP_TEST.get(email)):
            raise ValueError("Mã khôi phục không hợp lệ hoặc đã hết hạn.")
        user = user_repo.get_user_by_email(db, email=email)
        if not user:
            raise ValueError("Không tìm thấy người dùng.")
        user_repo.change_user_password(db, user, new_password)

    @staticmethod
    def process_change_password(db: Session, current_user, old_password: str, new_password: str) -> None:
        if not verify_password(old_password, current_user.password_hash):
            raise ValueError("Mật khẩu cũ không chính xác.")
        user_repo.change_user_password(db, current_user, new_password)