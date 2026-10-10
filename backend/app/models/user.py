# app/models/user.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.db.base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    
    # Phân quyền & Trạng thái
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    
    # Tự động lấy thời gian hiện tại khi tạo user
    created_at = Column(DateTime(timezone=True), server_default=func.now())