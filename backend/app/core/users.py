from typing import AsyncGenerator

from fastapi import Depends
from fastapi_users import BaseUserManager, FastAPIUsers
from fastapi_users.authentication import AuthenticationBackend, BearerTransport, JWTStrategy
from fastapi_users.db import SQLAlchemyUserDatabase
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_async_session
from app.models.user import User
from app.services.email import send_email


async def get_user_db(session: AsyncSession = Depends(get_async_session)) -> AsyncGenerator:
    yield SQLAlchemyUserDatabase(session, User)


class UserManager(BaseUserManager[User, str]):
    reset_password_token_secret = settings.jwt_secret
    verification_token_secret = settings.jwt_secret

    def parse_id(self, value: str) -> str:
        return value

    async def on_after_register(self, user: User, request=None):
        # New users start with Splitwise's default notification set enabled.
        # Must go through user_db.update (not a bare attribute set) so it's
        # actually persisted -- this hook runs after the initial insert already committed.
        await self.user_db.update(
            user,
            {
                "notification_settings": {
                    "added_as_friend": True,
                    "added_to_group": True,
                    "expense_added": True,
                    "expense_updated": True,
                    "comment_added": True,
                    "news": False,
                }
            },
        )

    async def on_after_forgot_password(self, user: User, token: str, request=None):
        reset_url = f"{settings.frontend_base_url}/reset-password?token={token}"
        await send_email(
            user.email,
            "Reset your Splitly password",
            f"Click to reset your password: {reset_url}\n\nIf you didn't request this, ignore this email.",
        )

    async def on_after_request_verify(self, user: User, token: str, request=None):
        verify_url = f"{settings.frontend_base_url}/verify?token={token}"
        await send_email(
            user.email,
            "Verify your Splitly email",
            f"Click to verify your email: {verify_url}",
        )


async def get_user_manager(user_db=Depends(get_user_db)) -> AsyncGenerator:
    yield UserManager(user_db)


bearer_transport = BearerTransport(tokenUrl="auth/jwt/login")


def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(secret=settings.jwt_secret, lifetime_seconds=settings.jwt_lifetime_seconds)


auth_backend = AuthenticationBackend(
    name="jwt",
    transport=bearer_transport,
    get_strategy=get_jwt_strategy,
)

fastapi_users = FastAPIUsers[User, str](get_user_manager, [auth_backend])

current_active_user = fastapi_users.current_user(active=True)
