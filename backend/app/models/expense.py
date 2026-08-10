from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, gen_uuid
from app.models.user import User  # noqa: F401  (needed for relationship resolution)


class Expense(TimestampMixin, Base):
    __tablename__ = "expenses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    group_id: Mapped[str | None] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), nullable=True)
    description: Mapped[str] = mapped_column(String(255))
    details: Mapped[str | None] = mapped_column(String(8000), nullable=True)
    cost: Mapped[str] = mapped_column(Numeric(12, 2))
    currency_code: Mapped[str] = mapped_column(String(10), default="INR")
    category_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id"), nullable=True)
    date: Mapped[str] = mapped_column(String(40))  # ISO 8601, matches API's date-time string
    email_reminder: Mapped[bool] = mapped_column(Boolean, default=False)
    email_reminder_in_advance: Mapped[int | None] = mapped_column(Integer, nullable=True)
    payment: Mapped[bool] = mapped_column(Boolean, default=False)
    transaction_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    receipt_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_by_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    updated_by_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    deleted_by_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    shares: Mapped[list["ExpenseShare"]] = relationship(back_populates="expense", cascade="all, delete-orphan")
    comments: Mapped[list["Comment"]] = relationship(back_populates="expense", cascade="all, delete-orphan")


class ExpenseShare(Base):
    __tablename__ = "expense_shares"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    expense_id: Mapped[str] = mapped_column(ForeignKey("expenses.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    paid_share: Mapped[str] = mapped_column(Numeric(12, 2), default=0)
    owed_share: Mapped[str] = mapped_column(Numeric(12, 2), default=0)

    expense: Mapped["Expense"] = relationship(back_populates="shares")
    user: Mapped["User"] = relationship()

    @property
    def net_balance(self):
        return self.paid_share - self.owed_share
