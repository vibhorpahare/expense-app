"""Seed categories from Splitwise's live public API response (docs/seed/categories.json
at the repo root, copied here at build time). That endpoint requires no auth (see
openapi.json `security: []` on get_categories), so the data is pulled verbatim
rather than reinvented. The app is India/INR-only, so there's no currency table to seed.

Run with: python -m app.seed.seed_categories_currencies
"""
import asyncio
import json
from pathlib import Path

from app.db.session import async_session_maker
from app.models.category import Category

SEED_DIR = Path(__file__).parent


async def seed_categories(session):
    data = json.loads((SEED_DIR / "categories.json").read_text())
    for parent in data["categories"]:
        existing = await session.get(Category, parent["id"])
        if not existing:
            session.add(Category(id=parent["id"], name=parent["name"], icon_url=parent.get("icon"), parent_id=None))
    await session.flush()

    for parent in data["categories"]:
        for sub in parent.get("subcategories", []):
            existing = await session.get(Category, sub["id"])
            if not existing:
                session.add(
                    Category(id=sub["id"], name=sub["name"], icon_url=sub.get("icon"), parent_id=parent["id"])
                )


async def main():
    async with async_session_maker() as session:
        await seed_categories(session)
        await session.commit()
    print("Seed complete.")


if __name__ == "__main__":
    asyncio.run(main())
