from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.repositories import notification_repo


class NotificationService:
    @staticmethod
    def list_notifications(db: Session, user_id: int, page: int, page_size: int):
        return {"items": notification_repo.list_for_user(db, user_id, (page - 1) * page_size, page_size),
                "total": notification_repo.count_for_user(db, user_id), "page": page, "page_size": page_size}

    @staticmethod
    def unread_count(db: Session, user_id: int):
        return {"unread_count": notification_repo.count_for_user(db, user_id, unread_only=True)}

    @staticmethod
    def mark_read(db: Session, user_id: int, notification_id: int):
        item = notification_repo.get_for_user(db, notification_id, user_id)
        if item is None:
            raise HTTPException(status_code=404, detail="Không tìm thấy thông báo.")
        try:
            item.is_read = True
            db.commit()
            db.refresh(item)
            return item
        except Exception:
            db.rollback()
            raise

    @staticmethod
    def mark_all_read(db: Session, user_id: int):
        try:
            notification_repo.mark_all_read(db, user_id)
            db.commit()
            return {"message": "Đã đánh dấu tất cả thông báo là đã đọc."}
        except Exception:
            db.rollback()
            raise
