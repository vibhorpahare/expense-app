from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification


async def notify(
    session: AsyncSession,
    *,
    user_id: str,
    type_: int,
    content: str,
    created_by_id: str | None = None,
    source_type: str | None = None,
    source_id: str | None = None,
) -> None:
    """Fire-and-forget notification row. Caller is responsible for commit()."""
    if user_id == created_by_id:
        return  # Splitwise doesn't notify you about your own actions
    session.add(
        Notification(
            user_id=user_id,
            type=type_,
            created_by_id=created_by_id,
            content=content,
            source_type=source_type,
            source_id=source_id,
        )
    )
