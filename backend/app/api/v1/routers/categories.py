from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.v1.dev_auth import CurrentUser, get_current_user, require_admin
from app.db.session import get_db
from app.schemas.category import (
    CategoryCreate,
    CategoryMerge,
    CategoryMergeResult,
    CategoryOut,
    CategoryUpdate,
)
from app.services import category as service
from app.services.category import CategoryError

router = APIRouter(prefix="/categories", tags=["categories"])


def _raise(e: CategoryError):
    raise HTTPException(status_code=e.status, detail={"code": e.code, "message": e.message})


def _ensure_admin(user: CurrentUser):
    if getattr(user, "role", None) != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Chỉ quản trị viên mới có quyền truy cập"},
        )


@router.get("", response_model=list[CategoryOut])
def list_visible_categories(
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
):
    """Chỉ lấy danh mục đang hiển thị (is_hidden = false)"""
    return service.list_categories(db, False)


@router.get("/admin/all", tags=["Admin"])
def admin_list_all_categories(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Admin lấy tất cả danh mục (cả is_hidden = false và true)"""
    _ensure_admin(user)
    rows = db.execute(text("SELECT * FROM categories ORDER BY id ASC")).mappings().all()
    return [dict(r) for r in rows]


@router.post("", response_model=CategoryOut, status_code=201)
def create_category(
    body: CategoryCreate,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_admin),
):
    try:
        return service.create_category(db, body.name, body.keywords)
    except CategoryError as e:
        _raise(e)


@router.patch("/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: int,
    body: CategoryUpdate,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_admin),
):
    try:
        return service.update_category(
            db,
            category_id,
            name=body.name,
            keywords=body.keywords,
            is_hidden=body.is_hidden,
        )
    except CategoryError as e:
        _raise(e)


@router.post("/{category_id}/merge", response_model=CategoryMergeResult)
def merge_category(
    category_id: int,
    body: CategoryMerge,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_admin),
):
    try:
        return service.merge_categories(db, category_id, body.target_id)
    except CategoryError as e:
        _raise(e)