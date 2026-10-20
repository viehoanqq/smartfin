from http.client import HTTPException

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.models import User
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import get_password_hash
from fastapi import HTTPException

def get_user_by_email(db: Session, email: str) -> User | None:
    """Truy vấn user theo email"""
    return db.query(User).filter(User.email == email).first()

def get_user_by_id(db: Session, user_id: int) -> User | None:
    """Truy vấn user theo ID"""
    return db.query(User).filter(User.id == user_id).first()

def create_user(db: Session, user_in: UserCreate) -> User:
    """Thêm một user mới vào Database"""
    new_user = User(
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        currency=user_in.currency,
        monthly_income=user_in.monthly_income,
        role="user"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

def change_user_password(db: Session, user: User, new_password: str) -> User:
    """Cập nhật mật khẩu mới cho user"""
    user.password_hash = get_password_hash(new_password)
    db.commit()
    db.refresh(user)
    return user

def update_user_profile(db: Session, user: User, user_in: UserUpdate) -> User:
    """Cập nhật thông tin hồ sơ người dùng"""
    if user_in.full_name is not None:
        user.full_name = user_in.full_name
    if user_in.currency is not None:
        user.currency = user_in.currency
    if user_in.monthly_income is not None:
        user.monthly_income = user_in.monthly_income
        
    # --- THÊM 3 TRƯỜNG MỚI VÀO ĐÂY ---
    if user_in.phone_number is not None:
        user.phone_number = user_in.phone_number
    if user_in.date_of_birth is not None:
        user.date_of_birth = user_in.date_of_birth
    try:
        db.commit()
        db.refresh(user)
        return user
    except IntegrityError:
    # Bắt lỗi khi trùng lặp (UNIQUE)
        db.rollback() # Hoàn tác lại giao dịch để không kẹt DB
        raise HTTPException(
            status_code=400, 
            detail="Số điện thoại này đã được sử dụng bởi tài khoản khác."
        )
