import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.users import current_active_user
from app.db.session import get_async_session
from app.models.user import User
from app.schemas.user import PublicUser, UserRead

router = APIRouter(tags=["users"])

MAX_AVATAR_BYTES = 5 * 1024 * 1024
ALLOWED_AVATAR_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


@router.get("/get_current_user")
async def get_current_user(user: User = Depends(current_active_user)):
    return {"user": UserRead.model_validate(user)}


@router.get("/get_user/{user_id}")
async def get_user(user_id: str, session: AsyncSession = Depends(get_async_session), _: User = Depends(current_active_user)):
    target = await session.get(User, user_id)
    if not target:
        raise HTTPException(404, detail={"errors": {"base": ["Invalid API Request: record not found"]}})
    return {"user": PublicUser.model_validate(target)}


@router.post("/users/me/avatar")
async def upload_avatar(
    file: UploadFile,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    if file.content_type not in ALLOWED_AVATAR_TYPES:
        raise HTTPException(400, detail={"errors": {"base": ["Only JPEG, PNG, or WebP images are allowed"]}})

    contents = await file.read(MAX_AVATAR_BYTES + 1)
    if len(contents) > MAX_AVATAR_BYTES:
        raise HTTPException(400, detail={"errors": {"base": ["Image must be under 5MB"]}})

    storage_dir = Path(settings.avatar_storage_dir)
    storage_dir.mkdir(parents=True, exist_ok=True)

    # Filename is server-generated (uuid + extension from the validated
    # content-type allowlist above), never derived from the client-supplied
    # filename -- avoids path traversal / injection via that field.
    filename = f"{uuid.uuid4()}{ALLOWED_AVATAR_TYPES[file.content_type]}"
    (storage_dir / filename).write_bytes(contents)

    user.avatar_url = f"{settings.public_base_url}/avatars/{filename}"
    user.custom_picture = True
    await session.commit()
    return {"user": UserRead.model_validate(user)}
