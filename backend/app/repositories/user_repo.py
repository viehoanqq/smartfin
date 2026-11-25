from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models import User
from app.schemas.user import UserCreate, UserUpdate, AdminUserCreate, AdminUserUpdate
from app.core.security import get_password_hash


def get_user_by_email(db: Session, email: str) -> User | None:
    """Truy vấn user theo email"""
    return db.query(User).filter(User.email == email).first()


def get_user_by_id(db: Session, user_id: int) -> User | None:
    """Truy vấn user theo ID"""
    return db.query(User).filter(User.id == user_id).first()


def get_all_customers(db: Session) -> list[User]:
    """Lấy danh sách tài khoản có role là 'user'"""
    return (
        db.query(User)
        .filter(User.role == "user")
        .order_by(User.id.desc())
        .all()
    )


def create_user(db: Session, user_in: UserCreate) -> User:
    """Thêm một user mới vào Database"""
    new_user = User(
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        phone_number=user_in.phone_number,
        date_of_birth=user_in.date_of_birth,
        monthly_income=user_in.monthly_income,
        role="user",
    )
    db.add(new_user)
    try:
        db.commit()
        db.refresh(new_user)
        return new_user
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Email hoặc số điện thoại đã tồn tại trong hệ thống.",
        )


def create_user_by_admin(db: Session, user_in: AdminUserCreate) -> User:
    """Admin tạo tài khoản mới (mặc định role là 'user' nếu không truyền)"""
    new_user = User(
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        phone_number=user_in.phone_number,
        date_of_birth=user_in.date_of_birth,
        monthly_income=user_in.monthly_income if user_in.monthly_income is not None else 0,
        role=user_in.role or "user",
        is_active=user_in.is_active if user_in.is_active is not None else True,
    )
    db.add(new_user)
    try:
        db.commit()
        db.refresh(new_user)
        return new_user
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Email hoặc số điện thoại đã được sử dụng bởi tài khoản khác.",
        )


def update_user_by_admin(db: Session, user: User, user_in: AdminUserUpdate) -> User:
    """Admin cập nhật thông tin / trạng thái / vai trò của khách hàng"""
    if user_in.email is not None:
        user.email = user_in.email
    if user_in.full_name is not None:
        user.full_name = user_in.full_name
    if user_in.phone_number is not None:
        user.phone_number = user_in.phone_number
    if user_in.date_of_birth is not None:
        user.date_of_birth = user_in.date_of_birth
    if user_in.monthly_income is not None:
        user.monthly_income = user_in.monthly_income
    if user_in.role is not None:
        user.role = user_in.role
    if user_in.is_active is not None:
        user.is_active = user_in.is_active
    if user_in.password:
        user.password_hash = get_password_hash(user_in.password)

    try:
        db.commit()
        db.refresh(user)
        return user
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Email hoặc số điện thoại đã được sử dụng bởi tài khoản khác.",
        )


def delete_user(db: Session, user: User) -> None:
    """Xóa user khỏi Database"""
    try:
        db.delete(user)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Không thể xóa khách hàng vì đang có dữ liệu liên quan. Hãy khóa tài khoản thay vì xóa.",
        )


def change_user_password(db: Session, user: User, new_password: str, *, commit: bool = True) -> User:
    """Cập nhật mật khẩu mới cho user"""
    user.password_hash = get_password_hash(new_password)
    if commit:
        try:
            db.commit()
            db.refresh(user)
        except Exception:
            db.rollback()
            raise
    else:
        db.flush()
    return user


def update_user_profile(db: Session, user: User, user_in: UserUpdate) -> User:
    """Cập nhật thông tin hồ sơ người dùng"""
    if user_in.full_name is not None:
        user.full_name = user_in.full_name
    if user_in.monthly_income is not None:
        user.monthly_income = user_in.monthly_income
    if user_in.phone_number is not None:
        user.phone_number = user_in.phone_number
    if user_in.date_of_birth is not None:
        user.date_of_birth = user_in.date_of_birth

    try:
        db.commit()
        db.refresh(user)
        return user
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Số điện thoại này đã được sử dụng bởi tài khoản khác.",
        )