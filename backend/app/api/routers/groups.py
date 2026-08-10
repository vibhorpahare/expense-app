import uuid
from datetime import datetime, timezone
from html import escape
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import ensure_group_member, ensure_group_owner, get_group_or_404
from app.core.config import settings
from app.core.users import current_active_user
from app.db.session import get_async_session
from app.models.friendship import Friendship
from app.models.group import Group, GroupMember
from app.models.user import User
from app.schemas.expense import SettleDebtCreate
from app.schemas.group import GroupCreate, GroupOut, GroupUpdate
from app.schemas.user import PublicUser
from app.services.balances import direct_pairwise_debts, net_balances_by_currency, net_balances_by_currency_multi
from app.services.debt_simplify import simplify_debts
from app.services.expenses import settle_debt
from app.services.notifications import notify

ALLOWED_AVATAR_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
MAX_AVATAR_BYTES = 5 * 1024 * 1024


async def _friend_ids(session: AsyncSession, user_id: str) -> set[str]:
    result = await session.execute(
        select(Friendship).where((Friendship.user_id == user_id) | (Friendship.friend_id == user_id))
    )
    return {f.friend_id if f.user_id == user_id else f.user_id for f in result.scalars()}

router = APIRouter(tags=["groups"])


async def _load_group(session: AsyncSession, group_id: str) -> Group | None:
    result = await session.execute(
        select(Group).options(selectinload(Group.members).selectinload(GroupMember.user)).where(Group.id == group_id)
    )
    return result.scalar_one_or_none()


async def _serialize_group(
    session: AsyncSession, group: Group, balances: dict | None = None, *, include_original_debts: bool = True
) -> dict:
    if balances is None:
        balances = await net_balances_by_currency(session, group_id=group.id)

    members = []
    for m in group.members:
        member = PublicUser.model_validate(m.user).model_dump()
        member["balance"] = [
            {"currency_code": cur, "amount": str(users.get(member["id"], 0))}
            for cur, users in balances.items()
            if member["id"] in users
        ]
        members.append(member)

    group_dict = {
        "id": group.id,
        "name": group.name,
        "group_type": group.group_type,
        "simplify_by_default": group.simplify_by_default,
        "avatar_url": group.avatar_url,
        "archived_at": group.archived_at,
        "created_by_id": group.created_by_id,
        "updated_at": group.updated_at,
        "members": members,
    }
    out = GroupOut.model_validate(group_dict).model_dump()

    simplified_debts = []
    for currency, users in balances.items():
        for d in simplify_debts(users):
            simplified_debts.append(
                {"from": d.from_user, "to": d.to_user, "amount": str(d.amount), "currency_code": currency}
            )
    out["simplified_debts"] = simplified_debts

    original_debts = []
    if include_original_debts:
        direct = await direct_pairwise_debts(session, group.id)
        for currency, debts in direct.items():
            for d in debts:
                original_debts.append(
                    {"from": d["from"], "to": d["to"], "amount": str(d["amount"]), "currency_code": currency}
                )
    out["original_debts"] = original_debts
    return out


