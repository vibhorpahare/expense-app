from fastapi_users.db import SQLAlchemyBaseUserTable
from sqlalchemy import JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, gen_uuid


class User(SQLAlchemyBaseUserTable[str], TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    locale: Mapped[str] = mapped_column(String(10), default="en")
    phone_number: Mapped[str | None] = mapped_column(String(30), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    custom_picture: Mapped[bool] = mapped_column(default=False)
    notification_settings: Mapped[dict] = mapped_column(JSON, default=dict)
    notifications_read_at: Mapped[str | None] = mapped_column(String(30), nullable=True)
