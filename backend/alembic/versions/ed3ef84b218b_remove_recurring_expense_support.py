"""remove recurring expense support

Revision ID: ed3ef84b218b
Revises: eba42dc59762
Create Date: 2026-08-07 22:49:03.685197

"""
from alembic import op
import sqlalchemy as sa


revision = 'ed3ef84b218b'
down_revision = 'eba42dc59762'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column('expenses', 'repeat_interval')
    op.drop_column('expenses', 'next_repeat')


def downgrade() -> None:
    op.add_column('expenses', sa.Column('next_repeat', sa.String(length=40), nullable=True))
    op.add_column('expenses', sa.Column('repeat_interval', sa.String(length=20), nullable=False, server_default='never'))
    op.alter_column('expenses', 'repeat_interval', server_default=None)
