import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { exportApi, expenses as expensesApi, groups as groupsApi, other as otherApi, type Category } from "../lib/api";
import { AddExpenseModal } from "../components/AddExpenseModal";
import { GroupSettingsModal } from "../components/GroupSettingsModal";
import { formatMoney, sumByCurrency, useCurrencyUnits } from "../lib/currency";
import { formatDateTime } from "../lib/datetime";

function flattenCategoryNames(categories: Category[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const parent of categories) for (const sub of parent.subcategories) map.set(sub.id, sub.name);
  return map;
}

export function GroupPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const queryClient = useQueryClient();

  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => groupsApi.get(groupId!),
    enabled: !!groupId,
  });

  const settleDebt = useMutation({
    mutationFn: (debt: { from: string; to: string; amount: string; currency_code: string }) =>
      groupsApi.settleDebt(groupId!, {
        from_user_id: debt.from,
        to_user_id: debt.to,
        amount: debt.amount,
        currency_code: debt.currency_code,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      queryClient.invalidateQueries({ queryKey: ["expenses", groupId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
    },
  });

  const { data: expenseList, isLoading: expensesLoading } = useQuery({
    queryKey: ["expenses", groupId],
    queryFn: () => expensesApi.list({ group_id: groupId }),
    enabled: !!groupId,
  });

  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: otherApi.categories });
  const categoryNames = useMemo(() => (categories ? flattenCategoryNames(categories) : new Map()), [categories]);
  const units = useCurrencyUnits();

  // Never sum different currencies into one number -- keep a running total per currency_code.
  const totalSpentByCurrency = useMemo(
    () =>
      sumByCurrency(
        (expenseList ?? []).filter((e) => !e.payment),
        (e) => parseFloat(e.cost),
        (e) => e.currency_code,
      ),
    [expenseList],
  );

  // Category breakdown also stays split by currency, so two categories in different
  // currencies never get compared or added together.
  const byCategory = useMemo(() => {
    const totals = new Map<string, Map<string, number>>();
    for (const e of expenseList ?? []) {
      if (e.payment) continue;
      const name = e.category_id ? categoryNames.get(e.category_id) ?? "Other" : "Uncategorized";
      const perCurrency = totals.get(name) ?? new Map<string, number>();
      perCurrency.set(e.currency_code, (perCurrency.get(e.currency_code) ?? 0) + parseFloat(e.cost));
      totals.set(name, perCurrency);
    }
    const rows: { name: string; currency: string; amount: number }[] = [];
    for (const [name, perCurrency] of totals) {
      for (const [currency, amount] of perCurrency) rows.push({ name, currency, amount });
    }
    return rows.sort((a, b) => b.amount - a.amount).slice(0, 5);
  }, [expenseList, categoryNames]);
  const maxCategory = Math.max(1, ...byCategory.map((r) => r.amount));

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  if (groupLoading || !group) return <p className="text-on-surface-variant">Loading...</p>;

  return (
    <div>
      {/* Hero */}
      <div className="relative rounded-xl overflow-hidden mb-6 bg-primary-container">
        <div className="p-6 flex items-end justify-between min-h-32">
          <div>
            <p className="font-label text-xs uppercase tracking-wide text-on-primary-container/70 mb-1">
              {group.group_type}
            </p>
            <h1 className="font-display text-3xl font-bold text-on-primary-container">{group.name}</h1>
            <p className="text-sm text-on-primary-container/80 mt-1">
              {group.members.length} participants
              {group.archived_at && <span className="ml-2 px-2 py-0.5 rounded-full bg-surface text-xs">Archived</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => exportApi.expensesCsv({ group_id: groupId })}
              className="px-3 py-2 rounded-full bg-surface text-on-surface text-sm font-medium hover:opacity-90"
              title="Export expenses as CSV"
            >
              Export CSV
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="px-3 py-2 rounded-full bg-surface text-on-surface text-sm font-medium hover:opacity-90"
              title="Group settings"
            >
              Settings
            </button>
            <button
              onClick={() => setShowAddExpense(true)}
              className="px-4 py-2 rounded-full bg-primary text-on-primary text-sm font-semibold hover:opacity-90"
            >
              + Add expense
            </button>
          </div>
        </div>
      </div>

      {showAddExpense && (
        <AddExpenseModal
          groupId={groupId}
          initialParticipantIds={group.members.map((m) => m.id)}
          onClose={() => setShowAddExpense(false)}
        />
      )}

      {showSettings && <GroupSettingsModal group={group} onClose={() => setShowSettings(false)} />}

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-4">
          <div className="p-5 rounded-xl border border-outline-variant bg-surface">
            <p className="font-label text-xs uppercase tracking-wide text-on-surface-variant mb-1">Total spent</p>
            {totalSpentByCurrency.size === 0 && <p className="font-display text-2xl font-bold">0.00</p>}
            {Array.from(totalSpentByCurrency.entries()).map(([currency, amount]) => (
              <p key={currency} className="font-display text-2xl font-bold">
                {formatMoney(amount, currency, units)}
              </p>
            ))}
          </div>

          <div>
            <h2 className="font-display text-lg font-semibold mb-3">Expenses</h2>
            <div className="grid gap-2">
              {expensesLoading && <p className="text-on-surface-variant">Loading...</p>}
              {expenseList?.map((e) => (
                <Link
                  key={e.id}
                  to={`/expenses/${e.id}`}
                  className="p-3 rounded-lg border border-outline-variant bg-surface block hover:bg-surface-container transition-colors"
                >
                  <div className="flex justify-between">
                    <p className="font-medium">{e.description}</p>
                    <p className="font-medium">{formatMoney(e.cost, e.currency_code, units)}</p>
                  </div>
                  <p className="text-xs text-on-surface-variant">{formatDateTime(e.date)}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {e.shares.map((s) => (
                      <span
                        key={s.user.id}
                        className={`text-xs px-2 py-1 rounded-full ${parseFloat(s.net_balance) >= 0 ? "bg-positive-bg text-positive" : "bg-negative-bg text-negative"}`}
                      >
                        {s.user.first_name}: {parseFloat(s.net_balance) >= 0 ? "+" : ""}
                        {parseFloat(s.net_balance).toFixed(2)}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
              {expenseList?.length === 0 && <p className="text-on-surface-variant">No expenses yet.</p>}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-5 rounded-xl border border-outline-variant bg-surface">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-label text-xs uppercase tracking-wide text-on-surface-variant">
                {group.simplify_by_default ? "Simplified debts" : "Debts"}
              </h2>
              {group.simplify_by_default && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-container text-on-primary-container">
                  Simplified
                </span>
              )}
            </div>
            <div className="grid gap-2">
              {(group.simplify_by_default ? group.simplified_debts : group.original_debts).length === 0 && (
                <p className="text-on-surface-variant text-sm">Everyone is settled up.</p>
              )}
              {(group.simplify_by_default ? group.simplified_debts : group.original_debts).map((d, i) => {
                const from = group.members.find((m) => m.id === d.from);
                const to = group.members.find((m) => m.id === d.to);
                const isPending = settleDebt.isPending && settleDebt.variables?.from === d.from && settleDebt.variables?.to === d.to;
                return (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">{from?.first_name}</span> owes{" "}
                      <span className="font-medium">{to?.first_name}</span>
                      <br />
                      <span className="text-on-surface-variant">{formatMoney(d.amount, d.currency_code, units)}</span>
                    </div>
                    <button
                      disabled={isPending}
                      onClick={() => d.to && settleDebt.mutate({ from: d.from, to: d.to, amount: d.amount, currency_code: d.currency_code })}
                      className="text-xs px-2.5 py-1 rounded-full border border-outline-variant hover:bg-surface-container disabled:opacity-50 shrink-0"
                    >
                      {isPending ? "Settling..." : "Settle"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {byCategory.length > 0 && (
            <div className="p-5 rounded-xl border border-outline-variant bg-surface">
              <h2 className="font-label text-xs uppercase tracking-wide text-on-surface-variant mb-3">Spending by category</h2>
              <div className="space-y-3">
                {byCategory.map((row) => (
                  <div key={`${row.name}-${row.currency}`}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{row.name}</span>
                      <span className="text-on-surface-variant">{formatMoney(row.amount, row.currency, units)}</span>
                    </div>
                    <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${(row.amount / maxCategory) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-5 rounded-xl border border-outline-variant bg-surface">
            <h2 className="font-label text-xs uppercase tracking-wide text-on-surface-variant mb-3">Members</h2>
            <div className="flex flex-wrap gap-2">
              {group.members.map((m) => (
                <span key={m.id} className="text-sm px-3 py-1 rounded-full bg-surface-container">
                  {m.first_name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
