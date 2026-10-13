from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm

from app.db.session import get_db 
from app.models import User 
from app.core.deps import get_current_user
from app.schemas.user import UserCreate, UserResponse
from app.schemas.auth import TokenResponse, ForgotPasswordRequest, ResetPasswordRequest, ChangePasswordRequest
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    try:
        new_user = AuthService.register_user(db, user_in=user_in)
        return new_user
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    try:
        token_data = AuthService.authenticate_user(db, email=form_data.username, password=form_data.password)
        return token_data
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    try:
        AuthService.process_forgot_password(db, email=data.email)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"message": "Một mã khôi phục đã được gửi đến email của bạn (Mock). Hãy kiểm tra hộp thư đến."}

@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    try:
        AuthService.process_reset_password(
            db, 
            email=data.email, 
            reset_code=data.reset_code, 
            new_password=data.new_password
        )
        return {"message": "Đặt lại mật khẩu thành công. Hãy đăng nhập bằng mật khẩu mới!"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    try:
        AuthService.process_change_password(
            db, 
            current_user=current_user, 
            old_password=data.old_password, 
            new_password=data.new_password
        )
        return {"message": "Đổi mật khẩu thành công!"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))