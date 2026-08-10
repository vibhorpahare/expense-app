from collections import defaultdict
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.expense import Expense, ExpenseShare
from app.models.group import Group, GroupMember
from app.services.debt_simplify import simplify_debts


async def net_balances_by_currency(
    session: AsyncSession, *, group_id: str | None = None, user_id: str | None = None
) -> dict[str, dict[str, Decimal]]:
    """Returns {currency_code: {user_id: net_balance}}.

    net_balance > 0 means the group/friend owes that user money;
    net_balance < 0 means that user owes the group money.
    Computed on the fly from expense_shares rather than a cached column, so it's
    always consistent with the underlying ledger (no separate write path to keep in sync).
    """
    query = (
        select(ExpenseShare, Expense.currency_code)
        .join(Expense, Expense.id == ExpenseShare.expense_id)
        .where(Expense.deleted_at.is_(None))
    )
    if group_id is not None:
        query = query.where(Expense.group_id == group_id)
    if user_id is not None:
        query = query.where(ExpenseShare.user_id == user_id)

    result = await session.execute(query)
    balances: dict[str, dict[str, Decimal]] = defaultdict(lambda: defaultdict(Decimal))
    for share, currency_code in result.all():
        balances[currency_code][share.user_id] += Decimal(share.paid_share) - Decimal(share.owed_share)

    return {currency: dict(users) for currency, users in balances.items()}


async def direct_pairwise_debts(session: AsyncSession, group_id: str) -> dict[str, list[dict]]:
    """The "simplify OFF" view: {currency_code: [{"from", "to", "amount"}]}, derived
    directly from each expense's own shares rather than the group's aggregate net
    balances. Each expense is its own mini-ledger -- run through the same
    `simplify_debts` used for the aggregate view, but scoped to just that one
    expense's participants -- and the results are accumulated per (currency,
    pair). For the common case (one payer, several owers) this reduces to exactly
    "each ower owes the payer their share"; it only does real work when an
    expense itself has multiple payers (e.g. an "adjustment" split). Accumulating
    per-expense (rather than exposing raw per-expense debts) means two expenses
    that partially offset each other on the same pair net down to one number,
    matching what "turning simplify off" shows in Splitwise.
    """
    query = (
        select(ExpenseShare, Expense.currency_code, Expense.id)
        .join(Expense, Expense.id == ExpenseShare.expense_id)
        .where(Expense.deleted_at.is_(None), Expense.group_id == group_id)
    )
    by_expense: dict[str, dict[str, Decimal]] = defaultdict(dict)
    currency_by_expense: dict[str, str] = {}
    for share, currency_code, expense_id in (await session.execute(query)).all():
        by_expense[expense_id][share.user_id] = Decimal(share.paid_share) - Decimal(share.owed_share)
        currency_by_expense[expense_id] = currency_code

    accum: dict[str, dict[tuple[str, str], Decimal]] = defaultdict(lambda: defaultdict(Decimal))
    for expense_id, shares in by_expense.items():
        currency = currency_by_expense[expense_id]
        for d in simplify_debts(shares):
            lo, hi = sorted((d.from_user, d.to_user))
            signed = d.amount if d.from_user == lo else -d.amount
            accum[currency][(lo, hi)] += signed

    result: dict[str, list[dict]] = defaultdict(list)
    for currency, pairs in accum.items():
        for (lo, hi), signed in pairs.items():
            signed = signed.quantize(Decimal("0.01"))
            if signed > 0:
                result[currency].append({"from": lo, "to": hi, "amount": signed})
            elif signed < 0:
                result[currency].append({"from": hi, "to": lo, "amount": -signed})
    return dict(result)


async def net_balances_by_currency_multi(
    session: AsyncSession, group_ids: list[str]
) -> dict[str, dict[str, dict[str, Decimal]]]:
    """Batched form of `net_balances_by_currency` for multiple groups at once --
    {group_id: {currency_code: {user_id: net_balance}}} -- one query instead of
    one-per-group, used anywhere that would otherwise loop over a group list.
    """
    if not group_ids:
        return {}
    query = (
        select(ExpenseShare, Expense.currency_code, Expense.group_id)
        .join(Expense, Expense.id == ExpenseShare.expense_id)
        .where(Expense.deleted_at.is_(None), Expense.group_id.in_(group_ids))
    )
    result = await session.execute(query)
    balances: dict[str, dict[str, dict[str, Decimal]]] = defaultdict(lambda: defaultdict(lambda: defaultdict(Decimal)))
    for share, currency_code, group_id in result.all():
        balances[group_id][currency_code][share.user_id] += Decimal(share.paid_share) - Decimal(share.owed_share)
    return {gid: {cur: dict(users) for cur, users in cmap.items()} for gid, cmap in balances.items()}


