import { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { GroupsStackParamList } from "../../navigation/types";
import { groups as groupsApi, expenses as expensesApi, exportExpensesCsv } from "../../api";
import { useCategories } from "../../hooks/useCategories";
import { GlassCard } from "../../components/ui/GlassCard";
import { MeshBackground } from "../../components/ui/MeshBackground";
import { Avatar } from "../../components/ui/Avatar";
import { Icon } from "../../components/ui/Icon";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { EmptyState } from "../../components/ui/EmptyState";
import { ScreenSkeleton } from "../../components/ui/Skeletons";
import { colors, radius, spacing } from "../../theme/tokens";
import { typography } from "../../theme/typography";
import { formatMoney, sumByCurrency } from "../../lib/currency";
import { formatDateTime } from "../../lib/datetime";

type Props = CompositeScreenProps<
  NativeStackScreenProps<GroupsStackParamList, "GroupDetail">,
  NativeStackScreenProps<GroupsStackParamList>
>;

export function GroupDetailScreen({ route, navigation }: Props) {
  const { groupId } = route.params;
  const queryClient = useQueryClient();

  const { data: group, isLoading } = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => groupsApi.get(groupId),
  });
  const { data: expenseList = [], isLoading: expensesLoading } = useQuery({
    queryKey: ["expenses", groupId],
    queryFn: () => expensesApi.list({ group_id: groupId }),
  });
  const { flat: flatCategories } = useCategories();
  const categoryNameById = useMemo(() => new Map(flatCategories.map((c) => [c.id, c.label.split(" / ").pop()!])), [flatCategories]);

  const settleDebt = useMutation({
    mutationFn: (debt: { from: string; to: string; amount: string; currency_code: string }) =>
      groupsApi.settleDebt(groupId, { from_user_id: debt.from, to_user_id: debt.to, amount: debt.amount, currency_code: debt.currency_code }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      queryClient.invalidateQueries({ queryKey: ["expenses", groupId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const totalSpentByCurrency = useMemo(
    () => sumByCurrency(expenseList.filter((e) => !e.payment), (e) => parseFloat(e.cost), (e) => e.currency_code),
    [expenseList],
  );

  const byCategory = useMemo(() => {
    const totals = new Map<string, number>();
    for (const e of expenseList) {
      if (e.payment) continue;
      const name = e.category_id ? categoryNameById.get(e.category_id) ?? "Other" : "Uncategorized";
      totals.set(name, (totals.get(name) ?? 0) + parseFloat(e.cost));
    }
    return Array.from(totals.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [expenseList, categoryNameById]);
  const maxCategory = Math.max(1, ...byCategory.map((r) => r.amount));

  if (isLoading || !group) {
    return (
      <View style={styles.screen}>
        <ScreenSkeleton />
      </View>
    );
  }

  const debts = group.simplify_by_default ? group.simplified_debts : group.original_debts;
  const memberName = (id: string) => group.members.find((m) => m.id === id)?.first_name ?? "?";

  return (
    <View style={styles.screen}>
      <FlatList
        data={expenseList}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        ListHeaderComponent={
          <>
            <View style={styles.hero}>
              <MeshBackground seed={groupId.length} />
              <View style={{ padding: spacing.lg }}>
                <Text style={[typography.labelSm, { color: "rgba(255,255,255,0.7)" }]}>{group.group_type}</Text>
                <Text style={[typography.displayLgMobile, { color: colors.onSurface, marginTop: spacing.xs }]}>{group.name}</Text>
                <Text style={[typography.bodyMd, { color: "rgba(255,255,255,0.8)", marginTop: spacing.xs }]}>
                  {group.members.length} participants
                  {group.archived_at ? "  ·  Archived" : ""}
                </Text>
                <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
                  <Pressable style={styles.heroButton} onPress={() => exportExpensesCsv({ group_id: groupId })}>
                    <Icon name="share" size={16} color={colors.onSurface} />
                    <Text style={[typography.labelSm, { color: colors.onSurface, textTransform: "none" }]}>Export</Text>
                  </Pressable>
                  <Pressable style={styles.heroButton} onPress={() => navigation.navigate("GroupSettings", { groupId })}>
                    <Icon name="settings" size={16} color={colors.onSurface} />
                    <Text style={[typography.labelSm, { color: colors.onSurface, textTransform: "none" }]}>Settings</Text>
                  </Pressable>
                  <Pressable
                    style={styles.heroButtonPrimary}
                    onPress={() => navigation.navigate("AddExpense", { groupId })}
                  >
                    <Icon name="add" size={16} color={colors.onPrimary} />
                    <Text style={[typography.labelSm, { color: colors.onPrimary, textTransform: "none" }]}>Add expense</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <GlassCard style={{ padding: spacing.lg }}>
                <Text style={[typography.labelSm, { color: colors.onSurfaceVariant }]}>Total spent</Text>
                {totalSpentByCurrency.size === 0 ? (
                  <Text style={[typography.headlineMd, { color: colors.onSurface, marginTop: spacing.xs }]}>₹0.00</Text>
                ) : (
                  Array.from(totalSpentByCurrency.entries()).map(([, amount]) => (
                    <Text key={amount} style={[typography.headlineMd, { color: colors.onSurface, marginTop: spacing.xs }]}>
                      {formatMoney(amount)}
                    </Text>
                  ))
                )}
              </GlassCard>
            </View>

            <View style={styles.section}>
              <GlassCard style={{ padding: spacing.lg }}>
                <View style={styles.rowBetween}>
                  <Text style={[typography.labelSm, { color: colors.onSurfaceVariant }]}>
                    {group.simplify_by_default ? "Simplified debts" : "Debts"}
                  </Text>
                </View>
                {debts.length === 0 ? (
                  <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant, marginTop: spacing.sm }]}>
                    Everyone is settled up.
                  </Text>
                ) : (
                  debts.map((d, i) => (
                    <View key={i} style={styles.debtRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[typography.bodyMd, { color: colors.onSurface }]}>
                          {memberName(d.from)} owes {memberName(d.to ?? "")}
                        </Text>
                        <Text style={[typography.labelSm, { color: colors.onSurfaceVariant, textTransform: "none" }]}>
                          {formatMoney(d.amount)}
                        </Text>
                      </View>
                      <Pressable
                        style={styles.settleButton}
                        disabled={settleDebt.isPending}
                        onPress={() => d.to && settleDebt.mutate({ from: d.from, to: d.to, amount: d.amount, currency_code: d.currency_code })}
                      >
                        <Text style={[typography.labelSm, { color: colors.primary, textTransform: "none" }]}>Settle</Text>
                      </Pressable>
                    </View>
                  ))
                )}
              </GlassCard>
            </View>

            {byCategory.length > 0 && (
              <View style={styles.section}>
                <GlassCard style={{ padding: spacing.lg }}>
                  <Text style={[typography.labelSm, { color: colors.onSurfaceVariant, marginBottom: spacing.md }]}>
                    Spending by category
                  </Text>
                  {byCategory.map((row) => (
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
              </View>
            )}

            <View style={styles.section}>
              <GlassCard style={{ padding: spacing.lg }}>
                <Text style={[typography.labelSm, { color: colors.onSurfaceVariant, marginBottom: spacing.md }]}>Members</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                  {group.members.map((m) => (
                    <View key={m.id} style={styles.memberChip}>
                      <Avatar uri={m.avatar_url} name={m.first_name} size={20} />
                      <Text style={[typography.labelSm, { color: colors.onSurface, textTransform: "none" }]}>{m.first_name}</Text>
                    </View>
                  ))}
                </View>
              </GlassCard>
            </View>

            <View style={[styles.section, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
              <Text style={[typography.headlineMd, { color: colors.onSurface, fontSize: 18 }]}>Expenses</Text>
            </View>
          </>
        }
        renderItem={({ item: e }) => (
          <Pressable style={styles.expenseRow} onPress={() => navigation.navigate("ExpenseDetail", { expenseId: e.id })}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyMdMedium, { color: colors.onSurface }]}>{e.description}</Text>
              <Text style={[typography.labelSm, { color: colors.onSurfaceVariant, textTransform: "none", marginTop: 2 }]}>
                {formatDateTime(e.date)}
              </Text>
            </View>
            <Text style={[typography.bodyMdMedium, { color: colors.onSurface }]}>{formatMoney(e.cost)}</Text>
          </Pressable>
        )}
        ListEmptyComponent={!expensesLoading ? <EmptyState icon="receipt_long" title="No expenses yet" /> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  hero: { overflow: "hidden" },
  heroButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  heroButtonPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginLeft: "auto",
  },
  section: { paddingHorizontal: spacing.containerMargin, marginBottom: spacing.md },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  debtRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
    marginTop: spacing.sm,
  },
  settleButton: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  memberChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  expenseRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.containerMargin,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.default,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
});
