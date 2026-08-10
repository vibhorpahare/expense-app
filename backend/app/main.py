import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routers import comments, dashboard, export, expenses, friends, groups, notifications, other, users
from app.core.config import settings
from app.core.users import auth_backend, fastapi_users
from app.schemas.user import UserCreate, UserRead, UserUpdate

# Uvicorn configures its own (uvicorn.*) loggers, but leaves the root logger at
# WARNING -- without this, every `logger.info(...)` in app/* (the SMTP-unconfigured
# email fallback, etc.) is silently dropped.
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

app = FastAPI(title="Splitly API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# fastapi-users ships register/login/logout/verify/reset-password out of the box --
# no reason to hand-roll auth endpoints.
app.include_router(fastapi_users.get_auth_router(auth_backend), prefix="/auth/jwt", tags=["auth"])
app.include_router(fastapi_users.get_register_router(UserRead, UserCreate), prefix="/auth", tags=["auth"])
app.include_router(fastapi_users.get_reset_password_router(), prefix="/auth", tags=["auth"])
app.include_router(fastapi_users.get_verify_router(UserRead), prefix="/auth", tags=["auth"])
app.include_router(fastapi_users.get_users_router(UserRead, UserUpdate), prefix="/users", tags=["users"])

app.include_router(users.router)
app.include_router(groups.router)
app.include_router(friends.router)
app.include_router(expenses.router)
app.include_router(comments.router)
app.include_router(notifications.router)
app.include_router(other.router)
app.include_router(dashboard.router)
app.include_router(export.router)

Path(settings.avatar_storage_dir).mkdir(parents=True, exist_ok=True)
app.mount("/avatars", StaticFiles(directory=settings.avatar_storage_dir), name="avatars")

Path(settings.receipt_storage_dir).mkdir(parents=True, exist_ok=True)
app.mount("/receipts", StaticFiles(directory=settings.receipt_storage_dir), name="receipts")


@app.get("/health")
async def health():
    return {"status": "ok"}
