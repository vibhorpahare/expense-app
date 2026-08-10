from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, gen_uuid

# Matches Splitwise's notification `type` codes (see get_notifications docs).
NOTIFICATION_TYPES = {
    0: "expense_added",
    1: "expense_updated",
    2: "expense_deleted",
    3: "comment_added",
    4: "added_to_group",
    5: "removed_from_group",
    6: "group_deleted",
    7: "group_settings_changed",
    8: "added_as_friend",
    9: "removed_as_friend",
    10: "news",
    11: "debt_simplification",
    12: "group_undeleted",
    13: "expense_undeleted",
    14: "group_currency_conversion",
    15: "friend_currency_conversion",
    16: "payment_recorded",
}


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    type: Mapped[int] = mapped_column(Integer)
    created_by_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    source_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    source_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    image_shape: Mapped[str] = mapped_column(String(10), default="square")
    content: Mapped[str] = mapped_column(String(2000))
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
