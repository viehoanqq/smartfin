from sqlalchemy import select, func, update
from sqlalchemy.orm import Session
from decimal import Decimal, ROUND_DOWN
from app.models import Budget, Category, Notification


def list_for_user(db: Session, user_id: int, offset: int, limit: int):
    return db.scalars(select(Notification).where(Notification.user_id == user_id)
                      .order_by(Notification.created_at.desc(), Notification.id.desc())
                      .offset(offset).limit(limit)).all()


def count_for_user(db: Session, user_id: int, unread_only: bool = False) -> int:
    stmt = select(func.count()).select_from(Notification).where(Notification.user_id == user_id)
    if unread_only:
        stmt = stmt.where(Notification.is_read.is_(False))
    return db.scalar(stmt) or 0


def get_for_user(db: Session, notification_id: int, user_id: int):
    return db.scalar(select(Notification).where(Notification.id == notification_id,
                                               Notification.user_id == user_id))


def mark_all_read(db: Session, user_id: int):
    db.execute(update(Notification).where(Notification.user_id == user_id,
                                          Notification.is_read.is_(False)).values(is_read=True))


def add_password_notice(db: Session, user_id: int, reset: bool = False):
    db.add(Notification(user_id=user_id, type="password_reset" if reset else "password_changed",
                        title="Đặt lại mật khẩu thành công" if reset else "Đổi mật khẩu thành công",
                        content="Mật khẩu của bạn đã được cập nhật. Nếu bạn không thực hiện thao tác này, hãy liên hệ hỗ trợ.",
                        is_read=False))


def add_budget_notice(db: Session, user_id: int, budget_id: int, level: int, spent: int, limit: int):
    category_name = db.scalar(
        select(Category.name).join(Budget, Budget.category_id == Category.id)
        .where(Budget.id == budget_id, Budget.user_id == user_id)
    )
    if category_name is None:
        raise ValueError("Không tìm thấy danh mục ngân sách của người dùng.")
    name = f"Ngân sách {category_name}"
    def money(amount: int) -> str:
        return f"{amount:,}".replace(",", ".") + "đ"

    # Do not round spending below the limit up to a misleading 100%.
    percent = format((Decimal(spent) * 100 / Decimal(limit)).quantize(
        Decimal("0.01"), rounding=ROUND_DOWN), "f").rstrip("0").rstrip(".").replace(".", ",")
    if spent > limit:
        title = f"{name} đã vượt hạn mức"
        content = f"{title}. Đã chi {money(spent)} / {money(limit)} ({percent}%), vượt {money(spent - limit)}."
    elif spent == limit:
        title = f"{name} đã đạt hạn mức"
        content = f"{title}."
    else:
        title = f"{name} sắp đạt hạn mức"
        content = f"{title}. Đã chi {money(spent)} / {money(limit)} ({percent}%)."
    db.add(Notification(
        user_id=user_id, type=f"budget_{level}",
        title=title,
        content=content,
        is_read=False,
    ))
