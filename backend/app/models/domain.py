from sqlalchemy import (
    Column, String, BigInteger, Integer, Boolean, ForeignKey, Date, DateTime,
    Text, Float, Index, UniqueConstraint,
)

from sqlalchemy.dialects.postgresql import ARRAY, JSONB
import pgvector.sqlalchemy
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from app.db.base import Base

# 1. Bảng users
class User(Base):
    __tablename__ = "users"
    id = Column(BigInteger, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)

    # --- THÔNG TIN CÁ NHÂN ---
    full_name = Column(String(255))
    phone_number = Column(String(20), unique=True, nullable=True) # Thêm mới
    date_of_birth = Column(Date, nullable=True)                   # Thêm mới
    avatar_url = Column(Text, nullable=True)                      # Thêm mới (dùng Text để chứa URL dài từ S3/Drive)

    # --- CÀI ĐẶT TÀI CHÍNH ---
    currency = Column(String(10), default='VND')
    monthly_income = Column(BigInteger, default=0)

    # --- QUẢN LÝ HỆ THỐNG ---
    role = Column(String(50), default='user')
    is_active = Column(Boolean, default=True)                     # Đề xuất thêm: Khóa/Mở tài khoản
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now()) # Đề xuất thêm

# 2. Bảng wallets
class Wallet(Base):
    __tablename__ = "wallets"
    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)  # 1 user - 1 wallet
    name = Column(String(255), nullable=False)
    type = Column(String(50))
    initial_balance = Column(BigInteger, default=0)
    balance = Column(BigInteger, default=0)
    is_archived = Column(Boolean, default=False)

# 3. Bảng categories
# Danh mục CỐ ĐỊNH, dùng chung cho mọi người dùng (không có user_id, không có parent_id).
# "Ai dùng danh mục nào" được ghi ở transactions.user_id và budgets.user_id.
class Category(Base):
    __tablename__ = "categories"
    id = Column(BigInteger, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False)   # income | expense | saving
    icon = Column(String(255))
    color = Column(String(50))
    keywords = Column(ARRAY(Text))
    is_hidden = Column(Boolean, default=False)

# 4. Bảng budgets
# Mỗi dòng = ngân sách của MỘT tháng cho MỘT danh mục.
# Số đã chi KHÔNG lưu ở đây: tính từ transactions (cùng user_id, category_id, type='expense', trong tháng).
class Budget(Base):
    __tablename__ = "budgets"
    __table_args__ = (
        UniqueConstraint("user_id", "category_id", "month", name="uq_budget_user_category_month"),
    )
    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(BigInteger, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    month = Column(Date, nullable=False)        # ngày đầu tháng, ví dụ 2026-10-01
    amount = Column(BigInteger, nullable=False)  # hạn mức của tháng đó
    alert_sent_level = Column(Integer, nullable=False, default=0, server_default="0")  # 0 | 80 | 100

# 5. Bảng transactions
class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        Index("ix_transactions_user_category_date", "user_id", "category_id", "txn_date"),
    )
    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    wallet_id = Column(BigInteger, ForeignKey("wallets.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(BigInteger, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    # Chỉ có với giao dịch type='saving' (nạp tiền vào mục tiêu tiết kiệm); 1 lần nạp ↔ 1 giao dịch.
    goal_contribution_id = Column(
        BigInteger,
        ForeignKey("goal_contributions.id", ondelete="SET NULL"),
        nullable=True,
        unique=True,
    )
    type = Column(String(50))                    # income | expense | saving
    amount = Column(BigInteger, nullable=False)
    txn_date = Column(DateTime(timezone=True), server_default=func.now())
    note = Column(Text)
    source = Column(String(50))                  # manual | nlp | chat | import
    raw_text = Column(Text)
    ai_confidence = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

# 6. Bảng saving_goals
class SavingGoal(Base):
    __tablename__ = "saving_goals"
    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    target_amount = Column(BigInteger, nullable=False)
    current_amount = Column(BigInteger, default=0)
    deadline = Column(Date)
    status = Column(String(50), default='active')

# 7. Bảng goal_contributions
class GoalContribution(Base):
    __tablename__ = "goal_contributions"
    id = Column(BigInteger, primary_key=True, index=True)
    goal_id = Column(BigInteger, ForeignKey("saving_goals.id", ondelete="CASCADE"), nullable=False)
    wallet_id = Column(BigInteger, ForeignKey("wallets.id", ondelete="CASCADE"), nullable=False)
    amount = Column(BigInteger, nullable=False)
    contributed_at = Column(DateTime(timezone=True), server_default=func.now())

# 8. Bảng nlp_feedback
class NLPFeedback(Base):
    __tablename__ = "nlp_feedback"
    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    transaction_id = Column(BigInteger, ForeignKey("transactions.id", ondelete="SET NULL"), nullable=True)
    raw_text = Column(Text, nullable=False)
    predicted_json = Column(JSONB)
    corrected_json = Column(JSONB)

# 9. Bảng notifications
class Notification(Base):
    __tablename__ = "notifications"
    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(50))
    title = Column(String(255))
    content = Column(Text)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# 10. Bảng chat_sessions
class ChatSession(Base):
    __tablename__ = "chat_sessions"
    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# 11. Bảng chat_messages
class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(BigInteger, primary_key=True, index=True)
    session_id = Column(BigInteger, ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(50))
    content = Column(Text, nullable=False)
    intent = Column(String(100))
    slots_json = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# 12. Bảng category_examples (pgvector)
# user_id để trống = câu mẫu chung của hệ thống; có user_id = câu riêng sinh ra từ phản hồi của người đó.
class CategoryExample(Base):
    __tablename__ = "category_examples"
    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    category_id = Column(BigInteger, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    text = Column(Text, nullable=False)
    embedding = Column(Vector(768))
    source = Column(String(50))                  # seed | feedback
