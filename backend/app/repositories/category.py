"""Chỉ chứa truy vấn CSDL cho danh mục, không có quy tắc nghiệp vụ."""
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.domain import Category


def list_all(db: Session, include_hidden: bool = False) -> list[Category]:
    stmt = select(Category).order_by(Category.name)
    if not include_hidden:
        stmt = stmt.where(Category.is_hidden.is_(False))
    return list(db.scalars(stmt))


def get(db: Session, category_id: int) -> Category | None:
    return db.get(Category, category_id)


def get_by_name(db: Session, name: str) -> Category | None:
    return db.scalar(select(Category).where(func.lower(Category.name) == name.lower()))


def add(db: Session, category: Category) -> Category:
    db.add(category)
    db.flush()
    return category
