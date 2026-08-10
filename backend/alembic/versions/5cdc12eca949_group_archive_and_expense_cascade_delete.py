"""group archive and expense cascade delete

Revision ID: 5cdc12eca949
Revises: a334ac22035c
Create Date: 2026-08-07 20:13:51.409163

"""
from alembic import op
import sqlalchemy as sa


revision = '5cdc12eca949'
down_revision = 'a334ac22035c'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('groups', sa.Column('archived_at', sa.DateTime(timezone=True), nullable=True))

    op.drop_constraint('expenses_group_id_fkey', 'expenses', type_='foreignkey')
    op.create_foreign_key(
        'expenses_group_id_fkey', 'expenses', 'groups', ['group_id'], ['id'], ondelete='CASCADE'
    )

    # A group delete now cascades to its expenses (above); these two also need
    # ON DELETE CASCADE so that cascaded expense delete doesn't itself get blocked
    # by a leftover comment/share row with no delete action (same failure mode,
    # one level down the FK chain).
    op.drop_constraint('comments_expense_id_fkey', 'comments', type_='foreignkey')
    op.create_foreign_key(
        'comments_expense_id_fkey', 'comments', 'expenses', ['expense_id'], ['id'], ondelete='CASCADE'
    )
    op.drop_constraint('expense_shares_expense_id_fkey', 'expense_shares', type_='foreignkey')
    op.create_foreign_key(
        'expense_shares_expense_id_fkey', 'expense_shares', 'expenses', ['expense_id'], ['id'], ondelete='CASCADE'
    )


def downgrade() -> None:
    op.drop_constraint('expense_shares_expense_id_fkey', 'expense_shares', type_='foreignkey')
    op.create_foreign_key('expense_shares_expense_id_fkey', 'expense_shares', 'expenses', ['expense_id'], ['id'])
    op.drop_constraint('comments_expense_id_fkey', 'comments', type_='foreignkey')
    op.create_foreign_key('comments_expense_id_fkey', 'comments', 'expenses', ['expense_id'], ['id'])

    op.drop_constraint('expenses_group_id_fkey', 'expenses', type_='foreignkey')
    op.create_foreign_key('expenses_group_id_fkey', 'expenses', 'groups', ['group_id'], ['id'])

    op.drop_column('groups', 'archived_at')
