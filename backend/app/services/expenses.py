from datetime import datetime, timezone
from decimal import ROUND_DOWN, Decimal
from html import escape

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.expense import Expense, ExpenseShare
from app.models.group import GroupMember
from app.schemas.expense import ExpenseCreate, SettleDebtCreate, SettleUpCreate
from app.services.notifications import notify


async def build_shares(
    session: AsyncSession, payload: ExpenseCreate, payer_id: str
) -> list[ExpenseShare]:
    if payload.shares:
        return [
            ExpenseShare(user_id=s.user_id, paid_share=s.paid_share, owed_share=s.owed_share)
            for s in payload.shares
        ]

    # Equal split among all current group members; payer covers the full cost.
    result = await session.execute(
        select(GroupMember.user_id).where(GroupMember.group_id == payload.group_id)
    )
    member_ids = [row[0] for row in result.all()]
    if payer_id not in member_ids:
        member_ids.append(payer_id)

    n = len(member_ids)
    cents = (payload.cost * 100).to_integral_value(rounding=ROUND_DOWN)
    base_cents = cents // n
    remainder = int(cents - base_cents * n)

    shares = []
    for i, uid in enumerate(member_ids):
        owed_cents = base_cents + (1 if i < remainder else 0)
        owed = (Decimal(owed_cents) / 100).quantize(Decimal("0.01"))
        paid = payload.cost if uid == payer_id else Decimal("0.00")
        shares.append(ExpenseShare(user_id=uid, paid_share=paid, owed_share=owed))
    return shares


async def create_expense(session: AsyncSession, payload: ExpenseCreate, created_by_id: str) -> Expense:
    shares = await build_shares(session, payload, payer_id=created_by_id)
    expense_date = payload.date or datetime.now(timezone.utc)

    expense = Expense(
        group_id=payload.group_id,
        description=payload.description,
        details=payload.details,
        cost=payload.cost,
        currency_code=payload.currency_code,
        category_id=payload.category_id,
        date=expense_date.isoformat(),
        created_by_id=created_by_id,
        shares=shares,
    )
    session.add(expense)
    await session.flush()

    for share in shares:
        await notify(
            session,
            user_id=share.user_id,
            type_=0,  # expense_added
            created_by_id=created_by_id,
            content=f"added <strong>{escape(expense.description)}</strong> (₹{expense.cost})",
            source_type="Expense",
            source_id=expense.id,
        )

    await session.commit()
    await session.refresh(expense)
    return expense


async def settle_up(session: AsyncSession, payload: SettleUpCreate, current_user_id: str) -> Expense:
    """Record a payment between the current user and payload.other_user_id.

    Whichever side is the one handing over cash gets paid_share=amount,
    owed_share=0 (net +amount); the other side gets owed_share=amount (net
    -amount). Balances are additive across expenses, so this exactly cancels
    an existing debt of the same size without touching the original expense(s).
    """
    if payload.direction == "i_paid":
        giver_id, receiver_id = current_user_id, payload.other_user_id
    else:
        giver_id, receiver_id = payload.other_user_id, current_user_id

    expense = Expense(
        group_id=payload.group_id,
        description="Payment",
        cost=payload.amount,
        currency_code=payload.currency_code,
        date=datetime.now(timezone.utc).isoformat(),
        payment=True,
        transaction_confirmed=True,
        created_by_id=current_user_id,
        shares=[
            ExpenseShare(user_id=giver_id, paid_share=payload.amount, owed_share=Decimal("0.00")),
            ExpenseShare(user_id=receiver_id, paid_share=Decimal("0.00"), owed_share=payload.amount),
        ],
    )
    session.add(expense)
    await session.flush()

    await notify(
        session,
        user_id=payload.other_user_id,
        type_=16,  # payment_recorded
        created_by_id=current_user_id,
        content=f"recorded a payment of ₹{expense.cost}",
        source_type="Expense",
        source_id=expense.id,
    )

    await session.commit()
    await session.refresh(expense)
    return expense


async def settle_debt(session: AsyncSession, group_id: str, payload: SettleDebtCreate, actor_id: str) -> Expense:
    """Records a payment along an arbitrary edge of a group's debt graph (see
    SettleDebtCreate) -- e.g. acting on a "simplify debts" suggestion between two
    other members. Like settle_up, this only ever adds a new payment expense; it
    never touches the original expenses, so turning simplify off/on later always
    recomputes cleanly from the full, unmodified ledger.
    """
    expense = Expense(
        group_id=group_id,
        description="Payment",
        cost=payload.amount,
        currency_code=payload.currency_code,
        date=datetime.now(timezone.utc).isoformat(),
        payment=True,
        transaction_confirmed=True,
        created_by_id=actor_id,
        shares=[
            ExpenseShare(user_id=payload.from_user_id, paid_share=payload.amount, owed_share=Decimal("0.00")),
            ExpenseShare(user_id=payload.to_user_id, paid_share=Decimal("0.00"), owed_share=payload.amount),
        ],
    )
    session.add(expense)
    await session.flush()

    for uid in (payload.from_user_id, payload.to_user_id):
        await notify(
            session,
            user_id=uid,
            type_=16,  # payment_recorded
            created_by_id=actor_id,
            content=f"recorded a payment of ₹{expense.cost}",
            source_type="Expense",
            source_id=expense.id,
        )

    await session.commit()
    await session.refresh(expense)
    return expense
