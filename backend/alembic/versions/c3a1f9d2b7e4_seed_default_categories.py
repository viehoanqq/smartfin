"""seed default categories

Revision ID: c3a1f9d2b7e4
Revises: b20fad7a5084
Create Date: 2026-10-20 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'c3a1f9d2b7e4'
down_revision: Union[str, Sequence[str], None] = 'b20fad7a5084'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# (tên, loại, icon, màu) - thứ tự quyết định id: 1..17
DEFAULT_CATEGORIES = [
    ("Ăn uống", "expense", "utensils", "#F87171"),
    ("Di chuyển", "expense", "car", "#60A5FA"),
    ("Nhà ở", "expense", "home", "#F59E0B"),
    ("Hóa đơn", "expense", "zap", "#FBBF24"),
    ("Mua sắm", "expense", "shopping-bag", "#34D399"),
    ("Giải trí", "expense", "film", "#A78BFA"),
    ("Sức khỏe", "expense", "heart-pulse", "#FB7185"),
    ("Giáo dục", "expense", "graduation-cap", "#38BDF8"),
    ("Gia đình", "expense", "users", "#F472B6"),
    ("Quà tặng", "expense", "gift", "#FB923C"),
    ("Trả nợ", "expense", "hand-coins", "#94A3B8"),
    ("Khác", "expense", "ellipsis", "#9CA3AF"),
    ("Lương", "income", "briefcase", "#4ADE80"),
    ("Thưởng", "income", "award", "#22C55E"),
    ("Thu nợ", "income", "banknote", "#2DD4BF"),
    ("Thu nhập khác", "income", "circle-plus", "#86EFAC"),
    ("Tiết kiệm", "saving", "piggy-bank", "#818CF8"),
]


def upgrade() -> None:
    categories = sa.table(
        "categories",
        sa.column("name", sa.String),
        sa.column("type", sa.String),
        sa.column("icon", sa.String),
        sa.column("color", sa.String),
        sa.column("is_hidden", sa.Boolean),
    )
    # Bỏ qua danh mục đã tồn tại (ví dụ đã được tạo bằng seed_data.py) để không bị trùng.
    # Chế độ offline (alembic --sql) không truy vấn được DB nên coi như chưa có gì.
    existing = set()
    if not op.get_context().as_sql:
        existing = {row[0] for row in op.get_bind().execute(sa.text("SELECT name FROM categories"))}
    rows = [
        {"name": n, "type": t, "icon": i, "color": c, "is_hidden": False}
        for n, t, i, c in DEFAULT_CATEGORIES
        if n not in existing
    ]
    if rows:
        op.bulk_insert(categories, rows)


def downgrade() -> None:
    categories = sa.table("categories", sa.column("name", sa.String))
    names = [n for n, _, _, _ in DEFAULT_CATEGORIES]
    op.execute(categories.delete().where(categories.c.name.in_(names)))
