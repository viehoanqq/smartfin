from sqlalchemy import select, func, update
from sqlalchemy.orm import Session
from app.models import Notification


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
