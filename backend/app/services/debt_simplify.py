import heapq
from decimal import Decimal


class SimplifiedDebt:
    def __init__(self, from_user: str, to_user: str, amount: Decimal):
        self.from_user = from_user
        self.to_user = to_user
        self.amount = amount

    def __repr__(self):
        return f"<Debt {self.from_user} -> {self.to_user}: {self.amount}>"


def simplify_debts(net_balances: dict[str, Decimal]) -> list[SimplifiedDebt]:
    """Greedy min-cash-flow settle-up: repeatedly match the biggest creditor with
    the biggest debtor until every balance is zero. This is the same heuristic
    Splitwise documents for its "simplify debts" group setting -- it does not
    always yield the mathematically minimum number of transactions (that's
    NP-hard in general), but it's a good, well-known approximation and is what
    real-world splitting apps ship.

    net_balances: {user_id: amount}, positive = is owed money, negative = owes money.
    Only balances for a single currency should be passed in at a time.
    """
    creditors: list[tuple[Decimal, str]] = []
    debtors: list[tuple[Decimal, str]] = []

    for user_id, amount in net_balances.items():
        amount = amount.quantize(Decimal("0.01"))
        if amount > 0:
            creditors.append((amount, user_id))
        elif amount < 0:
            debtors.append((-amount, user_id))

    # Max-heaps via negation, since heapq is a min-heap.
    creditor_heap = [(-amt, uid) for amt, uid in creditors]
    debtor_heap = [(-amt, uid) for amt, uid in debtors]
    heapq.heapify(creditor_heap)
    heapq.heapify(debtor_heap)

    settlements: list[SimplifiedDebt] = []

    while creditor_heap and debtor_heap:
        credit_amt, credit_uid = heapq.heappop(creditor_heap)
        debt_amt, debt_uid = heapq.heappop(debtor_heap)
        credit_amt, debt_amt = -credit_amt, -debt_amt

        settle_amount = min(credit_amt, debt_amt)
        if settle_amount > 0:
            settlements.append(SimplifiedDebt(from_user=debt_uid, to_user=credit_uid, amount=settle_amount))

        remaining_credit = credit_amt - settle_amount
        remaining_debt = debt_amt - settle_amount

        if remaining_credit > Decimal("0.001"):
            heapq.heappush(creditor_heap, (-remaining_credit, credit_uid))
        if remaining_debt > Decimal("0.001"):
            heapq.heappush(debtor_heap, (-remaining_debt, debt_uid))

    return settlements
