import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { expenses as expensesApi } from "../../api";
import { useCategories } from "../../hooks/useCategories";
import { GlassCard } from "../../components/ui/GlassCard";
import { Icon } from "../../components/ui/Icon";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { AreaChart, type AreaChartPoint } from "../../components/ui/AreaChart";
import { colors, spacing, TAB_BAR_CLEARANCE } from "../../theme/tokens";
import { typography } from "../../theme/typography";
import { formatMoney } from "../../lib/currency";

function monthKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}`;
}

export function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const { data: expenseList = [], isLoading } = useQuery({
    queryKey: ["expenses", "insights"],
    queryFn: () => expensesApi.list({ limit: 300 }),
  });
  const { flat: flatCategories } = useCategories();
  const categoryNameById = useMemo(() => new Map(flatCategories.map((c) => [c.id, c.label.split(" / ").pop()!])), [flatCategories]);

  const spendingExpenses = useMemo(() => expenseList.filter((e) => !e.payment), [expenseList]);

  // Real 6-month bucketing, same convention as Dashboard's monthly trend --
  // no fabricated data points.
  const monthlySeries: AreaChartPoint[] = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: monthKey(d), label: d.toLocaleDateString(undefined, { month: "short" }), total: 0 });
    }
    const byKey = new Map(months.map((m) => [m.key, m]));
    for (const e of spendingExpenses) {
      const entry = byKey.get(monthKey(new Date(e.date)));
      if (entry) entry.total += parseFloat(e.cost);
    }
    return months.map((m) => ({ label: m.label, value: m.total }));
  }, [spendingExpenses]);

  const totalSpent = monthlySeries.reduce((sum, m) => sum + m.value, 0);
  const thisMonth = monthlySeries[monthlySeries.length - 1]?.value ?? 0;
  const lastMonth = monthlySeries[monthlySeries.length - 2]?.value ?? 0;
  const trendPct = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : null;

  const byCategory = useMemo(() => {
    const now = new Date();
    const thisMonthTotals = new Map<string, number>();
    const lastMonthTotals = new Map<string, number>();
    const thisKey = monthKey(now);
    const lastKey = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    for (const e of spendingExpenses) {
      const name = e.category_id ? categoryNameById.get(e.category_id) ?? "Other" : "Uncategorized";
      const key = monthKey(new Date(e.date));
      if (key === thisKey) thisMonthTotals.set(name, (thisMonthTotals.get(name) ?? 0) + parseFloat(e.cost));
      if (key === lastKey) lastMonthTotals.set(name, (lastMonthTotals.get(name) ?? 0) + parseFloat(e.cost));
    }
    const rows = Array.from(thisMonthTotals.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
    return { rows, thisMonthTotals, lastMonthTotals };
  }, [spendingExpenses, categoryNameById]);
  const maxCategory = Math.max(1, ...byCategory.rows.map((r) => r.amount));

  // Templated from real month-over-month category deltas -- no LLM call, no
  // fabricated text. Falls back to a neutral line when there's not enough
  // history to compare.
  const smartSummary = useMemo(() => {
    const topCategory = byCategory.rows[0];
    if (!topCategory) return "Add a few expenses to see spending insights here.";
    const last = byCategory.lastMonthTotals.get(topCategory.name) ?? 0;
    if (last === 0) return `You've spent ${formatMoney(topCategory.amount)} on ${topCategory.name} this month.`;
    const delta = ((topCategory.amount - last) / last) * 100;
    const direction = delta >= 0 ? "more" : "less";
    return `You spent ${Math.abs(delta).toFixed(0)}% ${direction} on ${topCategory.name} this month compared to last month.`;
  }, [byCategory]);

  const expenseCount = spendingExpenses.filter((e) => monthKey(new Date(e.date)) === monthKey(new Date())).length;
  const avgExpense = expenseCount > 0 ? thisMonth / expenseCount : 0;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{
        padding: spacing.containerMargin,
        paddingTop: insets.top + spacing.md,
        paddingBottom: TAB_BAR_CLEARANCE,
      }}
    >
      <Text style={[typography.displayLgMobile, { color: colors.primary, fontSize: 28, marginBottom: spacing.lg }]}>Insights</Text>

      <GlassCard style={{ padding: spacing.lg, marginBottom: spacing.lg }}>
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <View style={styles.summaryIcon}>
            <Icon name="auto_awesome" color={colors.primary} size={20} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.headlineMd, { color: colors.primary, fontSize: 16, marginBottom: spacing.xs }]}>Smart Summary</Text>
            <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant }]}>{smartSummary}</Text>
          </View>
        </View>
      </GlassCard>

      <GlassCard style={{ padding: spacing.lg, marginBottom: spacing.lg }}>
        <Text style={[typography.labelSm, { color: colors.onSurfaceVariant }]}>Spending Over Time</Text>
        <Text style={[typography.headlineMd, { color: colors.onSurface, marginTop: spacing.xs, marginBottom: spacing.md }]}>
          {formatMoney(totalSpent)}
          {trendPct !== null && (
            <Text style={[typography.labelSm, { color: trendPct >= 0 ? colors.tertiary : colors.secondary, textTransform: "none" }]}>
              {"  "}
              {trendPct >= 0 ? "+" : ""}
              {trendPct.toFixed(1)}%
            </Text>
          )}
        </Text>
        {isLoading ? (
          <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant }]}>Loading…</Text>
        ) : (
          <>
            <AreaChart points={monthlySeries} />
            <View style={styles.monthLabels}>
              {monthlySeries.map((m) => (
                <Text key={m.label} style={[typography.labelSm, { color: colors.onSurfaceVariant }]}>
                  {m.label}
                </Text>
              ))}
            </View>
          </>
        )}
      </GlassCard>

      <GlassCard style={{ padding: spacing.lg, marginBottom: spacing.lg }}>
        <View style={styles.statsRow}>
          <View style={styles.statCell}>
            <Text style={[typography.labelSm, { color: colors.onSurfaceVariant }]}>This Month</Text>
            <Text style={[typography.headlineMd, { color: colors.onSurface, fontSize: 18, marginTop: spacing.xs }]}>
              {formatMoney(thisMonth)}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statCell}>
            <Text style={[typography.labelSm, { color: colors.onSurfaceVariant }]}>Avg Expense</Text>
            <Text style={[typography.headlineMd, { color: colors.onSurface, fontSize: 18, marginTop: spacing.xs }]}>
              {formatMoney(avgExpense)}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statCell}>
            <Text style={[typography.labelSm, { color: colors.onSurfaceVariant }]}>Expenses</Text>
            <Text style={[typography.headlineMd, { color: colors.primary, fontSize: 18, marginTop: spacing.xs }]}>{expenseCount}</Text>
          </View>
        </View>
      </GlassCard>

      {byCategory.rows.length > 0 && (
        <GlassCard style={{ padding: spacing.lg }}>
          <Text style={[typography.labelSm, { color: colors.onSurfaceVariant, marginBottom: spacing.md }]}>By Category (this month)</Text>
          {byCategory.rows.map((row) => (
            <View key={row.name} style={{ marginBottom: spacing.sm }}>
              <View style={styles.rowBetween}>
                <Text style={[typography.bodyMd, { color: colors.onSurface }]}>{row.name}</Text>
                <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant }]}>{formatMoney(row.amount)}</Text>
              </View>
              <View style={{ marginTop: spacing.xs }}>
                <ProgressBar progress={row.amount / maxCategory} />
              </View>
            </View>
          ))}
        </GlassCard>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(192,193,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  monthLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.sm },
  statsRow: { flexDirection: "row", alignItems: "center" },
  statCell: { flex: 1, alignItems: "center" },
  divider: { width: 1, height: 40, backgroundColor: "rgba(255,255,255,0.1)" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between" },
});
