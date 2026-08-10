import uuid
from datetime import datetime
from html import escape
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import ensure_expense_access, ensure_group_member
from app.core.config import settings
from app.core.users import current_active_user
from app.db.session import get_async_session
from app.models.comment import Comment
from app.models.expense import Expense, ExpenseShare
from app.models.group import GroupMember
from app.models.user import User
from app.schemas.expense import ExpenseCreate, ExpenseOut, ExpenseUpdate, SettleUpCreate
from app.services.expenses import create_expense, settle_up
from app.services.notifications import notify
from app.services.receipt_ocr import extract_receipt_fields

router = APIRouter(tags=["expenses"])

MAX_RECEIPT_BYTES = 8 * 1024 * 1024
ALLOWED_RECEIPT_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


async def _read_validated_image(file: UploadFile) -> bytes:
    if file.content_type not in ALLOWED_RECEIPT_TYPES:
        raise HTTPException(400, detail={"errors": {"base": ["Only JPEG, PNG, or WebP images are allowed"]}})
    contents = await file.read(MAX_RECEIPT_BYTES + 1)
    if len(contents) > MAX_RECEIPT_BYTES:
        raise HTTPException(400, detail={"errors": {"base": ["Image must be under 8MB"]}})
    return contents


def _eager():
    return (
        selectinload(Expense.shares).selectinload(ExpenseShare.user),
        selectinload(Expense.comments).selectinload(Comment.user),
    )


async def _reload(session: AsyncSession, expense_id: str) -> Expense:
    result = await session.execute(select(Expense).options(*_eager()).where(Expense.id == expense_id))
    return result.scalar_one()


async def _notify_participants(session: AsyncSession, expense: Expense, *, type_: int, content: str, actor_id: str) -> None:
    result = await session.execute(select(ExpenseShare.user_id).where(ExpenseShare.expense_id == expense.id))
    for (participant_id,) in result.all():
        await notify(
            session,
            user_id=participant_id,
            type_=type_,
            created_by_id=actor_id,
            content=content,
            source_type="Expense",
            source_id=expense.id,
        )


