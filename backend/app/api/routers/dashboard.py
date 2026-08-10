from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.users import current_active_user
from app.db.session import get_async_session
from app.models.user import User
from app.services.balances import dashboard_summary

router = APIRouter(tags=["other"])


@router.get("/get_dashboard")
async def get_dashboard(
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    return await dashboard_summary(session, user.id)
