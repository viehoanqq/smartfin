"""one wallet per user

Revision ID: d4e8a1c6f5b2
Revises: c3a1f9d2b7e4
Create Date: 2026-10-20 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'd4e8a1c6f5b2'
down_revision: Union[str, Sequence[str], None] = 'c3a1f9d2b7e4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Gộp các ví dư của cùng một user vào ví có id nhỏ nhất (giữ nguyên giao dịch và số dư)
    if not op.get_context().as_sql:
        op.execute("""
            CREATE TEMP TABLE _wallet_merge AS
            SELECT w.id AS old_id, k.keep_id
            FROM wallets w
            JOIN (SELECT user_id, MIN(id) AS keep_id FROM wallets GROUP BY user_id) k
              ON k.user_id = w.user_id
            WHERE w.id <> k.keep_id
        """)
        op.execute("""
            UPDATE wallets w SET
                balance = COALESCE(w.balance, 0) + s.bal,
                initial_balance = COALESCE(w.initial_balance, 0) + s.ini
            FROM (SELECT m.keep_id,
                         SUM(COALESCE(o.balance, 0)) AS bal,
                         SUM(COALESCE(o.initial_balance, 0)) AS ini
                  FROM _wallet_merge m JOIN wallets o ON o.id = m.old_id
                  GROUP BY m.keep_id) s
            WHERE w.id = s.keep_id
        """)
        op.execute("UPDATE transactions t SET wallet_id = m.keep_id FROM _wallet_merge m WHERE t.wallet_id = m.old_id")
        op.execute("UPDATE goal_contributions g SET wallet_id = m.keep_id FROM _wallet_merge m WHERE g.wallet_id = m.old_id")
        op.execute("DELETE FROM wallets WHERE id IN (SELECT old_id FROM _wallet_merge)")
        op.execute("DROP TABLE _wallet_merge")
    op.create_unique_constraint('uq_wallets_user_id', 'wallets', ['user_id'])


def downgrade() -> None:
    op.drop_constraint('uq_wallets_user_id', 'wallets', type_='unique')