@router.get("/get_expense/{expense_id}")
async def get_expense(
    expense_id: str,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    result = await session.execute(
        select(Expense).options(*_eager()).where(Expense.id == expense_id)
    )
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(404, detail={"errors": {"base": ["Invalid API Request: record not found"]}})
    await ensure_expense_access(session, expense, user.id)
    return {"expense": await _serialize(session, expense)}


@router.get("/get_expenses")
async def get_expenses(
    group_id: str | None = None,
    friend_id: str | None = None,
    category_id: int | None = None,
    payer_id: str | None = None,
    dated_after: datetime | None = None,
    dated_before: datetime | None = None,
    limit: int = Query(20),
    offset: int = Query(0),
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    query = select(Expense).options(*_eager()).where(Expense.deleted_at.is_(None))
    if group_id is not None:
        await ensure_group_member(session, group_id, user.id)
        query = query.where(Expense.group_id == group_id)
    else:
        query = query.join(ExpenseShare).where(ExpenseShare.user_id == user.id)
        if friend_id is not None:
            friend_expense_ids = select(ExpenseShare.expense_id).where(ExpenseShare.user_id == friend_id)
            query = query.where(Expense.id.in_(friend_expense_ids))

    if category_id is not None:
        query = query.where(Expense.category_id == category_id)
    if payer_id is not None:
        payer_expense_ids = select(ExpenseShare.expense_id).where(
            ExpenseShare.user_id == payer_id, ExpenseShare.paid_share > 0
        )
        query = query.where(Expense.id.in_(payer_expense_ids))
    if dated_after is not None:
        query = query.where(Expense.date >= dated_after.isoformat())
    if dated_before is not None:
        query = query.where(Expense.date <= dated_before.isoformat())

    query = query.order_by(Expense.date.desc()).limit(limit).offset(offset)
    result = await session.execute(query)
    expenses = result.scalars().unique().all()
    return {"expenses": [await _serialize(session, e) for e in expenses]}


@router.post("/expenses/extract_receipt")
async def extract_receipt(
    file: UploadFile,
    _: User = Depends(current_active_user),
):
    """Standalone OCR prefill used from the *create* expense flow, before an
    expense id exists. Always 200s -- `available: false` when OPENAI_API_KEY
    isn't configured, so the frontend can silently skip prefill either way.
    """
    contents = await _read_validated_image(file)
    fields = await extract_receipt_fields(contents, file.content_type)
    if fields is None:
        return {"available": False}
    return {"available": True, **fields}


@router.post("/expenses/{expense_id}/receipt")
async def upload_receipt(
    expense_id: str,
    file: UploadFile,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    expense = await session.get(Expense, expense_id)
    if not expense:
        raise HTTPException(404, detail={"errors": {"base": ["Invalid API Request: record not found"]}})
    await ensure_expense_access(session, expense, user.id)

    contents = await _read_validated_image(file)
    storage_dir = Path(settings.receipt_storage_dir)
    storage_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4()}{ALLOWED_RECEIPT_TYPES[file.content_type]}"
    (storage_dir / filename).write_bytes(contents)

    expense.receipt_url = f"{settings.public_base_url}/receipts/{filename}"
    await session.commit()
    expense = await _reload(session, expense_id)
    return {"expense": await _serialize(session, expense)}


@router.post("/create_expense")
async def create_expense_endpoint(
    payload: ExpenseCreate,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    if payload.group_id is not None:
        await ensure_group_member(session, payload.group_id, user.id)
    try:
        expense = await create_expense(session, payload, created_by_id=user.id)
    except ValueError as e:
        return {"expenses": [], "errors": {"base": [str(e)]}}
    expense = await _reload(session, expense.id)
    return {"expenses": [await _serialize(session, expense)], "errors": {}}


@router.post("/settle_up")
async def settle_up_endpoint(
    payload: SettleUpCreate,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    if payload.group_id is not None:
        await ensure_group_member(session, payload.group_id, user.id)
    expense = await settle_up(session, payload, current_user_id=user.id)
    expense = await _reload(session, expense.id)
    return {"expenses": [await _serialize(session, expense)], "errors": {}}


@router.post("/update_expense/{expense_id}")
async def update_expense(
    expense_id: str,
    payload: ExpenseUpdate,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    result = await session.execute(select(Expense).options(*_eager()).where(Expense.id == expense_id))
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(404, detail={"errors": {"base": ["Invalid API Request: record not found"]}})
    await ensure_expense_access(session, expense, user.id)

    for field in ("description", "details", "cost", "currency_code", "category_id"):
        value = getattr(payload, field)
        if value is not None:
            setattr(expense, field, value)
    if payload.date is not None:
        expense.date = payload.date.isoformat()
    if payload.shares is not None:
        for share in list(expense.shares):
            await session.delete(share)
        await session.flush()
        expense.shares = [
            ExpenseShare(user_id=s.user_id, paid_share=s.paid_share, owed_share=s.owed_share)
            for s in payload.shares
        ]

    expense.updated_by_id = user.id
    await _notify_participants(
        session, expense, type_=1, content=f"updated <strong>{escape(expense.description)}</strong>", actor_id=user.id
    )
    await session.commit()
    expense = await _reload(session, expense_id)
    return {"expenses": [await _serialize(session, expense)], "errors": {}}


@router.post("/delete_expense/{expense_id}")
async def delete_expense(
    expense_id: str,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    expense = await session.get(Expense, expense_id)
    if not expense:
        return {"success": False, "errors": {"expense": ["does not exist, or has already been deleted"]}}
    await ensure_expense_access(session, expense, user.id)
    expense.deleted_at = datetime.utcnow()
    expense.deleted_by_id = user.id
    await _notify_participants(
        session, expense, type_=2, content=f"deleted <strong>{escape(expense.description)}</strong>", actor_id=user.id
    )
    await session.commit()
    return {"success": True}


@router.post("/undelete_expense/{expense_id}")
async def undelete_expense(
    expense_id: str,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    expense = await session.get(Expense, expense_id)
    if not expense:
        raise HTTPException(404, detail={"errors": {"base": ["Invalid API Request: record not found"]}})
    await ensure_expense_access(session, expense, user.id)
    expense.deleted_at = None
    expense.deleted_by_id = None
    await session.commit()
    return {"success": True}


async def _serialize(session: AsyncSession, expense: Expense) -> dict:
    return ExpenseOut.model_validate(expense).model_dump()
