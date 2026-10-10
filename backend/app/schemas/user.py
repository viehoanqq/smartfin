from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    currency: Optional[str] = "VND"
    monthly_income: Optional[int] = 0

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    role: str
    currency: str
    monthly_income: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True