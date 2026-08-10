from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Friendship(Base):
    """One row per pair, stored with user_id < friend_id lexicographically.

    Splitwise has no request/accept flow on this endpoint set (create_friend adds
    directly), so friendship is symmetric and unconditional once created.
    """

    __tablename__ = "friendships"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), primary_key=True)
    friend_id: Mapped[str] = mapped_column(ForeignKey("users.id"), primary_key=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
