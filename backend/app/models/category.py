from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, backref, mapped_column, relationship

from app.db.base import Base


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    name: Mapped[str] = mapped_column(String(100))
    icon_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id"), nullable=True)

    subcategories: Mapped[list["Category"]] = relationship(
        "Category", backref=backref("parent", remote_side=[id])
    )
