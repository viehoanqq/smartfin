
from sqlalchemy import Column, String, BigInteger, Integer, Boolean, ForeignKey, Date, DateTime, Text, Float

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
    full_name = Column(String(255))
    role = Column(String(50), default='user')
    currency = Column(String(10), default='VND')
    monthly_income = Column(BigInteger)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# 2. Bảng wallets
class Wallet(Base):
    __tablename__ = "wallets"
    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    type = Column(String(50))
    initial_balance = Column(BigInteger, default=0)
    balance = Column(BigInteger, default=0)
    is_archived = Column(Boolean, default=False)

# 3. Bảng categories
class Category(Base):
    __tablename__ = "categories"
    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    parent_id = Column(BigInteger, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(255), nullable=False)
    type = Column(String(50))
    icon = Column(String(255))
    color = Column(String(50))
    keywords = Column(ARRAY(Text))
    is_hidden = Column(Boolean, default=False)

# 4. Bảng budgets
class Budget(Base):
    __tablename__ = "budgets"
    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(BigInteger, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    amount = Column(BigInteger, nullable=False)
    period = Column(String(50))
    start_date = Column(Date)
    end_date = Column(Date)
    alert_sent_level = Column(Integer)

# 5. Bảng transfers
class Transfer(Base):
    __tablename__ = "transfers"
    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    from_wallet_id = Column(BigInteger, ForeignKey("wallets.id", ondelete="CASCADE"), nullable=False)
    to_wallet_id = Column(BigInteger, ForeignKey("wallets.id", ondelete="CASCADE"), nullable=False)
    amount = Column(BigInteger, nullable=False)
    fee = Column(BigInteger, default=0)
    transfer_date = Column(DateTime(timezone=True), server_default=func.now())

# 6. Bảng transactions
class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    wallet_id = Column(BigInteger, ForeignKey("wallets.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(BigInteger, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(50))
    amount = Column(BigInteger, nullable=False)
    txn_date = Column(DateTime(timezone=True), server_default=func.now())
    note = Column(Text)
    source = Column(String(50))
    raw_text = Column(Text)
    ai_confidence = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

# 7. Bảng recurring_transactions
class RecurringTransaction(Base):
    __tablename__ = "recurring_transactions"
    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    wallet_id = Column(BigInteger, ForeignKey("wallets.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(BigInteger, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(50))
    amount = Column(BigInteger, nullable=False)
    note = Column(Text)
    frequency = Column(String(10))
    next_run_date = Column(Date)
    end_date = Column(Date)
    is_active = Column(Boolean, default=True)

# 8. Bảng saving_goals
class SavingGoal(Base):
    __tablename__ = "saving_goals"
    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    target_amount = Column(BigInteger, nullable=False)
    current_amount = Column(BigInteger, default=0)
    deadline = Column(Date)
    status = Column(String(50), default='active')

# 9. Bảng debts
class Debt(Base):
    __tablename__ = "debts"
    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    kind = Column(String(50))
    person_name = Column(String(255), nullable=False)
    amount = Column(BigInteger, nullable=False)
    remaining = Column(BigInteger, nullable=False)
    due_date = Column(Date)
    status = Column(String(50), default='pending')

# 10. Bảng nlp_feedback
class NLPFeedback(Base):
    __tablename__ = "nlp_feedback"
    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    transaction_id = Column(BigInteger, ForeignKey("transactions.id", ondelete="SET NULL"), nullable=True)
    raw_text = Column(Text, nullable=False)
    predicted_json = Column(JSONB)
    corrected_json = Column(JSONB)

# 11. Bảng notifications
class Notification(Base):
    __tablename__ = "notifications"
    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(50))
    title = Column(String(255))
    content = Column(Text)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# 12. Bảng goal_contributions
class GoalContribution(Base):
    __tablename__ = "goal_contributions"
    id = Column(BigInteger, primary_key=True, index=True)
    goal_id = Column(BigInteger, ForeignKey("saving_goals.id", ondelete="CASCADE"), nullable=False)
    wallet_id = Column(BigInteger, ForeignKey("wallets.id", ondelete="CASCADE"), nullable=False)
    amount = Column(BigInteger, nullable=False)
    contributed_at = Column(DateTime(timezone=True), server_default=func.now())

# 13. Bảng debt_payments
class DebtPayment(Base):
    __tablename__ = "debt_payments"
    id = Column(BigInteger, primary_key=True, index=True)
    debt_id = Column(BigInteger, ForeignKey("debts.id", ondelete="CASCADE"), nullable=False)
    wallet_id = Column(BigInteger, ForeignKey("wallets.id", ondelete="CASCADE"), nullable=False)
    amount = Column(BigInteger, nullable=False)
    paid_at = Column(DateTime(timezone=True), server_default=func.now())

# 14. Bảng chat_sessions
class ChatSession(Base):
    __tablename__ = "chat_sessions"
    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# 15. Bảng chat_messages
class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(BigInteger, primary_key=True, index=True)
    session_id = Column(BigInteger, ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(50))
    content = Column(Text, nullable=False)
    intent = Column(String(100))
    slots_json = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# 16. Bảng category_examples (pgvector)
class CategoryExample(Base):
    __tablename__ = "category_examples"
    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    category_id = Column(BigInteger, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    text = Column(Text, nullable=False)
    embedding = Column(Vector(768))
    source = Column(String(50))