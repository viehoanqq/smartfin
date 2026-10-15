import sys
import os
from datetime import datetime, timedelta, date
# Tự động nhận diện thư mục gốc backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.db.session import SessionLocal

# Import tất cả các model từ file domain.py
from app.models.domain import (
    User, Wallet, Category, Budget, Transaction, 
    RecurringTransaction, SavingGoal, Debt, 
    ChatSession, ChatMessage, CategoryExample
)
from app.core.security import get_password_hash
def seed_database():
    db = SessionLocal()
    try:


        # 2. Tạo User mẫu
        user = User(
            email="hoang123@gmail.com",
            password_hash=get_password_hash("123456"), # Thay bằng hash password thực tế nếu cần
            full_name="Nguyễn Việt Hoàng",
            phone_number="0987652321",
            date_of_birth=date(2004, 8, 16),
            currency="VND",
            monthly_income=15000000,
            role="user",
            is_active=True
        )
        db.add(user)
        db.flush() # Lấy user.id sau khi flush

        # 3. Tạo Wallets (Ví tài khoản)
        wallets = [
            Wallet(user_id=user.id, name="Ví Tiền Mặt", type="cash", initial_balance=2000000, balance=1850000),
            Wallet(user_id=user.id, name="Techcombank Chính", type="bank", initial_balance=10000000, balance=14500000),
            Wallet(user_id=user.id, name="Ví MoMo", type="e-wallet", initial_balance=1000000, balance=850000),
        ]
        db.add_all(wallets)
        db.flush()

        # 4. Tạo Categories (Danh mục Thu/Chi)
        categories = [
            # Chi tiêu (Expense)
            Category(user_id=user.id, name="Ăn uống & Cà phê", type="expense", icon="coffee", color="#F87171"),
            Category(user_id=user.id, name="Di chuyển & Xăng xe", type="expense", icon="car", color="#60A5FA"),
            Category(user_id=user.id, name="Mua sắm cá nhân", type="expense", icon="shopping-bag", color="#34D399"),
            Category(user_id=user.id, name="Hóa đơn Điện/Nước/Net", type="expense", icon="zap", color="#FBBF24"),
            # Thu nhập (Income)
            Category(user_id=user.id, name="Lương cứng hàng tháng", type="income", icon="briefcase", color="#4ADE80"),
            Category(user_id=user.id, name="Thưởng dự án", type="income", icon="award", color="#A78BFA"),
        ]
        db.add_all(categories)
        db.flush()

        # Ánh xạ nhanh ID danh mục
        cat_map = {c.name: c.id for c in categories}
        wallet_map = {w.name: w.id for w in wallets}

        # 5. Tạo Budgets (Ngân sách tháng)
        budgets = [
            Budget(user_id=user.id, category_id=cat_map["Ăn uống & Cà phê"], amount=4000000, period="monthly", start_date=date(2026, 10, 1), end_date=date(2026, 10, 31)),
            Budget(user_id=user.id, category_id=cat_map["Mua sắm cá nhân"], amount=2000000, period="monthly", start_date=date(2026, 10, 1), end_date=date(2026, 10, 31)),
        ]
        db.add_all(budgets)

        # 6. Tạo Transactions (Lịch sử giao dịch thực tế gần đây)
        today = datetime.now()
        transactions = [
            Transaction(
                user_id=user.id, wallet_id=wallet_map["Techcombank Chính"], category_id=cat_map["Lương cứng hàng tháng"],
                type="income", amount=15000000, txn_date=today - timedelta(days=15),
                note="Nhận lương tháng 10", source="manual"
            ),
            Transaction(
                user_id=user.id, wallet_id=wallet_map["Ví Tiền Mặt"], category_id=cat_map["Ăn uống & Cà phê"],
                type="expense", amount=45000, txn_date=today - timedelta(days=3),
                note="Uống cafe sữa đá với bạn", source="manual"
            ),
            Transaction(
                user_id=user.id, wallet_id=wallet_map["Ví MoMo"], category_id=cat_map["Di chuyển & Xăng xe"],
                type="expense", amount=120000, txn_date=today - timedelta(days=2),
                note="Đổ xăng xe máy", source="nlp", raw_text="đổ xăng 120k momo"
            ),
        ]
        db.add_all(transactions)

        # 7. Tạo RecurringTransactions (Giao dịch định kỳ)
        recurring = RecurringTransaction(
            user_id=user.id, wallet_id=wallet_map["Techcombank Chính"], category_id=cat_map["Hóa đơn Điện/Nước/Net"],
            type="expense", amount=350000, note="Tiền cước Internet FPT hàng tháng",
            frequency="monthly", next_run_date=date(2026, 11, 5), is_active=True
        )
        db.add(recurring)

        # 8. Tạo SavingGoals (Mục tiêu tiết kiệm)
        goal = SavingGoal(
            user_id=user.id, name="Nâng cấp Laptop mới", target_amount=25000000,
            current_amount=10000000, deadline=date(2026, 12, 31), status="active"
        )
        db.add(goal)

        # 9. Tạo Debts (Khoản vay/Cho vay)
        debt = Debt(
            user_id=user.id, kind="lend", person_name="Minh Quân",
            amount=500000, remaining=500000, due_date=date(2026, 10, 30), status="pending"
        )
        db.add(debt)

        # 10. Tạo Chat Session và Message mẫu cho AI Trợ lý
        chat_session = ChatSession(user_id=user.id, title="Tư vấn chi tiêu tháng 10")
        db.add(chat_session)
        db.flush()

        chat_msg = ChatMessage(
            session_id=chat_session.id, role="assistant",
            content="Xin chào Hoàng! Mình là AI của SmartFin. Tháng này bạn đã chi 165.000 đ cho ăn uống và di chuyển.",
            intent="greeting"
        )
        db.add(chat_msg)

        db.commit()
        print("Seed dữ liệu chuẩn thành công cho user: hoang.nguyen@smartfin.vn!")

    except Exception as e:
        db.rollback()
        print(f"Lỗi khi seed dữ liệu: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()