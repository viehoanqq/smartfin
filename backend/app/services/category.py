"""Quy tắc nghiệp vụ M03 - Danh mục.

Theo sơ đồ DB, danh mục là dữ liệu dùng chung (không có user_id): mọi người dùng được
xem, chỉ admin được thêm/sửa/ẩn/gộp. Không xóa cứng (BR07), chỉ ẩn hoặc gộp.
"""
from sqlalchemy import update
from sqlalchemy.orm import Session

from app.models.domain import Budget, Category, CategoryExample, Transaction
from app.repositories import category as repo


class CategoryError(Exception):
    def __init__(self, code: str, message: str, status: int = 400):
        super().__init__(message)
        self.code, self.message, self.status = code, message, status


def list_categories(db: Session, include_hidden: bool = False) -> list[Category]:
    return repo.list_all(db, include_hidden)


def _get_or_404(db: Session, category_id: int) -> Category:
    cat = repo.get(db, category_id)
    if cat is None:
        raise CategoryError("CATEGORY_NOT_FOUND", "Không tìm thấy danh mục", 404)
    return cat


def create_category(db: Session, name: str, keywords: list[str]) -> Category:
    if repo.get_by_name(db, name):
        raise CategoryError("CATEGORY_DUPLICATED", "Tên danh mục đã tồn tại", 409)
    cat = repo.add(db, Category(name=name, keywords=keywords, is_hidden=False))
    db.commit()
    return cat


def update_category(db: Session, category_id: int, *, name=None, keywords=None, is_hidden=None) -> Category:
    cat = _get_or_404(db, category_id)
    if name is not None and name.lower() != cat.name.lower():
        if repo.get_by_name(db, name):
            raise CategoryError("CATEGORY_DUPLICATED", "Tên danh mục đã tồn tại", 409)
    if name is not None:
        cat.name = name
    if keywords is not None:
        cat.keywords = keywords
    if is_hidden is not None:
        cat.is_hidden = is_hidden
    db.commit()
    return cat


def merge_categories(db: Session, source_id: int, target_id: int) -> dict:
    """FR13: chuyển toàn bộ dữ liệu từ danh mục nguồn sang đích rồi ẩn nguồn.
    Chạy trong một transaction CSDL: lỗi giữa chừng thì rollback hết."""
    if source_id == target_id:
        raise CategoryError("MERGE_SAME_CATEGORY", "Danh mục nguồn và đích phải khác nhau")
    source = _get_or_404(db, source_id)
    target = _get_or_404(db, target_id)
    if target.is_hidden:
        raise CategoryError("MERGE_TARGET_HIDDEN", "Không thể gộp vào danh mục đã ẩn")

    try:
        budgets_moved = budgets_combined = 0
        for sb in db.query(Budget).filter(Budget.category_id == source.id).all():
            tb = (
                db.query(Budget)
                .filter(Budget.user_id == sb.user_id, Budget.category_id == target.id)
                .one_or_none()
            )
            if tb is None:  # người dùng chưa có ngân sách cho đích: chuyển nguyên
                sb.category_id = target.id
                budgets_moved += 1
            else:  # đã có (unique user_id + category_id): cộng dồn rồi bỏ ngân sách nguồn
                tb.budget_amount += sb.budget_amount
                tb.current_amount = (tb.current_amount or 0) + (sb.current_amount or 0)
                db.execute(update(Transaction).where(Transaction.budget_id == sb.id).values(budget_id=tb.id))
                db.flush()
                db.delete(sb)
                budgets_combined += 1
        db.flush()

        tx_moved = db.execute(
            update(Transaction).where(Transaction.category_id == source.id).values(category_id=target.id)
        ).rowcount
        ex_moved = db.execute(
            update(CategoryExample).where(CategoryExample.category_id == source.id).values(category_id=target.id)
        ).rowcount

        merged = list(target.keywords or [])
        lower = {k.lower() for k in merged}
        merged += [k for k in (source.keywords or []) if k.lower() not in lower]
        target.keywords = merged
        source.is_hidden = True
        db.commit()
    except Exception:
        db.rollback()
        raise

    return {
        "source_id": source.id, "target_id": target.id,
        "transactions_moved": tx_moved, "budgets_moved": budgets_moved,
        "budgets_combined": budgets_combined, "examples_moved": ex_moved,
    }
