from sqlalchemy.orm import Session
from app.models.domain import Category

def seed(db: Session):
    # Danh mục mặc định dùng chung hệ thống
    default_cats = [
        "Ăn uống",
        "Cà phê & đồ uống",
        "Di chuyển",
        "Lương",
        "Tiết kiệm",
    ]

    for cat_name in default_cats:
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