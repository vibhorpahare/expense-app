"""Demo data: a handful of users, friendships, groups, and expenses so the app
isn't empty on first look. Goes through the real registration/expense-creation
code paths (UserManager, create_expense) rather than raw INSERTs, so passwords
hash correctly and shares/notifications come out consistent with normal usage.

Run with: python -m app.seed.seed_demo_data
"""
import asyncio
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from app.db.session import async_session_maker
from app.models.expense import Expense
from app.models.friendship import Friendship
from app.models.group import Group, GroupMember
from app.models.user import User
from app.schemas.expense import ExpenseCreate, ShareIn
from app.services.expenses import create_expense
from fastapi_users.db import SQLAlchemyUserDatabase
from fastapi_users.password import PasswordHelper

PASSWORD = "password123"

DEMO_USERS = [
    ("priya@example.com", "Priya", "Sharma"),
    ("rahul@example.com", "Rahul", "Verma"),
    ("ana@example.com", "Ana", "Costa"),
    ("wei@example.com", "Wei", "Zhang"),
]

password_helper = PasswordHelper()


async def get_or_create_user(session, email: str, first: str, last: str) -> User:
    result = await session.execute(User.__table__.select().where(User.email == email))
    row = result.first()
    if row:
        return await session.get(User, row.id)

    user_db = SQLAlchemyUserDatabase(session, User)
    user = await user_db.create(
        {
            "email": email,
            "hashed_password": password_helper.hash(PASSWORD),
            "first_name": first,
            "last_name": last,
            "is_active": True,
            "is_verified": True,
            "notification_settings": {
                "added_as_friend": True,
                "added_to_group": True,
                "expense_added": True,
                "expense_updated": True,
                "comment_added": True,
                "news": False,
            },
        }
    )
    return user


async def ensure_friendship(session, a: str, b: str):
    lo, hi = sorted((a, b))
    existing = await session.get(Friendship, {"user_id": lo, "friend_id": hi})
    if not existing:
        session.add(Friendship(user_id=lo, friend_id=hi))


async def ensure_group(session, name: str, group_type: str, owner_id: str, member_ids: list[str]) -> Group:
    result = await session.execute(
        Group.__table__.select().where(Group.name == name, Group.created_by_id == owner_id)
    )
    row = result.first()
    if row:
        return await session.get(Group, row.id)

    group = Group(name=name, group_type=group_type, created_by_id=owner_id)
    session.add(group)
    await session.flush()
    for uid in member_ids:
        session.add(GroupMember(group_id=group.id, user_id=uid))
    return group


async def main():
    async with async_session_maker() as session:
        users = {}
        for email, first, last in DEMO_USERS:
            users[email] = await get_or_create_user(session, email, first, last)
        await session.commit()

        priya, rahul, ana, wei = (users[e].id for e, _, _ in DEMO_USERS)

        for a, b in [(priya, rahul), (priya, ana), (rahul, ana), (rahul, wei)]:
            await ensure_friendship(session, a, b)
        await session.commit()

        trip = await ensure_group(session, "Goa Trip", "trip", priya, [priya, rahul, ana])
        flat = await ensure_group(session, "Flatmates", "home", rahul, [rahul, wei])
        await session.commit()

        now = datetime.now(timezone.utc)

        existing = await session.execute(
            Expense.__table__.select().where(Expense.group_id.in_([trip.id, flat.id]))
        )
        if existing.first():
            print("Demo expenses already seeded, skipping.")
            return

        # Goa Trip: equal-split expenses paid by different people.
        await create_expense(
            session,
            ExpenseCreate(
                description="Hotel booking",
                cost=Decimal("300.00"),
                currency_code="INR",
                group_id=trip.id,
                split_equally=True,
                date=now - timedelta(days=5),
            ),
            created_by_id=priya,
        )
        await create_expense(
            session,
            ExpenseCreate(
                description="Scooter rental",
                cost=Decimal("45.00"),
                currency_code="INR",
                group_id=trip.id,
                split_equally=True,
                date=now - timedelta(days=4),
            ),
            created_by_id=rahul,
        )
        # Uneven by-shares expense: Ana treats, Priya doesn't eat shellfish so pays less.
        await create_expense(
            session,
            ExpenseCreate(
                description="Seafood dinner",
                cost=Decimal("90.00"),
                currency_code="INR",
                group_id=trip.id,
                shares=[
                    ShareIn(user_id=ana, paid_share=Decimal("90.00"), owed_share=Decimal("40.00")),
                    ShareIn(user_id=rahul, paid_share=Decimal("0.00"), owed_share=Decimal("35.00")),
                    ShareIn(user_id=priya, paid_share=Decimal("0.00"), owed_share=Decimal("15.00")),
                ],
                date=now - timedelta(days=4),
            ),
            created_by_id=ana,
        )

        # Flatmates: recurring-feel utility bills.
        await create_expense(
            session,
            ExpenseCreate(
                description="Electricity bill",
                cost=Decimal("60.00"),
                currency_code="INR",
                group_id=flat.id,
                split_equally=True,
                date=now - timedelta(days=10),
            ),
            created_by_id=wei,
        )
        await create_expense(
            session,
            ExpenseCreate(
                description="Groceries",
                cost=Decimal("82.40"),
                currency_code="INR",
                group_id=flat.id,
                split_equally=True,
                date=now - timedelta(days=2),
            ),
            created_by_id=rahul,
        )

        # Non-group, direct friend expense (group_id omitted -> requires explicit shares).
        await create_expense(
            session,
            ExpenseCreate(
                description="Movie tickets",
                cost=Decimal("24.00"),
                currency_code="INR",
                shares=[
                    ShareIn(user_id=priya, paid_share=Decimal("24.00"), owed_share=Decimal("12.00")),
                    ShareIn(user_id=ana, paid_share=Decimal("0.00"), owed_share=Decimal("12.00")),
                ],
                date=now - timedelta(days=1),
            ),
            created_by_id=priya,
        )

    print("Demo data seeded.")
    print("Login with any of:", ", ".join(u for u, _, _ in DEMO_USERS), f"(password: {PASSWORD})")


if __name__ == "__main__":
    asyncio.run(main())
