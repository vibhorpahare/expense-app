from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.users import current_active_user
from app.db.session import get_async_session
from app.models.friendship import Friendship
from app.models.user import User
from app.schemas.user import PublicUser
from app.services.balances import friend_group_breakdown, pairwise_net_balances

router = APIRouter(tags=["friends"])


class CreateFriendIn(BaseModel):
    user_email: str


def _ordered(a: str, b: str) -> tuple[str, str]:
    return (a, b) if a < b else (b, a)


async def _friend_ids(session: AsyncSession, user_id: str) -> list[str]:
    result = await session.execute(
        select(Friendship).where(or_(Friendship.user_id == user_id, Friendship.friend_id == user_id))
    )
    return [f.friend_id if f.user_id == user_id else f.user_id for f in result.scalars()]


@router.get("/get_friends")
async def get_friends(
    session: AsyncSession = Depends(get_async_session), user: User = Depends(current_active_user)
):
    friend_ids = await _friend_ids(session, user.id)
    pairwise = await pairwise_net_balances(session, user.id)
    friends_out = []
    for fid in friend_ids:
        friend = await session.get(User, fid)
        if not friend:
            continue
        data = PublicUser.model_validate(friend).model_dump()
        data["balance"] = [
            {"currency_code": c, "amount": str(users[fid])}
            for c, users in pairwise.items()
            if fid in users and users[fid] != 0
        ]
        friends_out.append(data)
    return {"friends": friends_out}


@router.get("/get_friend/{friend_id}")
async def get_friend(
    friend_id: str,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    friend = await session.get(User, friend_id)
    if not friend:
        raise HTTPException(404, detail={"errors": {"base": ["Invalid API Request: record not found"]}})
    pairwise = await pairwise_net_balances(session, user.id)
    data = PublicUser.model_validate(friend).model_dump()
    data["balance"] = [
        {"currency_code": c, "amount": str(users[friend_id])}
        for c, users in pairwise.items()
        if friend_id in users and users[friend_id] != 0
    ]
    data["by_group"] = await friend_group_breakdown(session, user.id, friend_id)
    return {"friend": data}


@router.post("/create_friend")
async def create_friend(
    payload: CreateFriendIn,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    result = await session.execute(select(User).where(User.email == payload.user_email))
    friend = result.scalar_one_or_none()
    if not friend:
        raise HTTPException(400, detail={"errors": {"base": ["No user found with that email"]}})

    lo, hi = _ordered(user.id, friend.id)
    existing = await session.get(Friendship, {"user_id": lo, "friend_id": hi})
    if not existing:
        session.add(Friendship(user_id=lo, friend_id=hi))
        await session.commit()

    return {"friend": PublicUser.model_validate(friend).model_dump()}


@router.post("/delete_friend/{friend_id}")
async def delete_friend(
    friend_id: str,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    lo, hi = _ordered(user.id, friend_id)
    existing = await session.get(Friendship, {"user_id": lo, "friend_id": hi})
    if not existing:
        return {"success": False, "errors": {"base": ["There was an issue deleting that friendship"]}}
    await session.delete(existing)
    await session.commit()
    return {"success": True, "errors": []}
