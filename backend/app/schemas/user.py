from datetime import date, datetime
from typing import Literal, Optional
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    monthly_income: Optional[int] = 0


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    role: str
    monthly_income: Optional[int] = 0
    phone_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    is_active: Optional[bool] = True
    create_at: Optional[datetime] = None
    update_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    monthly_income: Optional[int] = None


class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    monthly_income: Optional[int] = 0
    role: Literal["user", "admin"] = "user"
    is_active: bool = True


class AdminUserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    monthly_income: Optional[int] = None
    role: Optional[Literal["user", "admin"]] = None
    is_active: Optional[bool] = None