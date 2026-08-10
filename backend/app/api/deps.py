from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.users import current_active_user
from app.db.session import get_async_session
from app.models.expense import Expense, ExpenseShare
from app.models.group import Group, GroupMember

CurrentUser = current_active_user
DbSession = get_async_session

NOT_FOUND = HTTPException(404, detail={"errors": {"base": ["Invalid API Request: record not found"]}})


async def get_group_or_404(session: AsyncSession, group_id: str) -> Group:
    group = await session.get(Group, group_id)
    if not group:
        raise HTTPException(404, detail={"errors": {"base": ["Invalid API Request: record not found"]}})
    return group


async def ensure_group_member(session: AsyncSession, group_id: str, user_id: str) -> None:
    member = await session.get(GroupMember, {"group_id": group_id, "user_id": user_id})
    if not member:
        raise HTTPException(403, detail={"errors": {"base": ["You are not a member of this group"]}})


def ensure_group_owner(group: Group, user_id: str) -> None:
    if group.created_by_id != user_id:
        raise HTTPException(403, detail={"errors": {"base": ["Only the group owner can do this"]}})


async def ensure_expense_access(session: AsyncSession, expense: Expense, user_id: str) -> None:
    """Group expenses: caller must be a group member. Non-group (friend) expenses:
    caller must be one of the expense's participants. Queries ExpenseShare directly
    rather than relying on a preloaded `expense.shares` relationship, so this works
    regardless of what the caller eager-loaded.
    """
    if expense.group_id is not None:
        await ensure_group_member(session, expense.group_id, user_id)
        return
    result = await session.execute(
        select(ExpenseShare.user_id).where(ExpenseShare.expense_id == expense.id)
    )
    if user_id not in {row[0] for row in result.all()}:
        raise HTTPException(403, detail={"errors": {"base": ["You do not have access to this expense"]}})
