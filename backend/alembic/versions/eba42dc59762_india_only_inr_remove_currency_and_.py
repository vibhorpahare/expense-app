"""india only inr remove currency and timezone

Revision ID: eba42dc59762
Revises: 5cdc12eca949
Create Date: 2026-08-07 22:12:00.189237

"""
from alembic import op
import sqlalchemy as sa


revision = 'eba42dc59762'
down_revision = '5cdc12eca949'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # App is India/INR-only now -- normalize any existing non-INR rows before
    # dropping the per-user currency/timezone preferences and the currency lookup table.
    op.execute("UPDATE expenses SET currency_code = 'INR' WHERE currency_code != 'INR'")

    op.drop_column('users', 'default_currency')
    op.drop_column('users', 'timezone')
    op.drop_table('currencies')


def downgrade() -> None:
    op.create_table(
        'currencies',
        sa.Column('currency_code', sa.String(length=10), nullable=False),
        sa.Column('unit', sa.String(length=10), nullable=False),
        sa.PrimaryKeyConstraint('currency_code'),
    )
    op.add_column('users', sa.Column('timezone', sa.String(length=50), nullable=False, server_default='UTC'))
    op.alter_column('users', 'timezone', server_default=None)
    op.add_column('users', sa.Column('default_currency', sa.String(length=3), nullable=False, server_default='USD'))
    op.alter_column('users', 'default_currency', server_default=None)
