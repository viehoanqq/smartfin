import sys
import os
from datetime import datetime, timedelta, date
# Tự động nhận diện thư mục gốc backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.db.session import SessionLocal

# Import các model từ file domain.py
from app.models.domain import (
    User, Wallet, Category, Budget, Transaction,
    SavingGoal, GoalContribution,
    ChatSession, ChatMessage, CategoryExample,
)
from app.core.security import get_password_hash

DEMO_EMAIL = "hoang123@gmail.com"
DEMO_PASSWORD = "123456"

# Danh mục CỐ ĐỊNH dùng chung cho mọi người dùng: (tên, loại, icon, màu)
DEFAULT_CATEGORIES = [
    # Chi tiêu (expense)
    ("Ăn uống", "expense", "utensils", "#F87171"),
    ("Di chuyển", "expense", "car", "#60A5FA"),
    ("Nhà ở", "expense", "home", "#F59E0B"),
    ("Hóa đơn", "expense", "zap", "#FBBF24"),
    ("Mua sắm", "expense", "shopping-bag", "#34D399"),
    ("Giải trí", "expense", "film", "#A78BFA"),
    ("Sức khỏe", "expense", "heart-pulse", "#FB7185"),
    ("Giáo dục", "expense", "graduation-cap", "#38BDF8"),
    ("Gia đình", "expense", "users", "#F472B6"),
    ("Quà tặng", "expense", "gift", "#FB923C"),
    ("Trả nợ", "expense", "hand-coins", "#94A3B8"),
    ("Khác", "expense", "ellipsis", "#9CA3AF"),
    # Thu nhập (income)
    ("Lương", "income", "briefcase", "#4ADE80"),
    ("Thưởng", "income", "award", "#22C55E"),
    ("Thu nợ", "income", "banknote", "#2DD4BF"),
    ("Thu nhập khác", "income", "circle-plus", "#86EFAC"),
    # Tiết kiệm (saving)
    ("Tiết kiệm", "saving", "piggy-bank", "#818CF8"),
]

# Câu mẫu chung cho AI phân loại (embedding sẽ được pipeline NLP tính và cập nhật sau)
CATEGORY_EXAMPLES = {
    "Ăn uống": ["ăn phở", "uống cf", "trà sữa", "cơm trưa", "ăn sáng"],
    "Di chuyển": ["đổ xăng", "grab về nhà", "gửi xe", "vé xe buýt"],
    "Giải trí": ["xem phim", "chơi game", "đi karaoke"],
    "Mua sắm": ["mua quần áo", "mua giày", "đặt hàng shopee"],
    "Hóa đơn": ["tiền điện", "tiền nước", "tiền wifi"],
    "Trả nợ": ["trả nợ", "trả góp", "trả tiền cho bạn"],
    "Lương": ["nhận lương", "lương tháng"],
}


def balance_delta(txn_type: str, amount: int) -> int:
    """Quy tắc số dư ví: income cộng vào ví; expense và saving trừ khỏi ví."""
    return amount if txn_type == "income" else -amount


def seed_categories(db):
    """Tạo danh mục dùng chung (chạy lại nhiều lần không bị trùng). Trả về dict tên -> Category."""
    existing = {c.name: c for c in db.query(Category).all()}
    for name, ctype, icon, color in DEFAULT_CATEGORIES:
        if name not in existing:
            cat = Category(name=name, type=ctype, icon=icon, color=color, is_hidden=False)
            db.add(cat)
            existing[name] = cat
    db.flush()
    return existing


def seed_category_examples(db, cats):
    """Tạo câu mẫu chung (user_id để trống) cho từng danh mục, bỏ qua danh mục đã có câu mẫu."""
    for cat_name, texts in CATEGORY_EXAMPLES.items():
        cat = cats[cat_name]
        has_examples = db.query(CategoryExample).filter(
            CategoryExample.category_id == cat.id,
            CategoryExample.user_id.is_(None),
        ).count()
        if has_examples:
            continue
        for text in texts:
            db.add(CategoryExample(user_id=None, category_id=cat.id, text=text, embedding=None, source="seed"))


