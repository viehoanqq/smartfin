"""Dữ liệu DEMO: 1 người dùng mẫu + ví, ngân sách, giao dịch, mục tiêu tiết kiệm, chat.

Chạy từ thư mục backend (sau khi alembic upgrade head):
    python -m app.db.seed_data

Khớp sơ đồ DB mới: danh mục là dữ liệu dùng chung nên script nạp danh mục mặc định
(seed/default_categories.py) rồi chỉ TRA CỨU theo tên, không tự tạo danh mục riêng.
Chạy lại nhiều lần an toàn: nếu user mẫu đã tồn tại thì bỏ qua.
"""
import os
import sys
from datetime import datetime, timedelta

# Tự động nhận diện thư mục gốc backend (để import app.* và seed.*)
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from sqlalchemy import select

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.domain import (
    Budget, Category, ChatMessage, ChatSession, GoalContribution,
    SavingGoal, Transaction, User, Wallet,
)
from app.db.default_categories import seed as seed_default_categories

DEMO_EMAIL = "hoang123@gmail.com"


def seed_database():
    db = SessionLocal()
    try:
        # 1. Danh mục mặc định dùng chung (idempotent)
        seed_default_categories(db)

        if db.scalar(select(User).where(User.email == DEMO_EMAIL)):
            print(f"User {DEMO_EMAIL} đã tồn tại, bỏ qua seed demo.")
            return

        cats = {c.name: c.id for c in db.scalars(select(Category))}

        # 2. User mẫu
        user = User(
            email=DEMO_EMAIL,
            password_hash=get_password_hash("123456"),
            full_name="Nguyễn Việt Hoàng",
            phone_number="0987652321",
            date_of_birth=datetime(2004, 8, 16).date(),
            monthly_income=15_000_000,
            role="user",
            is_active=True,
        )
        db.add(user)
        db.flush()

        # 3. Ví (balance sẽ được tính lại từ giao dịch ở bước 8)
        wallets = {
            "cash": Wallet(user_id=user.id, name="Ví Tiền Mặt", type="cash", initial_balance=2_000_000, balance=0),
            "bank": Wallet(user_id=user.id, name="Techcombank Chính", type="bank", initial_balance=10_000_000, balance=0),
            "momo": Wallet(user_id=user.id, name="Ví MoMo", type="e-wallet", initial_balance=1_000_000, balance=0),
        }
        db.add_all(wallets.values())
        db.flush()

        # 4. Ngân sách (mỗi người 1 ngân sách cho mỗi danh mục)
        budget_coffee = Budget(user_id=user.id, category_id=cats["Cà phê & đồ uống"],
                               budget_amount=1_000_000, current_amount=0, alert_sent_level=0)
        budget_move = Budget(user_id=user.id, category_id=cats["Di chuyển"],
                             budget_amount=800_000, current_amount=0, alert_sent_level=0)
        db.add_all([budget_coffee, budget_move])
        db.flush()

        # 5. Mục tiêu tiết kiệm + lần nạp tiền
        goal = SavingGoal(user_id=user.id, name="Nâng cấp Laptop mới", target_amount=25_000_000,
                          period="thang", duration_value=6, status="active")
        db.add(goal)
        db.flush()
        contribution = GoalContribution(goal_id=goal.id, amount=10_000_000)
        db.add(contribution)
        db.flush()

        # 6. Giao dịch (income | expense | saving)
        now = datetime.now().astimezone()
        txns = [
            Transaction(user_id=user.id, wallet_id=wallets["bank"].id, category_id=cats["Lương"],
                        type="income", amount=15_000_000, txn_date=now - timedelta(days=15),
                        note="Nhận lương tháng 10", source="manual"),
            Transaction(user_id=user.id, wallet_id=wallets["bank"].id, category_id=cats["Tiết kiệm"],
                        type="saving", amount=10_000_000, txn_date=now - timedelta(days=14),
                        note="Nạp mục tiêu laptop", source="manual",
                        goal_contributions_id=contribution.id),
            Transaction(user_id=user.id, wallet_id=wallets["cash"].id, category_id=cats["Cà phê & đồ uống"],
                        type="expense", amount=45_000, txn_date=now - timedelta(days=3),
                        note="Uống cafe sữa đá với bạn", source="manual", budget_id=budget_coffee.id),
            Transaction(user_id=user.id, wallet_id=wallets["momo"].id, category_id=cats["Di chuyển"],
                        type="expense", amount=120_000, txn_date=now - timedelta(days=2),
                        note="Đổ xăng xe máy", source="nlp", raw_text="đổ xăng 120k momo",
                        ai_confidence=0.93, budget_id=budget_move.id),
        ]
        db.add_all(txns)

        # 7. Cập nhật số đã chi của ngân sách
        budget_coffee.current_amount = 45_000
        budget_move.current_amount = 120_000

        # 8. BR01: số dư = ban đầu + thu - chi - tiết kiệm
        for t in txns:
            w = next(w for w in wallets.values() if w.id == t.wallet_id)
            w.balance = (w.balance or 0) + (t.amount if t.type == "income" else -t.amount)
        for w in wallets.values():
            w.balance += w.initial_balance

        # 9. Chat mẫu
        session = ChatSession(user_id=user.id, title="Tư vấn chi tiêu tháng 10")
        db.add(session)
        db.flush()
        db.add(ChatMessage(
            session_id=session.id, role="assistant", intent="greeting",
            content="Xin chào Hoàng! Mình là AI của SmartFin. Tháng này bạn đã chi 165.000 đ cho cà phê và di chuyển.",
        ))

        db.commit()
        print(f"Seed demo thành công. Đăng nhập: {DEMO_EMAIL} / 123456")
    except Exception as e:
        db.rollback()
        print(f"Lỗi khi seed dữ liệu: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