@router.get("/get_groups")
async def get_groups(
    include_archived: bool = False,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    query = (
        select(Group)
        .join(GroupMember, GroupMember.group_id == Group.id)
        .where(GroupMember.user_id == user.id)
        .options(selectinload(Group.members).selectinload(GroupMember.user))
    )
    if not include_archived:
        query = query.where(Group.archived_at.is_(None))
    result = await session.execute(query)
    groups = result.scalars().unique().all()
    multi = await net_balances_by_currency_multi(session, [g.id for g in groups])
    return {
        "groups": [
            await _serialize_group(session, g, multi.get(g.id, {}), include_original_debts=False) for g in groups
        ]
    }


@router.get("/get_group/{group_id}")
async def get_group(
    group_id: str,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    await ensure_group_member(session, group_id, user.id)
    group = await _load_group(session, group_id)
    if not group:
        raise HTTPException(404, detail={"errors": {"base": ["Invalid API Request: record not found"]}})
    return {"group": await _serialize_group(session, group)}


@router.post("/create_group")
async def create_group(
    payload: GroupCreate,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    members: list[User] = []
    if payload.member_emails:
        emails = {e.lower() for e in payload.member_emails}
        result = await session.execute(select(User).where(User.email.in_(emails)))
        members = result.scalars().all()

        found_emails = {m.email.lower() for m in members}
        missing = emails - found_emails
        if missing:
            raise HTTPException(
                400, detail={"errors": {"base": [f"No user found with email {email}" for email in sorted(missing)]}}
            )

        friend_ids = await _friend_ids(session, user.id)
        not_friends = [m.email for m in members if m.id not in friend_ids]
        if not_friends:
            raise HTTPException(
                400,
                detail={"errors": {"base": [f"{email} is not in your friends list" for email in sorted(not_friends)]}},
            )

    group = Group(
        name=payload.name,
        group_type=payload.group_type,
        simplify_by_default=payload.simplify_by_default,
        created_by_id=user.id,
    )
    session.add(group)
    await session.flush()

    session.add(GroupMember(group_id=group.id, user_id=user.id))
    for member in members:
        session.add(GroupMember(group_id=group.id, user_id=member.id))

    await session.commit()
    group = await _load_group(session, group.id)
    return {"group": await _serialize_group(session, group)}


@router.post("/update_group/{group_id}")
async def update_group(
    group_id: str,
    payload: GroupUpdate,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    group = await get_group_or_404(session, group_id)
    await ensure_group_member(session, group_id, user.id)

    changed = any(getattr(payload, f) is not None for f in ("name", "group_type", "simplify_by_default"))
    for field in ("name", "group_type", "simplify_by_default"):
        value = getattr(payload, field)
        if value is not None:
            setattr(group, field, value)

    if changed:
        member_ids = (
            await session.execute(select(GroupMember.user_id).where(GroupMember.group_id == group_id))
        ).scalars().all()
        for member_id in member_ids:
            await notify(
                session,
                user_id=member_id,
                type_=7,  # group_settings_changed
                created_by_id=user.id,
                content=f"updated the settings for <strong>{escape(group.name)}</strong>",
                source_type="Group",
                source_id=group_id,
            )

    await session.commit()
    group = await _load_group(session, group_id)
    return {"group": await _serialize_group(session, group)}


@router.post("/groups/{group_id}/avatar")
async def upload_group_avatar(
    group_id: str,
    file: UploadFile,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    group = await get_group_or_404(session, group_id)
    ensure_group_owner(group, user.id)

    if file.content_type not in ALLOWED_AVATAR_TYPES:
        raise HTTPException(400, detail={"errors": {"base": ["Only JPEG, PNG, or WebP images are allowed"]}})
    contents = await file.read(MAX_AVATAR_BYTES + 1)
    if len(contents) > MAX_AVATAR_BYTES:
        raise HTTPException(400, detail={"errors": {"base": ["Image must be under 5MB"]}})

    storage_dir = Path(settings.avatar_storage_dir)
    storage_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4()}{ALLOWED_AVATAR_TYPES[file.content_type]}"
    (storage_dir / filename).write_bytes(contents)

    group.avatar_url = f"{settings.public_base_url}/avatars/{filename}"
    await session.commit()
    group = await _load_group(session, group_id)
    return {"group": await _serialize_group(session, group)}


@router.post("/groups/{group_id}/archive")
async def archive_group(
    group_id: str,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    group = await get_group_or_404(session, group_id)
    await ensure_group_member(session, group_id, user.id)

    balances = await net_balances_by_currency(session, group_id=group_id)
    for users in balances.values():
        if any(amount != 0 for amount in users.values()):
            return {"success": False, "errors": {"base": ["The group has an outstanding balance"]}}

    group.archived_at = datetime.now(timezone.utc)
    await session.commit()
    return {"success": True, "errors": {}}


@router.post("/groups/{group_id}/unarchive")
async def unarchive_group(
    group_id: str,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    group = await get_group_or_404(session, group_id)
    await ensure_group_member(session, group_id, user.id)
    group.archived_at = None
    await session.commit()
    return {"success": True, "errors": {}}


@router.post("/delete_group/{group_id}")
async def delete_group(
    group_id: str,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    group = await get_group_or_404(session, group_id)
    ensure_group_owner(group, user.id)

    member_ids = (
        await session.execute(select(GroupMember.user_id).where(GroupMember.group_id == group_id))
    ).scalars().all()
    for member_id in member_ids:
        await notify(
            session,
            user_id=member_id,
            type_=6,  # group_deleted
            created_by_id=user.id,
            content=f"deleted the group <strong>{escape(group.name)}</strong>",
            source_type="Group",
            source_id=group_id,
        )

    await session.delete(group)
    await session.commit()
    return {"success": True}


@router.post("/add_user_to_group")
async def add_user_to_group(
    group_id: str,
    user_id: str,
    session: AsyncSession = Depends(get_async_session),
    actor: User = Depends(current_active_user),
):
    await ensure_group_member(session, group_id, actor.id)
    existing = await session.get(GroupMember, {"group_id": group_id, "user_id": user_id})
    if existing:
        return {"success": False, "errors": {"base": ["That user is already a member of this group"]}}
    session.add(GroupMember(group_id=group_id, user_id=user_id))
    group = await session.get(Group, group_id)
    await notify(
        session,
        user_id=user_id,
        type_=4,  # added_to_group
        created_by_id=actor.id,
        content=f"added you to <strong>{escape(group.name) if group else 'a group'}</strong>",
        source_type="Group",
        source_id=group_id,
    )
    await session.commit()
    target = await session.get(User, user_id)
    return {"success": True, "user": target and target.email, "errors": {}}


@router.post("/remove_user_from_group")
async def remove_user_from_group(
    group_id: str,
    user_id: str,
    session: AsyncSession = Depends(get_async_session),
    actor: User = Depends(current_active_user),
):
    group = await get_group_or_404(session, group_id)
    await ensure_group_member(session, group_id, actor.id)
    # Anyone can remove themselves (leave); removing someone else requires being the owner.
    if user_id != actor.id:
        ensure_group_owner(group, actor.id)
    if user_id == group.created_by_id:
        return {
            "success": False,
            "errors": {"base": ["The group owner cannot be removed -- delete the group instead"]},
        }

    member = await session.get(GroupMember, {"group_id": group_id, "user_id": user_id})
    if not member:
        raise HTTPException(404, detail={"errors": {"base": ["That user is not a member of this group"]}})

    balances = await net_balances_by_currency(session, group_id=group_id)
    for users in balances.values():
        if users.get(user_id, 0) != 0:
            return {"success": False, "errors": {"base": ["The user has a non-zero balance"]}}

    await notify(
        session,
        user_id=user_id,
        type_=5,  # removed_from_group
        created_by_id=actor.id,
        content=f"removed you from <strong>{escape(group.name)}</strong>",
        source_type="Group",
        source_id=group_id,
    )
    await session.delete(member)
    await session.commit()
    return {"success": True, "errors": {}}


@router.get("/get_group/{group_id}/simplified_debts")
async def get_simplified_debts(
    group_id: str,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    """Not part of the original Splitwise path list -- Splitwise returns
    simplified_debts inline on the group object when simplify_by_default is on.
    Exposed as its own endpoint here so the UI can preview simplification on
    demand for any group, regardless of that setting.
    """
    await ensure_group_member(session, group_id, user.id)
    balances = await net_balances_by_currency(session, group_id=group_id)
    debts = {
        currency: [
            {"from": d.from_user, "to": d.to_user, "amount": str(d.amount), "currency_code": currency}
            for d in simplify_debts(users)
        ]
        for currency, users in balances.items()
    }
    return {"simplified_debts": [d for debts_list in debts.values() for d in debts_list]}


@router.post("/groups/{group_id}/settle_debt")
async def settle_debt_endpoint(
    group_id: str,
    payload: SettleDebtCreate,
    session: AsyncSession = Depends(get_async_session),
    actor: User = Depends(current_active_user),
):
    """Records a payment along one edge of the group's debt graph -- used to act
    on a displayed debt (simplified or direct) regardless of whether the acting
    user is one of the two parties. Both parties must still be group members.
    """
    await ensure_group_member(session, group_id, actor.id)
    await ensure_group_member(session, group_id, payload.from_user_id)
    await ensure_group_member(session, group_id, payload.to_user_id)

    await settle_debt(session, group_id, payload, actor_id=actor.id)
    return {"success": True}
