from datetime import datetime, timezone
from html import escape

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import ensure_expense_access, ensure_group_owner, get_group_or_404
from app.core.users import current_active_user
from app.db.session import get_async_session
from app.models.comment import Comment
from app.models.expense import Expense, ExpenseShare
from app.models.user import User
from app.schemas.expense import CommentOut
from app.schemas.notification import CommentCreate
from app.services.notifications import notify

router = APIRouter(tags=["comments"])


async def _load_expense_or_404(session: AsyncSession, expense_id: str) -> Expense:
    expense = await session.get(Expense, expense_id)
    if not expense:
        raise HTTPException(404, detail={"errors": {"base": ["Invalid API Request: record not found"]}})
    return expense


@router.get("/get_comments")
async def get_comments(
    expense_id: str = Query(...),
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    expense = await _load_expense_or_404(session, expense_id)
    await ensure_expense_access(session, expense, user.id)
    result = await session.execute(
        select(Comment)
        .options(selectinload(Comment.user))
        .where(Comment.expense_id == expense_id, Comment.deleted_at.is_(None))
    )
    comments = result.scalars().all()
    return {"comments": [CommentOut.model_validate(c).model_dump() for c in comments]}


@router.post("/create_comment")
async def create_comment(
    payload: CommentCreate,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    expense = await _load_expense_or_404(session, payload.expense_id)
    await ensure_expense_access(session, expense, user.id)
    comment = Comment(
        expense_id=payload.expense_id,
        user_id=user.id,
        content=payload.content,
        comment_type="User",
        created_at=datetime.now(timezone.utc),
    )
    session.add(comment)
    await session.flush()

    participants = await session.execute(
        select(ExpenseShare.user_id).where(ExpenseShare.expense_id == payload.expense_id)
    )
    for (participant_id,) in participants.all():
        await notify(
            session,
            user_id=participant_id,
            type_=3,  # comment_added
            created_by_id=user.id,
            content=f"commented: {escape(payload.content)}",
            source_type="Expense",
            source_id=payload.expense_id,
        )

    await session.commit()
    await session.refresh(comment, attribute_names=["user"])
    return {"comment": CommentOut.model_validate(comment).model_dump()}


@router.post("/delete_comment/{comment_id}")
async def delete_comment(
    comment_id: str,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    result = await session.execute(
        select(Comment).options(selectinload(Comment.user)).where(Comment.id == comment_id)
    )
    comment = result.scalar_one_or_none()
    if not comment or comment.deleted_at is not None:
        raise HTTPException(404, detail={"errors": {"base": ["Invalid API Request: record not found"]}})

    if comment.user_id != user.id:
        expense = await _load_expense_or_404(session, comment.expense_id)
        if expense.group_id is None:
            raise HTTPException(403, detail={"errors": {"base": ["Only the comment's author can delete it"]}})
        group = await get_group_or_404(session, expense.group_id)
        ensure_group_owner(group, user.id)

    out = CommentOut.model_validate(comment).model_dump()
    comment.deleted_at = datetime.now(timezone.utc)
    await session.commit()
    return {"comment": out}
