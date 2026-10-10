from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm

# 1. Sửa lại đường dẫn import get_db cho đúng với file base.py của bạn
from app.db.session import get_db 

# 2. Import thêm model User và get_current_user cho API /me
from app.models import User 
from app.core.deps import get_current_user

from app.schemas.user import UserCreate, UserResponse
from app.schemas.auth import TokenResponse
from app.core.security import verify_password, create_access_token, create_refresh_token
from app.repositories import user as user_repo 

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # 1. Gọi Repo kiểm tra email tồn tại
    if user_repo.get_user_by_email(db, email=user_in.email):
        raise HTTPException(status_code=400, detail="Email này đã được đăng ký.")
    
    # 2. Gọi Repo lưu user mới
    new_user = user_repo.create_user(db, user_in=user_in)
    return new_user

@router.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # 1. Gọi Repo lấy user
    user = user_repo.get_user_by_email(db, email=form_data.username)
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Sai email hoặc mật khẩu.")
    
    return {
        "access_token": create_access_token(subject=user.id),
        "refresh_token": create_refresh_token(subject=user.id),
        "token_type": "bearer"
    }
    
@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user