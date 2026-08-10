import { useMemo } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { dashboard, friends, expenses, groups } from "../../api";
import type { HomeStackParamList, AppTabParamList } from "../../navigation/types";
import { GlassCard } from "../../components/ui/GlassCard";
import { MeshBackground } from "../../components/ui/MeshBackground";
import { Avatar } from "../../components/ui/Avatar";
import { Icon } from "../../components/ui/Icon";
import { colors, radius, spacing } from "../../theme/tokens";
import { typography } from "../../theme/typography";
import { formatMoney } from "../../lib/currency";
import { formatDateTime } from "../../lib/datetime";

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<HomeStackParamList, "Dashboard">,
  BottomTabNavigationProp<AppTabParamList>
>;

export function DashboardScreen() {
  const navigation = useNavigation<Nav>();

  const summaryQuery = useQuery({ queryKey: ["dashboard"], queryFn: dashboard.summary });
  const friendsQuery = useQuery({ queryKey: ["friends"], queryFn: friends.list });
  const expensesQuery = useQuery({ queryKey: ["expenses", "recent"], queryFn: () => expenses.list({ limit: 100 }) });
  const groupsQuery = useQuery({ queryKey: ["groups"], queryFn: () => groups.list() });

  const summary = summaryQuery.data;
  const recentExpenses = expensesQuery.data ?? [];
  const friendsWithBalance = (friendsQuery.data ?? []).filter((f) => f.balance.length > 0).slice(0, 3);

  const totalBalanceAmount = summary?.total_balance[0]?.amount ?? "0";

  // Real month-over-month delta from the same 6-month bucketing the web
  // dashboard's chart uses -- not a fabricated number.
  const monthlyTrend = useMemo(() => {
    const now = new Date();
    const thisMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthKey = `${prevDate.getFullYear()}-${prevDate.getMonth()}`;
    let thisMonth = 0;
    let prevMonth = 0;
    for (const e of recentExpenses) {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (key === thisMonthKey) thisMonth += parseFloat(e.cost);
      else if (key === prevMonthKey) prevMonth += parseFloat(e.cost);
    }
    if (prevMonth === 0) return null;
    return ((thisMonth - prevMonth) / prevMonth) * 100;
  }, [recentExpenses]);

  const refreshing = summaryQuery.isRefetching || friendsQuery.isRefetching || expensesQuery.isRefetching;
  const onRefresh = () => {
    summaryQuery.refetch();
    friendsQuery.refetch();
    expensesQuery.refetch();
    groupsQuery.refetch();
  };

  return (
    <View style={styles.screen}>
      <FlatList
        data={recentExpenses.slice(0, 5)}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 140 }}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                <Text style={[typography.displayLgMobile, { color: colors.primary, fontSize: 24 }]}>Splitly</Text>
              </View>
              <Pressable
                style={styles.bellButton}
                onPress={() => navigation.navigate("ActivityTab", { screen: "Notifications" })}
              >
                <Icon name="notifications" color={colors.primary} />
              </Pressable>
            </View>

            <GlassCard style={styles.heroCard} radiusVariant="lg">
              <View style={{ overflow: "hidden", borderRadius: radius.lg }}>
                <MeshBackground />
                <View style={{ padding: spacing.lg }}>
                  <Text style={[typography.labelSm, { color: colors.onSurfaceVariant }]}>Total Balance</Text>
                  <Text style={[typography.displayLgMobile, { color: colors.onSurface, marginTop: spacing.xs, marginBottom: spacing.lg }]}>
                    {formatMoney(totalBalanceAmount)}
                  </Text>
                  <View style={{ flexDirection: "row", gap: spacing.md }}>
                    <View style={styles.miniStat}>
                      <Text style={[typography.labelSm, { color: colors.secondary }]}>You are owed</Text>
                      <Text style={[typography.headlineMd, { color: colors.onSurface, marginTop: spacing.xs }]}>
                        {formatMoney(summary?.you_are_owed[0]?.amount ?? "0")}
                      </Text>
                    </View>
                    <View style={styles.miniStat}>
                      <Text style={[typography.labelSm, { color: colors.tertiary }]}>You owe</Text>
                      <Text style={[typography.headlineMd, { color: colors.onSurface, marginTop: spacing.xs }]}>
                        {formatMoney(summary?.you_owe[0]?.amount ?? "0")}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </GlassCard>

            <View style={styles.quickActions}>
              <Pressable
                style={styles.primaryAction}
                onPress={() => navigation.navigate("AddExpense", undefined)}
              >
                <Icon name="add_circle" color={colors.onPrimary} size={22} />
                <Text style={[typography.labelSm, { color: colors.onPrimary, textTransform: "none" }]}>Add Expense</Text>
              </Pressable>
              <Pressable
                style={styles.glassAction}
                onPress={() => navigation.navigate("GroupsTab", { screen: "Friends" })}
              >
                <Icon name="payments" color={colors.onSurface} size={22} />
                <Text style={[typography.labelSm, { color: colors.onSurface, textTransform: "none" }]}>Settle Up</Text>
              </Pressable>
              <Pressable
                style={styles.glassAction}
                onPress={() => navigation.navigate("AddExpense", undefined)}
              >
                <Icon name="document_scanner" color={colors.onSurface} size={22} />
                <Text style={[typography.labelSm, { color: colors.onSurface, textTransform: "none" }]}>Scan Receipt</Text>
              </Pressable>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={[typography.headlineMd, { color: colors.onSurface, fontSize: 20 }]}>Recent Activity</Text>
              <Pressable onPress={() => navigation.navigate("ActivityTab", { screen: "AllExpenses" })}>
                <Text style={[typography.labelSm, { color: colors.primary, textTransform: "none" }]}>View all</Text>
              </Pressable>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.activityRow}
            onPress={() => navigation.navigate("ExpenseDetail", { expenseId: item.id })}
          >
            <View style={styles.activityIcon}>
              <Icon name={item.payment ? "payments" : "receipt_long"} color={colors.onSurfaceVariant} size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyMdMedium, { color: colors.onSurface }]} numberOfLines={1}>
                {item.description}
              </Text>
              <Text style={[typography.labelSm, { color: colors.onSurfaceVariant, textTransform: "none", marginTop: 2 }]}>
                {formatDateTime(item.date)}
              </Text>
            </View>
            <Text style={[typography.bodyMdMedium, { color: colors.onSurface }]}>{formatMoney(item.cost)}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          !expensesQuery.isLoading ? (
            <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant, paddingHorizontal: spacing.containerMargin }]}>
              No activity yet.
            </Text>
          ) : null
        }
        ListFooterComponent={
          <>
          <View style={styles.bentoRow}>
            <GlassCard style={styles.bentoCard}>
              <View style={{ padding: spacing.md, justifyContent: "space-between", height: 128 }}>
                <Icon name="trending_up" color={colors.primary} size={28} />
                <View>
                  <Text style={[typography.labelSm, { color: colors.onSurfaceVariant, fontSize: 10 }]}>Monthly Trend</Text>
                  <Text style={[typography.bodySemibold, { color: colors.onSurface }]}>
                    {monthlyTrend === null ? "—" : `${monthlyTrend >= 0 ? "+" : ""}${monthlyTrend.toFixed(1)}%`}
                  </Text>
                </View>
              </View>
            </GlassCard>
            <GlassCard style={styles.bentoCard}>
              <View style={{ padding: spacing.md, justifyContent: "space-between", height: 128 }}>
                <Icon name="group_add" color={colors.secondary} size={28} />
                <View>
                  <Text style={[typography.labelSm, { color: colors.onSurfaceVariant, fontSize: 10 }]}>Active Groups</Text>
                  <Text style={[typography.bodySemibold, { color: colors.onSurface }]}>
                    {groupsQuery.data?.length ?? 0} Groups
                  </Text>
                </View>
              </View>
            </GlassCard>
            </View>

            <View style={{ marginTop: spacing.xl, paddingHorizontal: spacing.containerMargin }}>
              <View style={styles.sectionHeader}>
                <Text style={[typography.headlineMd, { color: colors.onSurface, fontSize: 20 }]}>Quick Settle</Text>
                <Pressable onPress={() => navigation.navigate("GroupsTab", { screen: "Friends" })}>
                  <Text style={[typography.labelSm, { color: colors.primary, textTransform: "none" }]}>View all</Text>
                </Pressable>
              </View>
              {friendsWithBalance.length === 0 ? (
                <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant }]}>Everyone is settled up.</Text>
              ) : (
                friendsWithBalance.map((f) => {
                  const balance = f.balance[0];
                  const owesYou = balance ? parseFloat(balance.amount) >= 0 : false;
                  return (
                    <Pressable
                      key={f.id}
                      style={styles.quickSettleRow}
                      onPress={() => navigation.navigate("GroupsTab", { screen: "Friends" })}
                    >
                      <Avatar uri={f.avatar_url} name={`${f.first_name} ${f.last_name ?? ""}`} size={36} />
                      <Text style={[typography.bodyMd, { color: colors.onSurface, flex: 1, marginLeft: spacing.sm }]}>
                        {f.first_name}
                      </Text>
                      {balance && (
                        <Text style={[typography.bodyMdMedium, { color: owesYou ? colors.secondary : colors.tertiary }]}>
                          {owesYou ? "owes " : "you owe "}
                          {formatMoney(Math.abs(parseFloat(balance.amount)))}
                        </Text>
                      )}
                    </Pressable>
                  );
                })
              )}
            </View>
          </>
        }
      />
    </View>
  );
}

const CARD_GAP = spacing.md;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.containerMargin,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCard: {
    marginHorizontal: spacing.containerMargin,
    marginBottom: spacing.xl,
  },
  miniStat: {
    flex: 1,
    backgroundColor: "rgba(32,31,34,0.4)",
    borderRadius: radius.default,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  quickActions: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.containerMargin,
    marginBottom: spacing.xl,
  },
  primaryAction: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.default,
    paddingVertical: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 4 },
  },
  glassAction: {
    flex: 1,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.default,
    paddingVertical: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: spacing.containerMargin,
    marginBottom: spacing.md,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginHorizontal: spacing.containerMargin,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.default,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  bentoRow: {
    flexDirection: "row",
    gap: CARD_GAP,
    paddingHorizontal: spacing.containerMargin,
    marginTop: spacing.lg,
  },
  bentoCard: { flex: 1 },
  quickSettleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
});
