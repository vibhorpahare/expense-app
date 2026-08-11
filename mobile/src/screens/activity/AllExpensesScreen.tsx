import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { expenses as expensesApi, groups as groupsApi, exportExpensesCsv } from "../../api";
import { useCategories } from "../../hooks/useCategories";
import type { ActivityStackParamList } from "../../navigation/types";
import { Icon } from "../../components/ui/Icon";
import { EmptyState } from "../../components/ui/EmptyState";
import { colors, radius, spacing, TAB_BAR_CLEARANCE } from "../../theme/tokens";
import { typography } from "../../theme/typography";
import { formatMoney } from "../../lib/currency";
import { formatDateTime } from "../../lib/datetime";

type Nav = NativeStackNavigationProp<ActivityStackParamList, "AllExpenses">;
type DateRange = "all" | "this_month" | "last_month";

function dateRangeToBounds(range: DateRange): { after?: string; before?: string } {
  const now = new Date();
  if (range === "this_month") return { after: new Date(now.getFullYear(), now.getMonth(), 1).toISOString() };
  if (range === "last_month") {
    return {
      after: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
      before: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
    };
  }
  return {};
}

const RANGE_LABELS: Record<DateRange, string> = { all: "All time", this_month: "This month", last_month: "Last month" };

export function AllExpensesScreen() {
  const navigation = useNavigation<Nav>();
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [groupId, setGroupId] = useState<string>("");
  const [limit, setLimit] = useState(20);

  const { data: groupsList = [] } = useQuery({ queryKey: ["groups"], queryFn: () => groupsApi.list() });
  const { flat: flatCategories } = useCategories();

  const bounds = dateRangeToBounds(dateRange);
  const { data: expenseList = [], isLoading } = useQuery({
    queryKey: ["all-expenses", dateRange, groupId, limit],
    queryFn: () =>
      expensesApi.list({
        group_id: groupId || undefined,
        dated_after: bounds.after,
        dated_before: bounds.before,
        limit,
      }),
  });

  const categoryLabel = (id: number | null) => (id ? flatCategories.find((c) => c.id === id)?.label ?? "—" : "Uncategorized");
  const groupName = (id: string | null) => (id ? groupsList.find((g) => g.id === id)?.name ?? "—" : "Non-group");

  return (
    <View style={styles.screen}>
      <FlatList
        data={expenseList}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ paddingBottom: TAB_BAR_CLEARANCE }}
        ListHeaderComponent={
          <>
            <View style={styles.filterHeader}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
                {(Object.keys(RANGE_LABELS) as DateRange[]).map((r) => {
                  const active = dateRange === r;
                  return (
                    <Text
                      key={r}
                      onPress={() => setDateRange(r)}
                      style={[
                        typography.labelSm,
                        styles.filterChip,
                        { textTransform: "none" },
                        active
                          ? { backgroundColor: colors.primaryContainer, color: colors.onPrimaryContainer }
                          : { backgroundColor: colors.surfaceContainerHigh, color: colors.onSurfaceVariant },
                      ]}
                    >
                      {RANGE_LABELS[r]}
                    </Text>
                  );
                })}
                <Text
                  onPress={() => setGroupId("")}
                  style={[
                    typography.labelSm,
                    styles.filterChip,
                    { textTransform: "none" },
                    !groupId
                      ? { backgroundColor: colors.primaryContainer, color: colors.onPrimaryContainer }
                      : { backgroundColor: colors.surfaceContainerHigh, color: colors.onSurfaceVariant },
                  ]}
                >
                  All groups
                </Text>
                {groupsList.map((g) => {
                  const active = groupId === g.id;
                  return (
                    <Text
                      key={g.id}
                      onPress={() => setGroupId(g.id)}
                      style={[
                        typography.labelSm,
                        styles.filterChip,
                        { textTransform: "none" },
                        active
                          ? { backgroundColor: colors.primaryContainer, color: colors.onPrimaryContainer }
                          : { backgroundColor: colors.surfaceContainerHigh, color: colors.onSurfaceVariant },
                      ]}
                    >
                      {g.name}
                    </Text>
                  );
                })}
              </ScrollView>
              <Pressable
                style={styles.exportButton}
                onPress={() => exportExpensesCsv({ group_id: groupId || undefined, dated_after: bounds.after, dated_before: bounds.before })}
              >
                <Icon name="share" size={16} color={colors.onSurfaceVariant} />
              </Pressable>
            </View>
          </>
        }
        renderItem={({ item: e }) => (
          <Pressable style={styles.row} onPress={() => navigation.navigate("ExpenseDetail", { expenseId: e.id })}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyMdMedium, { color: colors.onSurface }]} numberOfLines={1}>
                {e.description}
              </Text>
              <Text style={[typography.labelSm, { color: colors.onSurfaceVariant, textTransform: "none", marginTop: 2 }]}>
                {categoryLabel(e.category_id)} · {groupName(e.group_id)}
              </Text>
              <Text style={[typography.labelSm, { color: colors.onSurfaceVariant, textTransform: "none" }]}>
                {formatDateTime(e.date)}
              </Text>
            </View>
            <Text style={[typography.bodyMdMedium, { color: colors.onSurface }]}>{formatMoney(e.cost)}</Text>
          </Pressable>
        )}
        ListEmptyComponent={!isLoading ? <EmptyState icon="receipt_long" title="No expenses match these filters" /> : null}
        ListFooterComponent={
          expenseList.length >= limit ? (
            <Pressable style={styles.showMore} onPress={() => setLimit((l) => l + 20)}>
              <Text style={[typography.labelSm, { color: colors.primary, textTransform: "none" }]}>Show more</Text>
            </Pressable>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  filterHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.containerMargin,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  filterChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, overflow: "hidden" },
  exportButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
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
  showMore: { alignItems: "center", paddingVertical: spacing.md },
});
