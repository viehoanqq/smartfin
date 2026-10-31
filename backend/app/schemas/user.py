from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date, datetime

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
    # --- THÊM 3 DÒNG NÀY ---
    phone_number: Optional[str] = None
    date_of_birth: Optional[date] = None

    class Config:
        from_attributes = True
        
class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    monthly_income: Optional[int] = None