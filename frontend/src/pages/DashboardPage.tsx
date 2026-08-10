import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { dashboard as dashboardApi, friends as friendsApi, expenses as expensesApi, type Balance } from "../lib/api";
import { formatMoney, useCurrencyUnits } from "../lib/currency";
import { formatDateTime } from "../lib/datetime";

function StatCard({
  label,
  entries,
  tone,
  icon,
  units,
}: {
  label: string;
  entries: Balance[];
  tone: "neutral" | "owe" | "owed";
  icon: string;
  units: Record<string, string>;
}) {
  const color = tone === "owe" ? "text-negative" : tone === "owed" ? "text-positive" : "text-on-surface";
  const iconBg = tone === "owe" ? "bg-negative-bg" : tone === "owed" ? "bg-positive-bg" : "bg-primary-container";
  const iconColor = tone === "owe" ? "text-negative" : tone === "owed" ? "text-positive" : "text-on-primary-container";
  return (
    <div className="p-5 rounded-xl border border-outline-variant bg-surface">
      <div className="flex items-center justify-between mb-3">
        <p className="font-label text-xs uppercase tracking-wide text-on-surface-variant">{label}</p>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${iconBg}`}>
          <span className={`material-symbols-outlined text-[18px] ${iconColor}`}>{icon}</span>
        </div>
      </div>
      {entries.length === 0 && <p className={`font-display text-2xl font-bold ${color}`}>0.00</p>}
      {entries.map((b) => (
        <p key={b.currency_code} className={`font-display text-2xl font-bold ${color}`}>
          {formatMoney(Math.abs(parseFloat(b.amount)), b.currency_code, units)}
        </p>
      ))}
    </div>
  );
}

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

function MonthlySpendChart({ expenses, units }: { expenses: { date: string; cost: string; currency_code: string }[]; units: Record<string, string> }) {
  // Group by currency first -- summing different currencies' costs together would
  // silently produce a meaningless number, so each currency gets its own mini-chart.
  const byCurrency = useMemo(() => {
    const map = new Map<string, { date: string; cost: string }[]>();
    for (const e of expenses) {
      const list = map.get(e.currency_code) ?? [];
      list.push(e);
      map.set(e.currency_code, list);
    }
    return map;
  }, [expenses]);

  if (byCurrency.size === 0) {
    return <p className="text-sm text-on-surface-variant">No spending yet -- add an expense to see trends here.</p>;
  }

  return (
    <div className="space-y-6">
      {Array.from(byCurrency.entries()).map(([currencyCode, currencyExpenses]) => (
        <div key={currencyCode}>
          {byCurrency.size > 1 && (
            <p className="font-label text-[10px] uppercase tracking-wide text-on-surface-variant mb-2">{currencyCode}</p>
          )}
          <SingleCurrencyBars expenses={currencyExpenses} unit={units[currencyCode] ?? `${currencyCode} `} />
        </div>
      ))}
    </div>
  );
}

function SingleCurrencyBars({ expenses, unit }: { expenses: { date: string; cost: string }[]; unit: string }) {
  const [hovered, setHovered] = useState<number | null>(null);

  // Always plot a fixed 6-month window (even empty months) so a single data
  // point still reads as a chart with axes, not a lone floating bar.
  const byMonth = useMemo(() => {
    const now = new Date();
    const months: { key: string; month: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, month: d.toLocaleDateString(undefined, { month: "short" }), total: 0 });
    }
    const byKey = new Map(months.map((m) => [m.key, m]));
    for (const e of expenses) {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const entry = byKey.get(key);
      if (entry) entry.total += parseFloat(e.cost);
    }
    return months;
  }, [expenses]);

  const totalSpend = byMonth.reduce((sum, m) => sum + m.total, 0);
  const axisMax = niceMax(Math.max(...byMonth.map((m) => m.total)));
  const ticks = [axisMax, axisMax * 0.75, axisMax * 0.5, axisMax * 0.25, 0];

  if (totalSpend === 0) {
    return <p className="text-sm text-on-surface-variant">No spending yet -- add an expense to see trends here.</p>;
  }

  return (
    <div className="flex gap-3 h-48">
      <div className="flex flex-col justify-between text-right pr-1 py-0.5">
        {ticks.map((t) => (
          <span key={t} className="font-label text-[10px] text-on-surface-variant leading-none">
            {unit}
            {t >= 1000 ? `${(t / 1000).toFixed(1)}k` : t.toFixed(0)}
          </span>
        ))}
      </div>
      <div className="flex-1 relative flex items-end gap-3">
        {/* gridlines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {ticks.map((t) => (
            <div key={t} className="border-t border-outline-variant/60 w-full h-0" />
          ))}
        </div>
        {byMonth.map((m, i) => (
          <div key={m.key} className="flex-1 flex flex-col items-center gap-2 h-full justify-end relative z-10">
            {hovered === i && (
              <div className="absolute -top-8 px-2 py-1 rounded-md bg-inverse-surface text-inverse-on-surface text-xs whitespace-nowrap shadow-lg">
                {unit}
                {m.total.toFixed(2)}
              </div>
            )}
            <div
              className={`w-full max-w-10 rounded-t-lg transition-colors ${m.total > 0 ? "bg-primary" : "bg-outline-variant/30"} ${hovered === i ? "opacity-80" : ""}`}
              style={{ height: m.total > 0 ? `${Math.max(3, (m.total / axisMax) * 100)}%` : "2px" }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
            <span className="font-label text-[10px] text-on-surface-variant uppercase">{m.month}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { data: summary } = useQuery({ queryKey: ["dashboard"], queryFn: dashboardApi.summary });
  const { data: friendsList } = useQuery({ queryKey: ["friends"], queryFn: friendsApi.list });
  const { data: recentExpenses } = useQuery({
    queryKey: ["expenses", "recent"],
    queryFn: () => expensesApi.list({ limit: 100 }),
  });

  const friendsWithBalance = (friendsList ?? []).filter((f) => f.balance.length > 0).slice(0, 3);
  const units = useCurrencyUnits();

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-6">Dashboard</h1>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard label="Total balance" entries={summary.total_balance} tone="neutral" icon="account_balance_wallet" units={units} />
          <StatCard label="You are owed" entries={summary.you_are_owed} tone="owed" icon="trending_up" units={units} />
          <StatCard label="You owe" entries={summary.you_owe} tone="owe" icon="trending_down" units={units} />
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 p-5 rounded-xl border border-outline-variant bg-surface">
          <p className="font-label text-xs uppercase tracking-wide text-on-surface-variant mb-4">Monthly spending</p>
          {recentExpenses ? <MonthlySpendChart expenses={recentExpenses} units={units} /> : <p className="text-sm text-on-surface-variant">Loading...</p>}
        </div>

        <div className="p-5 rounded-xl border border-outline-variant bg-surface flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="font-label text-xs uppercase tracking-wide text-on-surface-variant">Quick settle</p>
            <Link to="/friends" className="text-xs text-primary font-medium">
              View all
            </Link>
          </div>
          {friendsWithBalance.length === 0 && <p className="text-sm text-on-surface-variant">Everyone is settled up.</p>}
          {friendsWithBalance.map((f) => (
            <Link
              key={f.id}
              to="/friends"
              className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-surface-container transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container text-xs font-semibold shrink-0">
                  {f.first_name[0]}
                </div>
                <span className="text-sm truncate">{f.first_name}</span>
              </div>
              {f.balance.map((b) => (
                <span key={b.currency_code} className={`text-sm font-medium shrink-0 ${parseFloat(b.amount) >= 0 ? "text-positive" : "text-negative"}`}>
                  {parseFloat(b.amount) >= 0 ? "owes " : "you owe "}
                  {formatMoney(Math.abs(parseFloat(b.amount)), b.currency_code, units)}
                </span>
              ))}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-semibold">Recent activity</h2>
          <Link to="/expenses" className="text-sm text-primary font-medium">
            View all
          </Link>
        </div>
        <div className="grid gap-2">
          {recentExpenses?.slice(0, 5).map((e) => (
            <div key={e.id} className="p-3 rounded-lg border border-outline-variant bg-surface flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{e.description}</p>
                <p className="text-xs text-on-surface-variant">{formatDateTime(e.date)}</p>
              </div>
              <p className="font-medium text-sm">{formatMoney(e.cost, e.currency_code, units)}</p>
            </div>
          ))}
          {recentExpenses?.length === 0 && <p className="text-sm text-on-surface-variant">No activity yet.</p>}
        </div>
      </div>
    </div>
  );
}
