import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  exportApi,
  expenses as expensesApi,
  groups as groupsApi,
  friends as friendsApi,
  other as otherApi,
  type Category,
} from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatMoney, useCurrencyUnits } from "../lib/currency";
import { formatDateTime } from "../lib/datetime";

type DateRange = "all" | "this_month" | "last_month";

function dateRangeToBounds(range: DateRange): { after?: string; before?: string } {
  const now = new Date();
  if (range === "this_month") {
    return { after: new Date(now.getFullYear(), now.getMonth(), 1).toISOString() };
  }
  if (range === "last_month") {
    return {
      after: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
      before: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
    };
  }
  return {};
}

function flattenCategories(categories: Category[]): { id: number; label: string }[] {
  const out: { id: number; label: string }[] = [];
  for (const parent of categories) {
    for (const sub of parent.subcategories) out.push({ id: sub.id, label: `${parent.name} / ${sub.name}` });
  }
  return out;
}

export function AllExpensesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [groupId, setGroupId] = useState<string>("");
  const [payerId, setPayerId] = useState<string>("");
  const [limit, setLimit] = useState(20);
  const units = useCurrencyUnits();

  const { data: groups } = useQuery({ queryKey: ["groups"], queryFn: () => groupsApi.list() });
  const { data: friendsList } = useQuery({ queryKey: ["friends"], queryFn: friendsApi.list });
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: otherApi.categories });
  const flatCategories = useMemo(() => (categories ? flattenCategories(categories) : []), [categories]);

  const bounds = dateRangeToBounds(dateRange);
  const { data: expenseList, isLoading } = useQuery({
    queryKey: ["all-expenses", dateRange, categoryId, groupId, payerId, limit],
    queryFn: () =>
      expensesApi.list({
        group_id: groupId || undefined,
        category_id: categoryId || undefined,
        payer_id: payerId || undefined,
        dated_after: bounds.after,
        dated_before: bounds.before,
        limit,
      }),
  });

  const groupName = (id: string | null) => (id ? groups?.find((g) => g.id === id)?.name ?? "—" : "Non-group");
  const categoryLabel = (id: number | null) => (id ? flatCategories.find((c) => c.id === id)?.label ?? "—" : "Uncategorized");
  const payerOptions = [
    ...(user ? [{ id: user.id, name: "You" }] : []),
    ...(friendsList ?? []).map((f) => ({ id: f.id, name: f.first_name })),
  ];

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-1">
        <h1 className="font-display text-2xl font-bold">All Expenses</h1>
        <button
          onClick={() =>
            exportApi.expensesCsv({
              group_id: groupId || undefined,
              category_id: categoryId || undefined,
              payer_id: payerId || undefined,
              dated_after: bounds.after,
              dated_before: bounds.before,
            })
          }
          className="px-3 py-2 rounded-full border border-outline-variant text-sm font-medium hover:bg-surface-container shrink-0"
        >
          Export CSV
        </button>
      </div>
      <p className="text-sm text-on-surface-variant mb-6">Keep track of your spending across all groups and friends.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div>
          <label className="block font-label text-[10px] uppercase text-on-surface-variant mb-1">Date range</label>
          <select
            className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
          >
            <option value="all">All time</option>
            <option value="this_month">This month</option>
            <option value="last_month">Last month</option>
          </select>
        </div>
        <div>
          <label className="block font-label text-[10px] uppercase text-on-surface-variant mb-1">Category</label>
          <select
            className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">All categories</option>
            {flatCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-label text-[10px] uppercase text-on-surface-variant mb-1">Group</label>
          <select
            className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
          >
            <option value="">All groups</option>
            {groups?.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-label text-[10px] uppercase text-on-surface-variant mb-1">Payer</label>
          <select
            className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm"
            value={payerId}
            onChange={(e) => setPayerId(e.target.value)}
          >
            <option value="">Everyone</option>
            {payerOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-outline-variant bg-surface overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="bg-surface-container text-left font-label text-xs uppercase text-on-surface-variant">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Group</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-on-surface-variant">
                  Loading...
                </td>
              </tr>
            )}
            {expenseList?.map((e) => (
              <tr
                key={e.id}
                onClick={() => navigate(`/expenses/${e.id}`)}
                className="border-t border-outline-variant hover:bg-surface-container/50 transition-colors cursor-pointer"
              >
                <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(e.date)}</td>
                <td className="px-4 py-3 font-medium">{e.description}</td>
                <td className="px-4 py-3 text-on-surface-variant">{categoryLabel(e.category_id)}</td>
                <td className="px-4 py-3 text-on-surface-variant">{groupName(e.group_id)}</td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatMoney(e.cost, e.currency_code, units)}
                </td>
              </tr>
            ))}
            {expenseList?.length === 0 && !isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-on-surface-variant">
                  No expenses match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {expenseList && expenseList.length >= limit && (
          <div className="p-3 text-center border-t border-outline-variant">
            <button onClick={() => setLimit((l) => l + 20)} className="text-sm text-primary font-medium">
              Show more
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
