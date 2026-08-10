from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.users import current_active_user
from app.db.session import get_async_session
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationOut

router = APIRouter(tags=["notifications"])


@router.get("/get_notifications")
async def get_notifications(
    updated_after: datetime | None = None,
    limit: int = Query(0),
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    query = select(Notification).where(Notification.user_id == user.id).order_by(Notification.created_at.desc())
    if updated_after is not None:
        query = query.where(Notification.created_at > updated_after)
    if limit:
        query = query.limit(limit)
    result = await session.execute(query)
    notifications = result.scalars().all()

    unread_count_query = select(func.count()).select_from(Notification).where(Notification.user_id == user.id)
    if user.notifications_read_at:
        unread_count_query = unread_count_query.where(
            Notification.created_at > datetime.fromisoformat(user.notifications_read_at)
        )
    unread_count = (await session.execute(unread_count_query)).scalar_one()

    return {
        "notifications": [NotificationOut.model_validate(n).model_dump() for n in notifications],
        "unread_count": unread_count,
    }


@router.post("/notifications/mark_read")
async def mark_notifications_read(
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    # timespec="seconds" keeps this under the column's 30-char limit (full
    # microsecond isoformat is 32 chars and overflows String(30)).
    user.notifications_read_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    await session.commit()
    return {"success": True}
