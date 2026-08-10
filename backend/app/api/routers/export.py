import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import ensure_group_member
from app.core.users import current_active_user
from app.db.session import get_async_session
from app.models.category import Category
from app.models.expense import Expense, ExpenseShare
from app.models.user import User

router = APIRouter(tags=["export"])


@router.get("/export/expenses.csv")
async def export_expenses_csv(
    group_id: str | None = None,
    friend_id: str | None = None,
    category_id: int | None = None,
    payer_id: str | None = None,
    dated_after: datetime | None = None,
    dated_before: datetime | None = None,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    """Same filters as GET /get_expenses, same access rule -- CSV of everything
    that matches instead of a paginated JSON page.
    """
    query = (
        select(Expense)
        .options(selectinload(Expense.shares).selectinload(ExpenseShare.user))
        .where(Expense.deleted_at.is_(None))
    )
    if group_id is not None:
        await ensure_group_member(session, group_id, user.id)
        query = query.where(Expense.group_id == group_id)
    else:
        query = query.join(ExpenseShare).where(ExpenseShare.user_id == user.id)
        if friend_id is not None:
            friend_expense_ids = select(ExpenseShare.expense_id).where(ExpenseShare.user_id == friend_id)
            query = query.where(Expense.id.in_(friend_expense_ids))

    if category_id is not None:
        query = query.where(Expense.category_id == category_id)
    if payer_id is not None:
        payer_expense_ids = select(ExpenseShare.expense_id).where(
            ExpenseShare.user_id == payer_id, ExpenseShare.paid_share > 0
        )
        query = query.where(Expense.id.in_(payer_expense_ids))
    if dated_after is not None:
        query = query.where(Expense.date >= dated_after.isoformat())
    if dated_before is not None:
        query = query.where(Expense.date <= dated_before.isoformat())

    query = query.order_by(Expense.date.desc())
    expenses = (await session.execute(query)).scalars().unique().all()

    category_names: dict[int, str] = {}
    category_ids = {e.category_id for e in expenses if e.category_id is not None}
    if category_ids:
        rows = (await session.execute(select(Category).where(Category.id.in_(category_ids)))).scalars()
        category_names = {c.id: c.name for c in rows}

    buffer = io.StringIO()
    buffer.write("﻿")  # BOM so Excel opens this as UTF-8 rather than guessing a legacy codepage
    writer = csv.writer(buffer)
    writer.writerow(["Date", "Description", "Category", "Currency", "Cost", "Type", "Shares (name: paid / owed)"])
    for e in expenses:
        shares_str = "; ".join(
            f"{s.user.first_name}: {s.paid_share} / {s.owed_share}" for s in e.shares
        )
        writer.writerow(
            [
                e.date[:10],
                e.description,
                category_names.get(e.category_id, "") if e.category_id else "",
                e.currency_code,
                str(e.cost),
                "Payment" if e.payment else "Expense",
                shares_str,
            ]
        )

    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="expenses.csv"'},
    )
