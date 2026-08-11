"""Extra demo data on top of seed_demo_data.py: more groups, more friends, and
expenses spread across the last 6 months (with real categories) so the mobile
app's Dashboard/Insights charts have something to show instead of one flat
bar. Targets priya@example.com since that's the account used to test the
mobile app. Idempotent the same way seed_demo_data.py is (skips if already run).

Run with: python -m app.seed.seed_mobile_extra_data
"""
import asyncio
import random
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

EXTRA_USERS = [
    ("karan@example.com", "Karan", "Mehta"),
    ("sara@example.com", "Sara", "Iyer"),
]

# category_id -> label, pulled from GET /get_categories on this seeded DB.
CAT_DINING = 13
CAT_GROCERIES = 12
CAT_ENTERTAINMENT_MOVIES = 21
CAT_TRANSPORT_TAXI = 36
CAT_TRANSPORT_PLANE = 35
CAT_UTILITIES_ELECTRICITY = 5
CAT_HOME_MAINTENANCE = 17

password_helper = PasswordHelper()


async def get_or_create_user(session, email: str, first: str, last: str) -> User:
    result = await session.execute(User.__table__.select().where(User.email == email))
    row = result.first()
    if row:
        return await session.get(User, row.id)

    user_db = SQLAlchemyUserDatabase(session, User)
    return await user_db.create(
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
        existing_priya = await session.execute(User.__table__.select().where(User.email == "priya@example.com"))
        priya_row = existing_priya.first()
        if not priya_row:
            print("Run seed_demo_data first -- priya@example.com doesn't exist yet.")
            return
        priya = priya_row.id

        rahul_row = (await session.execute(User.__table__.select().where(User.email == "rahul@example.com"))).first()
        ana_row = (await session.execute(User.__table__.select().where(User.email == "ana@example.com"))).first()
        wei_row = (await session.execute(User.__table__.select().where(User.email == "wei@example.com"))).first()
        rahul, ana, wei = rahul_row.id, ana_row.id, wei_row.id

        users = {}
        for email, first, last in EXTRA_USERS:
            users[email] = await get_or_create_user(session, email, first, last)
        await session.commit()
        karan, sara = (users[e].id for e, _, _ in EXTRA_USERS)

        for a, b in [(priya, karan), (priya, sara), (rahul, karan), (ana, sara)]:
            await ensure_friendship(session, a, b)
        await session.commit()

        apartment = await ensure_group(session, "Apartment 4B", "apartment", priya, [priya, rahul, wei])
        office = await ensure_group(session, "Office Lunch Club", "other", priya, [priya, ana, karan])
        europe = await ensure_group(session, "Europe Trip", "trip", priya, [priya, sara, karan])
        await session.commit()

        new_group_ids = [apartment.id, office.id, europe.id]
        existing = await session.execute(Expense.__table__.select().where(Expense.group_id.in_(new_group_ids)))
        if existing.first():
            print("Extra demo expenses already seeded, skipping.")
            print("Login with priya@example.com / karan@example.com / sara@example.com (password: password123)")
            return

        now = datetime.now(timezone.utc)
        rng = random.Random(42)

        # Spread expenses across the last 6 months so Dashboard's monthly bar
        # chart and Insights' area chart have real month-over-month variation.
        apartment_expenses = [
            ("Electricity bill", 55.00, CAT_UTILITIES_ELECTRICITY, priya, True),
            ("Groceries run", 68.30, CAT_GROCERIES, rahul, True),
            ("Plumber visit", 120.00, CAT_HOME_MAINTENANCE, wei, True),
            ("Groceries run", 74.50, CAT_GROCERIES, priya, True),
            ("Internet bill", 40.00, CAT_UTILITIES_ELECTRICITY, rahul, True),
            ("Groceries run", 61.20, CAT_GROCERIES, wei, True),
            ("Electricity bill", 58.75, CAT_UTILITIES_ELECTRICITY, priya, True),
        ]
        office_expenses = [
            ("Team lunch", 42.00, CAT_DINING, priya, True),
            ("Coffee run", 15.50, CAT_DINING, karan, True),
            ("Birthday cake", 22.00, CAT_DINING, ana, True),
            ("Team lunch", 48.00, CAT_DINING, ana, True),
            ("Movie night", 36.00, CAT_ENTERTAINMENT_MOVIES, karan, True),
        ]
        europe_expenses = [
            ("Flight tickets", 420.00, CAT_TRANSPORT_PLANE, priya, True),
            ("Airport taxi", 32.00, CAT_TRANSPORT_TAXI, sara, True),
            ("Museum tickets", 28.00, CAT_ENTERTAINMENT_MOVIES, karan, True),
            ("Dinner out", 95.00, CAT_DINING, priya, True),
        ]

        async def seed_group_expenses(group_id, entries, spread_days):
            for i, (desc, cost, cat, payer, equal) in enumerate(entries):
                days_ago = spread_days[i % len(spread_days)] + rng.randint(0, 3)
                await create_expense(
                    session,
                    ExpenseCreate(
                        description=desc,
                        cost=Decimal(str(cost)),
                        currency_code="INR",
                        category_id=cat,
                        group_id=group_id,
                        split_equally=equal,
                        date=now - timedelta(days=days_ago),
                    ),
                    created_by_id=payer,
                )

        # Roughly one expense per month going back ~6 months, per group.
        spread = [175, 145, 115, 85, 55, 25, 8]
        await seed_group_expenses(apartment.id, apartment_expenses, spread)
        await seed_group_expenses(office.id, office_expenses, spread)
        await seed_group_expenses(europe.id, europe_expenses, spread)

        # A couple of non-group direct expenses between priya and her new friends.
        await create_expense(
            session,
            ExpenseCreate(
                description="Concert tickets",
                cost=Decimal("60.00"),
                currency_code="INR",
                category_id=CAT_ENTERTAINMENT_MOVIES,
                shares=[
                    ShareIn(user_id=priya, paid_share=Decimal("60.00"), owed_share=Decimal("30.00")),
                    ShareIn(user_id=sara, paid_share=Decimal("0.00"), owed_share=Decimal("30.00")),
                ],
                date=now - timedelta(days=6),
            ),
            created_by_id=priya,
        )
        await create_expense(
            session,
            ExpenseCreate(
                description="Cab share to airport",
                cost=Decimal("18.00"),
                currency_code="INR",
                category_id=CAT_TRANSPORT_TAXI,
                shares=[
                    ShareIn(user_id=karan, paid_share=Decimal("18.00"), owed_share=Decimal("9.00")),
                    ShareIn(user_id=priya, paid_share=Decimal("0.00"), owed_share=Decimal("9.00")),
                ],
                date=now - timedelta(days=30),
            ),
            created_by_id=karan,
        )

    print("Extra demo data seeded: 3 more groups (Apartment 4B, Office Lunch Club, Europe Trip), 2 more friends.")
    print("Login with priya@example.com / karan@example.com / sara@example.com (password: password123)")


if __name__ == "__main__":
    asyncio.run(main())
