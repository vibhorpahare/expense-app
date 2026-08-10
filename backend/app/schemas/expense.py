from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, model_validator

from app.schemas.user import PublicUser


class ShareIn(BaseModel):
    user_id: str
    paid_share: Decimal
    owed_share: Decimal


class ExpenseCreate(BaseModel):
    description: str
    details: str | None = None
    cost: Decimal
    currency_code: str = "INR"  # app is India/INR-only -- kept as a column, not user-selectable
    category_id: int | None = None
    date: datetime | None = None
    group_id: str | None = None

    # Either split_equally=True with group_id (payer = current user), or shares.
    split_equally: bool = False
    shares: list[ShareIn] | None = None

    @model_validator(mode="after")
    def check_split(self):
        if not self.split_equally and not self.shares:
            raise ValueError("Provide either split_equally=true (with group_id) or an explicit shares list")
        if self.split_equally and not self.group_id:
            raise ValueError("split_equally requires group_id")
        if self.shares:
            paid = sum(s.paid_share for s in self.shares)
            owed = sum(s.owed_share for s in self.shares)
            if paid != self.cost or owed != self.cost:
                raise ValueError(
                    f"shares must sum to cost: paid={paid} owed={owed} cost={self.cost}"
                )
        return self


class SettleUpCreate(BaseModel):
    other_user_id: str
    amount: Decimal
    currency_code: str = "INR"
    group_id: str | None = None
    # "i_paid": current user gives other_user_id money (reduces what current user owes).
    # "they_paid": other_user_id gives current user money (reduces what other_user_id owes).
    direction: str = "i_paid"


class SettleDebtCreate(BaseModel):
    """Records a payment along an arbitrary edge of a group's debt graph -- unlike
    SettleUpCreate, neither side has to be the acting user (e.g. settling a
    simplified-debt suggestion between two other group members)."""

    from_user_id: str
    to_user_id: str
    amount: Decimal
    currency_code: str = "INR"


class ExpenseUpdate(BaseModel):
    description: str | None = None
    details: str | None = None
    cost: Decimal | None = None
    currency_code: str | None = None
    category_id: int | None = None
    date: datetime | None = None
    shares: list[ShareIn] | None = None

    @model_validator(mode="after")
    def check_split(self):
        if self.shares is not None:
            if self.cost is None:
                raise ValueError("cost is required when updating shares (needed to validate they sum to it)")
            paid = sum(s.paid_share for s in self.shares)
            owed = sum(s.owed_share for s in self.shares)
            if paid != self.cost or owed != self.cost:
                raise ValueError(
                    f"shares must sum to cost: paid={paid} owed={owed} cost={self.cost}"
                )
        return self


class ShareOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user: PublicUser
    paid_share: Decimal
    owed_share: Decimal
    net_balance: Decimal


class CommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    content: str
    comment_type: str
    created_at: datetime
    user: PublicUser | None = None


class ExpenseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    group_id: str | None
    description: str
    details: str | None
    cost: Decimal
    currency_code: str
    category_id: int | None
    date: datetime
    payment: bool
    receipt_url: str | None
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None
    shares: list[ShareOut] = []
    comments: list[CommentOut] = []
