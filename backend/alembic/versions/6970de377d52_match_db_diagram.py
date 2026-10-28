"""match_db_diagram

Chuyển schema sang sơ đồ DB 12 bảng. Đã chỉnh tay so với bản autogenerate:
  - xóa bảng đúng thứ tự khóa ngoại (debt_payments trước debts);
  - giữ dữ liệu: đổi tên cột (created_at->create_at, deleted_at->delete_at, ...),
    chép budgets.amount -> budget_amount;
  - gộp danh mục trùng tên thành danh mục dùng chung trước khi bỏ user_id;
  - gộp ngân sách trùng (user_id, category_id) trước khi tạo unique;
  - thêm CHECK constraint và đặt tên cho mọi khóa ngoại.

Migration này có xóa dữ liệu (4 bảng, một số cột) nên KHÔNG hỗ trợ downgrade:
muốn quay lại hãy khôi phục từ bản sao lưu (pg_dump).

Revision ID: 6970de377d52
Revises: 322066e386eb
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '6970de377d52'
down_revision: Union[str, Sequence[str], None] = '322066e386eb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ---- 1. Xóa 4 bảng không còn trong sơ đồ (đúng thứ tự phụ thuộc) ----
    op.drop_index(op.f('ix_debt_payments_id'), table_name='debt_payments')
    op.drop_table('debt_payments')
    op.drop_index(op.f('ix_debts_id'), table_name='debts')
    op.drop_table('debts')
    op.drop_index(op.f('ix_transfers_id'), table_name='transfers')
    op.drop_table('transfers')
    op.drop_index(op.f('ix_recurring_transactions_id'), table_name='recurring_transactions')
    op.drop_table('recurring_transactions')

    # ---- 2. categories: gộp danh mục trùng tên về một bản dùng chung ----
    # canonical = id nhỏ nhất của mỗi tên (không phân biệt hoa thường)
    for table in ('transactions', 'budgets', 'category_examples'):
        op.execute(f"""
            UPDATE {table} x SET category_id = m.keep_id
            FROM (SELECT id, MIN(id) OVER (PARTITION BY lower(name)) AS keep_id FROM categories) m
            WHERE x.category_id = m.id AND m.id <> m.keep_id
        """)
    op.execute("DELETE FROM categories WHERE id NOT IN (SELECT MIN(id) FROM categories GROUP BY lower(name))")
    op.execute("UPDATE categories SET is_hidden = false WHERE is_hidden IS NULL")

    # ---- 3. budgets: gộp trùng (user_id, category_id), rồi chuyển cột ----
    op.execute("""
        UPDATE budgets b SET amount = s.total
        FROM (SELECT MIN(id) AS keep, SUM(amount) AS total FROM budgets GROUP BY user_id, category_id) s
        WHERE b.id = s.keep
    """)
    op.execute("DELETE FROM budgets WHERE id NOT IN (SELECT MIN(id) FROM budgets GROUP BY user_id, category_id)")

    op.add_column('budgets', sa.Column('budget_amount', sa.BigInteger(), nullable=True))
    op.add_column('budgets', sa.Column('current_amount', sa.BigInteger(), nullable=True))
    op.add_column('budgets', sa.Column('create_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True))
    op.add_column('budgets', sa.Column('update_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True))
    op.execute("UPDATE budgets SET budget_amount = amount, current_amount = 0")
    op.alter_column('budgets', 'budget_amount', existing_type=sa.BigInteger(), nullable=False)
    op.create_index(op.f('ix_budgets_user_id'), 'budgets', ['user_id'], unique=False)
    op.create_unique_constraint('uq_budgets_user_category', 'budgets', ['user_id', 'category_id'])
    op.create_check_constraint('ck_budgets_amount_positive', 'budgets', 'budget_amount > 0')
    op.drop_constraint('budgets_category_id_fkey', 'budgets', type_='foreignkey')
    op.create_foreign_key('fk_budgets_category_id', 'budgets', 'categories', ['category_id'], ['id'], ondelete='RESTRICT')
    for col in ('amount', 'end_date', 'start_date', 'period'):
        op.drop_column('budgets', col)

    # ---- 4. categories: bỏ cột per-user, thêm unique tên ----
    op.alter_column('categories', 'is_hidden', existing_type=sa.BOOLEAN(),
                    nullable=False, server_default=sa.text('false'))
    op.drop_constraint('categories_user_id_fkey', 'categories', type_='foreignkey')
    op.drop_constraint('categories_parent_id_fkey', 'categories', type_='foreignkey')
    for col in ('user_id', 'icon', 'parent_id', 'color', 'type'):
        op.drop_column('categories', col)
    op.create_index('uq_categories_name', 'categories', [sa.literal_column('lower(name)')], unique=True)

    # ---- 5. goal_contributions / notifications / saving_goals ----
    op.drop_constraint('goal_contributions_wallet_id_fkey', 'goal_contributions', type_='foreignkey')
    op.drop_column('goal_contributions', 'wallet_id')
    op.create_index('ix_notifications_user_read', 'notifications', ['user_id', 'is_read'], unique=False)
    op.add_column('saving_goals', sa.Column('period', sa.String(length=10), nullable=True))
    op.add_column('saving_goals', sa.Column('duration_value', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_saving_goals_user_id'), 'saving_goals', ['user_id'], unique=False)
    op.drop_column('saving_goals', 'deadline')
    op.drop_column('saving_goals', 'current_amount')

    # ---- 6. transactions: GIỮ dữ liệu thời gian và xóa mềm bằng cách đổi tên cột ----
    op.alter_column('transactions', 'created_at', new_column_name='create_at')
    op.alter_column('transactions', 'deleted_at', new_column_name='delete_at')
    op.add_column('transactions', sa.Column('budget_id', sa.BigInteger(), nullable=True))
    op.add_column('transactions', sa.Column('goal_contributions_id', sa.BigInteger(), nullable=True))
    op.execute("UPDATE transactions SET type = 'expense' WHERE type IS NULL")
    op.alter_column('transactions', 'type', existing_type=sa.VARCHAR(length=50),
                    type_=sa.String(length=10), nullable=False)
    op.create_check_constraint('ck_transactions_type', 'transactions', "type IN ('income','expense','saving')")
    op.create_check_constraint('ck_transactions_amount_positive', 'transactions', 'amount > 0')
    op.create_index('ix_transactions_user_txn_date', 'transactions', ['user_id', 'txn_date'], unique=False)
    op.drop_constraint('transactions_category_id_fkey', 'transactions', type_='foreignkey')
    op.drop_constraint('transactions_wallet_id_fkey', 'transactions', type_='foreignkey')
    op.create_foreign_key('fk_transactions_wallet_id', 'transactions', 'wallets', ['wallet_id'], ['id'], ondelete='RESTRICT')
    op.create_foreign_key('fk_transactions_category_id', 'transactions', 'categories', ['category_id'], ['id'], ondelete='RESTRICT')
    op.create_foreign_key('fk_transactions_budget_id', 'transactions', 'budgets', ['budget_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_transactions_goal_contributions_id', 'transactions', 'goal_contributions',
                          ['goal_contributions_id'], ['id'], ondelete='SET NULL')

    # ---- 7. users: đổi tên cột thời gian, bỏ avatar_url và currency ----
    op.alter_column('users', 'created_at', new_column_name='create_at')
    op.alter_column('users', 'updated_at', new_column_name='update_at')
    op.drop_column('users', 'avatar_url')
    op.drop_column('users', 'currency')

    # ---- 8. wallets ----
    op.create_index(op.f('ix_wallets_user_id'), 'wallets', ['user_id'], unique=False)


def downgrade() -> None:
    raise NotImplementedError(
        "Migration match_db_diagram xóa dữ liệu (bảng transfers, debts, debt_payments, "
        "recurring_transactions và nhiều cột) nên không thể đảo ngược tự động. "
        "Hãy khôi phục từ bản sao lưu pg_dump."
    )