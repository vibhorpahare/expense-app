"""Adds 5 friends to Wei Zhang's account plus a group with expenses split
among varying subsets (2-way, 3-way, 4-way, and all-6-way) so the account
has realistic sample data. Goes through real registration/expense-creation
code paths, same as seed_demo_data.py.

Run with: python -m app.seed.seed_wei_friends
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
WEI_EMAIL = "wei@example.com"

NEW_FRIENDS = [
    ("alex.kim@example.com", "Alex", "Kim"),
    ("maria.silva@example.com", "Maria", "Silva"),
    ("sam.patel@example.com", "Sam", "Patel"),
    ("liam.chen@example.com", "Liam", "Chen"),
    ("emma.brown@example.com", "Emma", "Brown"),
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


def equal_shares(user_ids: list[str], payer_id: str, cost: Decimal) -> list[ShareIn]:
    n = len(user_ids)
    base = (cost / n).quantize(Decimal("0.01"))
    shares = []
    running = Decimal("0.00")
    for i, uid in enumerate(user_ids):
        owed = base if i < n - 1 else (cost - running)
        running += owed
        shares.append(
            ShareIn(
                user_id=uid,
                paid_share=cost if uid == payer_id else Decimal("0.00"),
                owed_share=owed,
            )
        )
    return shares


async def main():
    async with async_session_maker() as session:
        wei_row = await session.execute(User.__table__.select().where(User.email == WEI_EMAIL))
        wei_row = wei_row.first()
        if not wei_row:
            print(f"{WEI_EMAIL} not found, aborting.")
            return
        wei = wei_row.id

        friends = {}
        for email, first, last in NEW_FRIENDS:
            friends[email] = await get_or_create_user(session, email, first, last)
        await session.commit()

        alex, maria, sam, liam, emma = (friends[e].id for e, _, _ in NEW_FRIENDS)

        for fid in (alex, maria, sam, liam, emma):
            await ensure_friendship(session, wei, fid)
        await session.commit()

        squad = await ensure_group(
            session, "Wei's Squad", "trip", wei, [wei, alex, maria, sam, liam, emma]
        )
        await session.commit()

        existing = await session.execute(
            Expense.__table__.select().where(Expense.group_id == squad.id)
        )
        if existing.first():
            print("Wei's Squad expenses already seeded, skipping.")
            return

        now = datetime.now(timezone.utc)

        # 2-way: Wei + Alex
        await create_expense(
            session,
            ExpenseCreate(
                description="Pizza night",
                cost=Decimal("400.00"),
                currency_code="INR",
                group_id=squad.id,
                shares=equal_shares([wei, alex], payer_id=wei, cost=Decimal("400.00")),
                date=now - timedelta(days=6),
            ),
            created_by_id=wei,
        )

        # 3-way: Wei + Maria + Sam, paid by Maria
        await create_expense(
            session,
            ExpenseCreate(
                description="Cab ride",
                cost=Decimal("300.00"),
                currency_code="INR",
                group_id=squad.id,
                shares=equal_shares([wei, maria, sam], payer_id=maria, cost=Decimal("300.00")),
                date=now - timedelta(days=5),
            ),
            created_by_id=maria,
        )

        # 4-way: Wei + Alex + Sam + Liam, paid by Liam
        await create_expense(
            session,
            ExpenseCreate(
                description="Movie outing",
                cost=Decimal("560.00"),
                currency_code="INR",
                group_id=squad.id,
                shares=equal_shares([wei, alex, sam, liam], payer_id=liam, cost=Decimal("560.00")),
                date=now - timedelta(days=3),
            ),
            created_by_id=liam,
        )

        # All 6 group members
        await create_expense(
            session,
            ExpenseCreate(
                description="Group dinner",
                cost=Decimal("1200.00"),
                currency_code="INR",
                group_id=squad.id,
                split_equally=True,
                date=now - timedelta(days=1),
            ),
            created_by_id=wei,
        )

        # Non-group direct expense: Wei + Emma
        await create_expense(
            session,
            ExpenseCreate(
                description="Birthday gift",
                cost=Decimal("150.00"),
                currency_code="INR",
                shares=[
                    ShareIn(user_id=wei, paid_share=Decimal("150.00"), owed_share=Decimal("75.00")),
                    ShareIn(user_id=emma, paid_share=Decimal("0.00"), owed_share=Decimal("75.00")),
                ],
                date=now,
            ),
            created_by_id=wei,
        )

    print("Wei's friends + sample group expenses seeded.")
    print("New friend logins:", ", ".join(e for e, _, _ in NEW_FRIENDS), f"(password: {PASSWORD})")


if __name__ == "__main__":
    asyncio.run(main())
