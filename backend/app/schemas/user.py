from fastapi_users import schemas
from pydantic import BaseModel


class UserRead(schemas.BaseUser[str]):
    first_name: str
    last_name: str | None = None
    locale: str
    phone_number: str | None = None
    avatar_url: str | None = None
    custom_picture: bool
    notification_settings: dict


class UserCreate(schemas.BaseUserCreate):
    first_name: str
    last_name: str | None = None
    locale: str = "en"


class UserUpdate(schemas.BaseUserUpdate):
    first_name: str | None = None
    last_name: str | None = None
    locale: str | None = None
    phone_number: str | None = None
    notification_settings: dict | None = None


class PublicUser(BaseModel):
    id: str
    first_name: str
    last_name: str | None = None
    email: str
    avatar_url: str | None = None

    class Config:
        from_attributes = True
