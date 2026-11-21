from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas.notification import NotificationOut, NotificationPage, UnreadCount
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=NotificationPage)
def list_notifications(page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=100),
                       db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return NotificationService.list_notifications(db, user.id, page, page_size)


@router.get("/unread-count", response_model=UnreadCount)
def unread_count(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return NotificationService.unread_count(db, user.id)


@router.patch("/read-all")
def mark_all_read(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return NotificationService.mark_all_read(db, user.id)


@router.patch("/{notification_id}/read", response_model=NotificationOut)
def mark_read(notification_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return NotificationService.mark_read(db, user.id, notification_id)
