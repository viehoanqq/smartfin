from sqlalchemy.orm import Session
from app.models.domain import Category

# Danh mục mặc định dùng chung hệ thống.
# Migration 0001_init_schema đã nạp sẵn danh sách này; hàm seed chỉ bổ sung nếu thiếu.
DEFAULT_CATEGORIES = [
    "Ăn uống", "Di chuyển", "Nhà ở", "Hóa đơn", "Mua sắm", "Giải trí",
    "Sức khỏe", "Giáo dục", "Gia đình", "Quà tặng", "Trả nợ", "Khác",
    "Lương", "Thưởng", "Thu nợ", "Thu nhập khác", "Tiết kiệm",
]


def seed(db: Session):
    for cat_name in DEFAULT_CATEGORIES:
        # Chỉ kiểm tra tồn tại theo tên để tránh lỗi thuộc tính
        exists = db.query(Category).filter(Category.name == cat_name).first()

        if not exists:
            cat = Category(
                name=cat_name,
                is_hidden=False,
                keywords=[]
            )
            db.add(cat)
    db.commit()
    print("Đã seed danh mục mặc định thành công!")
