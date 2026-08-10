from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    type: int
    content: str
    image_url: str | None
    image_shape: str
    source_type: str | None
    source_id: str | None
    created_at: datetime


class CommentCreate(BaseModel):
    expense_id: str
    content: str
