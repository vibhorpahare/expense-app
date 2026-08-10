from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.user import PublicUser


class BalanceOut(BaseModel):
    currency_code: str
    amount: str


class GroupMemberOut(PublicUser):
    balance: list[BalanceOut] = []


class GroupCreate(BaseModel):
    name: str
    group_type: str = "other"
    simplify_by_default: bool = False
    # Emails of existing users to invite; Splitwise's flattened users__N__ format
    # is collapsed into a plain list here since this is our own API.
    member_emails: list[str] = []


class GroupUpdate(BaseModel):
    name: str | None = None
    group_type: str | None = None
    simplify_by_default: bool | None = None


class GroupOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    group_type: str
    simplify_by_default: bool
    avatar_url: str | None
    archived_at: datetime | None = None
    created_by_id: str
    updated_at: datetime
    members: list[GroupMemberOut] = []
