import sys
import os
from datetime import datetime, timedelta
import random

# Thêm đường dẫn gốc để import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import SessionLocal
from app.models.domain import User, Wallet, Category, Transaction
from app.core.security import get_password_hash

def seed_database():
    db = SessionLocal()
    try:
        print("🌱 Đang tiến hành seed dữ liệu mở rộng cho SmartFin...")

        # 1. Tạo User mẫu
        user = db.query(User).filter(User.email == "admin2@gmail.com").first()
        if not user:
            user = User(
                email="admin@gmail.com",
                password_hash=get_password_hash("123456"),
                full_name="Nguyễn Việt Hoàng",
                currency="VND",
                monthly_income=15000000,
                role="admin",
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"✅ Đã tạo User mẫu: {user.email}")
        else:
            print(f"ℹ️ User {user.email} đã tồn tại.")

        # 2. Tạo nhiều Ví mẫu (Wallets)
        existing_wallets = db.query(Wallet).filter(Wallet.user_id == user.id).all()
        if not existing_wallets:
            wallets_data = [
                {"name": "Ví Tiền Mặt", "type": "cash", "balance": 1500000},
                {"name": "Techcombank Chính", "type": "bank", "balance": 12500000},
                {"name": "Ví MoMo", "type": "momo", "balance": 850000},
                {"name": "Sacombank Tiết Kiệm", "type": "bank", "balance": 25000000},
                {"name": "ZaloPay", "type": "wallet", "balance": 430000}
            ]
            wallets = []
            for w in wallets_data:
                wallet = Wallet(
                    user_id=user.id,
                    name=w["name"],
                    type=w["type"],
                    initial_balance=w["balance"],
                    balance=w["balance"]
                )
                db.add(wallet)
                wallets.append(wallet)
            db.commit()
            for w in wallets:
                db.refresh(w)
            print(f"✅ Đã tạo {len(wallets)} ví mẫu.")
        else:
            wallets = existing_wallets
            print("ℹ️ Dữ liệu Ví đã tồn tại.")

        # 3. Tạo danh mục phong phú (Categories)
        existing_categories = db.query(Category).filter((Category.user_id == user.id) | (Category.user_id.is_(None))).all()
        if len(existing_categories) < 5:
            categories_data = [
                # Chi tiêu (Expense)
                {"name": "Ăn uống & Cà phê", "type": "expense", "icon": "utensils", "color": "#FF5733"},
                {"name": "Di chuyển & Xăng xe", "type": "expense", "icon": "car", "color": "#33FF57"},
                {"name": "Mua sắm cá nhân", "type": "expense", "icon": "shopping-bag", "color": "#3357FF"},
                {"name": "Hóa đơn Điện/Nước/Net", "type": "expense", "icon": "bolt", "color": "#F3FF33"},
                {"name": "Giải trí & Xem phim", "type": "expense", "icon": "film", "color": "#9B59B6"},
                {"name": "Y tế & Sức khỏe", "type": "expense", "icon": "heartbeat", "color": "#E74C3C"},
                
                # Thu nhập (Income)
                {"name": "Lương cứng hàng tháng", "type": "income", "icon": "briefcase", "color": "#2ECC71"},
                {"name": "Thưởng dự án", "type": "income", "icon": "gift", "color": "#F1C40F"},
                {"name": "Thu nhập phụ / Freelance", "type": "income", "icon": "laptop", "color": "#1ABC9C"}
            ]
            categories = []
            for c in categories_data:
                cat = Category(
                    user_id=user.id,
                    name=c["name"],
                    type=c["type"],
                    icon=c["icon"],
                    color=c["color"],
                    keywords=[c["name"].lower()]
                )
                db.add(cat)
                categories.append(cat)
            db.commit()
            for c in categories:
                db.refresh(c)
            print(f"✅ Đã tạo {len(categories)} danh mục mẫu.")
        else:
            categories = existing_categories
            print("ℹ️ Dữ liệu Danh mục đã tồn tại.")

        # Lọc danh mục theo Thu/Chi để dễ tạo giao dịch ngẫu nhiên
        expense_cats = [c for c in categories if c.type == "expense"]
        income_cats = [c for c in categories if c.type == "income"]

        # 4. Tạo hàng loạt Giao dịch mẫu (Transactions - khoảng 25-30 giao dịch rải rác trong 30 ngày qua)
        existing_txns = db.query(Transaction).filter(Transaction.user_id == user.id).all()
        if not existing_txns and wallets and categories:
            print("🔄 Đang tạo danh sách giao dịch giả lập phong phú...")
            
            sample_notes_expense = [
                "Ăn phở bò buổi sáng", "Uống cafe sữa đá với bạn", "Đổ xăng xe máy", 
                "Mua sách lập trình React", "Thanh toán tiền điện tháng này", "Xem phim rạp CGV",
                "Mua áo thun mới", "Ăn cơm trưa văn phòng", "Tiền gửi xe", "Mua thuốc phong thấp",
                "Gói cước 4G Viettel", "Trà sữa trân châu đường đen", "Mua rau củ siêu thị"
            ]
            sample_notes_income = [
                "Nhận lương tháng từ công ty", "Thưởng hoàn thành milestone dự án", 
                "Tiền bán đồ cũ trên Chợ Tốt", "Freelance code dạo cuối tuần"
            ]

            created_count = 0
            # Tạo giao dịch ngược về quá khứ trong vòng 30 ngày
            for i in range(30):
                txn_date = datetime.now() - timedelta(days=i, hours=random.randint(1, 10), minutes=random.randint(0, 59))
                
                # Xác định tỷ lệ: 80% là khoản chi, 20% là khoản thu
                is_income = random.random() < 0.20
                
                if is_income and income_cats:
                    cat = random.choice(income_cats)
                    amount = random.choice([500000, 1500000, 5000000, 15000000])
                    note = random.choice(sample_notes_income)
                    txn_type = "income"
                elif expense_cats:
                    cat = random.choice(expense_cats)
                    amount = random.choice([25000, 45000, 120000, 250000, 450000, 850000])
                    note = random.choice(sample_notes_expense)
                    txn_type = "expense"
                else:
                    continue

                wallet = random.choice(wallets)
                source = random.choice(["manual", "manual", "nlp"]) # 66% manual, 33% nlp

                txn = Transaction(
                    user_id=user.id,
                    wallet_id=wallet.id,
                    category_id=cat.id,
                    type=txn_type,
                    amount=amount,
                    txn_date=txn_date,
                    note=note,
                    source=source,
                    raw_text=note if source == "nlp" else None,
                    ai_confidence=0.95 if source == "nlp" else None
                )
                db.add(txn)
                
                # Cập nhật số dư ví mô phỏng thực tế
                if txn_type == "expense":
                    wallet.balance -= amount
                else:
                    wallet.balance += amount

                created_count += 1

            db.commit()
            print(f"✅ Đã tạo thành công {created_count} giao dịch mẫu trải dài trong 30 ngày qua.")
        else:
            print("ℹ️ Dữ liệu Giao dịch đã có sẵn.")

        print("🎉 Seed dữ liệu mở rộng hoàn tất thành công!")

    except Exception as e:
        db.rollback()
        print(f"❌ Lỗi khi seed dữ liệu mở rộng: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()