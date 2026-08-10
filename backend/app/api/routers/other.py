from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_async_session
from app.models.category import Category
from app.schemas.category import CategoryOut

router = APIRouter(tags=["other"])


@router.get("/get_categories")
async def get_categories(session: AsyncSession = Depends(get_async_session)):
    result = await session.execute(
        select(Category)
        .where(Category.parent_id.is_(None))
        .options(selectinload(Category.subcategories).selectinload(Category.subcategories))
    )
    categories = result.scalars().all()
    return {"categories": [CategoryOut.model_validate(c).model_dump() for c in categories]}