def seed_database():
    db = SessionLocal()
    try:
        # 1. Danh mục + câu mẫu dùng chung (không thuộc về người dùng nào)
        cats = seed_categories(db)
        seed_category_examples(db, cats)

        if db.query(User).filter(User.email == DEMO_EMAIL).first():
            db.commit()
            print(f"Đã có user {DEMO_EMAIL}; chỉ bổ sung danh mục và câu mẫu dùng chung.")
            return

        # 2. Tạo User mẫu
        user = User(
            email=DEMO_EMAIL,
            password_hash=get_password_hash(DEMO_PASSWORD),
            full_name="Nguyễn Việt Hoàng",
            phone_number="0987652321",
            date_of_birth=date(2004, 8, 16),
            currency="VND",
            monthly_income=15000000,
            role="user",
            is_active=True
        )
        db.add(user)
        db.flush()  # Lấy user.id sau khi flush

        # 3. Tạo Wallets (số dư ban đầu; balance sẽ được cập nhật theo giao dịch ở bước 6)
        # Mỗi user chỉ có 1 ví; các khóa cash/bank/momo cùng trỏ về ví này
        main_wallet = Wallet(user_id=user.id, name="Ví chính", type="cash", initial_balance=13000000, balance=13000000)
        wallets = {"cash": main_wallet, "bank": main_wallet, "momo": main_wallet}
        db.add(main_wallet)
        db.flush()

        # 4. Tạo Budgets: mỗi dòng là ngân sách của MỘT tháng (month = ngày đầu tháng)
        today = datetime.now()
        this_month = date(today.year, today.month, 1)
        db.add_all([
            Budget(user_id=user.id, category_id=cats["Ăn uống"].id, month=this_month, amount=4000000),
            Budget(user_id=user.id, category_id=cats["Mua sắm"].id, month=this_month, amount=2000000),
        ])

        # 5. Mục tiêu tiết kiệm + một lần nạp tiền
        goal = SavingGoal(
            user_id=user.id, name="Nâng cấp Laptop mới", target_amount=25000000,
            current_amount=0, deadline=date(today.year, 12, 31), status="active"
        )
        db.add(goal)
        db.flush()

        contribution = GoalContribution(goal_id=goal.id, wallet_id=wallets["bank"].id, amount=2000000)
        db.add(contribution)
        db.flush()
        goal.current_amount += contribution.amount

        # 6. Tạo Transactions; đồng thời cập nhật số dư ví theo balance_delta()
        transactions = [
            Transaction(
                user_id=user.id, wallet_id=wallets["bank"].id, category_id=cats["Lương"].id,
                type="income", amount=15000000, txn_date=today - timedelta(days=15),
                note="Nhận lương tháng này", source="manual"
            ),
            Transaction(
                user_id=user.id, wallet_id=wallets["cash"].id, category_id=cats["Ăn uống"].id,
                type="expense", amount=45000, txn_date=today - timedelta(days=3),
                note="Uống cafe sữa đá với bạn", source="manual"
            ),
            Transaction(
                user_id=user.id, wallet_id=wallets["momo"].id, category_id=cats["Di chuyển"].id,
                type="expense", amount=120000, txn_date=today - timedelta(days=2),
                note="Đổ xăng xe máy", source="nlp", raw_text="đổ xăng 120k momo", ai_confidence=0.91
            ),
            Transaction(
                user_id=user.id, wallet_id=wallets["momo"].id, category_id=cats["Giải trí"].id,
                type="expense", amount=90000, txn_date=today - timedelta(days=1),
                note="Xem phim cuối tuần", source="nlp", raw_text="xem phim 90k momo", ai_confidence=0.88
            ),
            Transaction(
                user_id=user.id, wallet_id=wallets["cash"].id, category_id=cats["Trả nợ"].id,
                type="expense", amount=500000, txn_date=today - timedelta(days=5),
                note="Trả nợ bạn Quân", source="manual"
            ),
            # Giao dịch tiết kiệm: gắn với lần nạp tiền ở bước 5
            Transaction(
                user_id=user.id, wallet_id=wallets["bank"].id, category_id=cats["Tiết kiệm"].id,
                goal_contribution_id=contribution.id,
                type="saving", amount=contribution.amount, txn_date=today - timedelta(days=10),
                note="Gửi tiết kiệm mua laptop", source="manual"
            ),
        ]
        db.add_all(transactions)
        for t in transactions:
            wallet = next(w for w in wallets.values() if w.id == t.wallet_id)
            wallet.balance += balance_delta(t.type, t.amount)

        # 7. Tạo Chat Session và Message mẫu cho AI Trợ lý
        spent = sum(t.amount for t in transactions if t.type == "expense")
        spent_text = f"{spent:,}".replace(",", ".")
        chat_session = ChatSession(user_id=user.id, title="Tư vấn chi tiêu tháng này")
        db.add(chat_session)
        db.flush()

        db.add(ChatMessage(
            session_id=chat_session.id, role="assistant",
            content=f"Xin chào Hoàng! Mình là AI của SmartFin. Tháng này bạn đã chi {spent_text} đ.",
            intent="greeting"
        ))

        db.commit()
        print(f"Seed dữ liệu thành công. Đăng nhập thử: {DEMO_EMAIL} / {DEMO_PASSWORD}")

    except Exception as e:
        db.rollback()
        print(f"Lỗi khi seed dữ liệu: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