async def pairwise_net_balances(session: AsyncSession, user_id: str) -> dict[str, dict[str, Decimal]]:
    """{currency: {other_user_id: net}}, net > 0 meaning other_user_id owes user_id.

    A raw per-expense netted sum double-counts in any expense with 3+ participants
    (e.g. a $300 dinner split 3 ways would show as "+200 owed by A" *and*
    "+200 owed by B" simultaneously, overstating the real $200 credit by 2x when
    summed). To avoid that, every group and every non-group expense is treated as
    its own mini-ledger and run through the same debt-simplification used for
    group pages, which always resolves to non-overlapping pairwise amounts.
    """
    result: dict[str, dict[str, Decimal]] = defaultdict(lambda: defaultdict(Decimal))

    def _accumulate(currency: str, debts) -> None:
        for d in debts:
            if d.from_user == user_id:
                result[currency][d.to_user] -= d.amount
            elif d.to_user == user_id:
                result[currency][d.from_user] += d.amount

    group_ids = (
        await session.execute(select(GroupMember.group_id).where(GroupMember.user_id == user_id))
    ).scalars().all()
    multi = await net_balances_by_currency_multi(session, group_ids)
    for gid in group_ids:
        for currency, users in multi.get(gid, {}).items():
            _accumulate(currency, simplify_debts(users))

    query = (
        select(ExpenseShare, Expense.currency_code, Expense.id)
        .join(Expense, Expense.id == ExpenseShare.expense_id)
        .where(Expense.deleted_at.is_(None), Expense.group_id.is_(None))
    )
    by_expense: dict[str, dict[str, Decimal]] = defaultdict(dict)
    currency_by_expense: dict[str, str] = {}
    for share, currency_code, expense_id in (await session.execute(query)).all():
        by_expense[expense_id][share.user_id] = Decimal(share.paid_share) - Decimal(share.owed_share)
        currency_by_expense[expense_id] = currency_code

    for expense_id, shares in by_expense.items():
        if user_id not in shares:
            continue
        _accumulate(currency_by_expense[expense_id], simplify_debts(shares))

    return {currency: dict(users) for currency, users in result.items()}


async def dashboard_summary(session: AsyncSession, user_id: str) -> dict:
    """Top-level totals + per-friend breakdown, matching Splitwise's dashboard:
    "you owe" and "you are owed" are summed separately per counterparty (owing
    Bob $100 doesn't net against being owed $50 by Alice), while `total_balance`
    is their sum per currency.
    """
    pairwise = await pairwise_net_balances(session, user_id)

    total_balance: dict[str, Decimal] = defaultdict(Decimal)
    you_owe: dict[str, Decimal] = defaultdict(Decimal)
    you_are_owed: dict[str, Decimal] = defaultdict(Decimal)
    by_friend: dict[str, dict[str, Decimal]] = defaultdict(dict)

    for currency, users in pairwise.items():
        for other_id, amount in users.items():
            if amount == 0:
                continue
            total_balance[currency] += amount
            if amount > 0:
                you_are_owed[currency] += amount
            else:
                you_owe[currency] += -amount
            by_friend[other_id][currency] = amount

    return {
        "total_balance": [{"currency_code": c, "amount": str(a)} for c, a in total_balance.items()],
        "you_owe": [{"currency_code": c, "amount": str(a)} for c, a in you_owe.items()],
        "you_are_owed": [{"currency_code": c, "amount": str(a)} for c, a in you_are_owed.items()],
        "by_friend": {
            uid: [{"currency_code": c, "amount": str(a)} for c, a in balances.items()]
            for uid, balances in by_friend.items()
        },
    }


async def friend_group_breakdown(session: AsyncSession, user_id: str, friend_id: str) -> list[dict]:
    """Per-group (+ a 'Non-group expenses' bucket) breakdown of the balance between
    exactly these two users, for the friend detail view. Same simplify_debts-based
    approach as pairwise_net_balances, scoped down to shared groups only.
    """
    shared_group_ids = (
        await session.execute(
            select(GroupMember.group_id)
            .where(GroupMember.user_id == user_id)
            .intersect(select(GroupMember.group_id).where(GroupMember.user_id == friend_id))
        )
    ).scalars().all()

    breakdown: list[dict] = []

    multi = await net_balances_by_currency_multi(session, shared_group_ids)
    groups_by_id = {
        g.id: g
        for g in (await session.execute(select(Group).where(Group.id.in_(shared_group_ids)))).scalars()
    } if shared_group_ids else {}

    for gid in shared_group_ids:
        group = groups_by_id.get(gid)
        for currency, users in multi.get(gid, {}).items():
            for d in simplify_debts(users):
                if {d.from_user, d.to_user} != {user_id, friend_id}:
                    continue
                signed = d.amount if d.to_user == user_id else -d.amount
                breakdown.append(
                    {
                        "group_id": gid,
                        "group_name": group.name if group else None,
                        "currency_code": currency,
                        "amount": str(signed),
                    }
                )

    query = (
        select(ExpenseShare, Expense.currency_code, Expense.id)
        .join(Expense, Expense.id == ExpenseShare.expense_id)
        .where(
            Expense.deleted_at.is_(None),
            Expense.group_id.is_(None),
            ExpenseShare.user_id.in_([user_id, friend_id]),
        )
    )
    by_expense: dict[str, dict[str, Decimal]] = defaultdict(dict)
    currency_by_expense: dict[str, str] = {}
    for share, currency_code, expense_id in (await session.execute(query)).all():
        by_expense[expense_id][share.user_id] = Decimal(share.paid_share) - Decimal(share.owed_share)
        currency_by_expense[expense_id] = currency_code

    non_group_totals: dict[str, Decimal] = defaultdict(Decimal)
    for expense_id, shares in by_expense.items():
        if user_id in shares and friend_id in shares:
            for d in simplify_debts(shares):
                if {d.from_user, d.to_user} != {user_id, friend_id}:
                    continue
                signed = d.amount if d.to_user == user_id else -d.amount
                non_group_totals[currency_by_expense[expense_id]] += signed

    for currency, amount in non_group_totals.items():
        if amount != 0:
            breakdown.append(
                {"group_id": None, "group_name": "Non-group expenses", "currency_code": currency, "amount": str(amount)}
            )

    return breakdown
