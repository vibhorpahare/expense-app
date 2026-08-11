import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { friends as friendsApi, expenses as expensesApi } from "../../api";
import type { Friend } from "../../api/types";
import type { GroupsStackParamList } from "../../navigation/types";
import { Avatar } from "../../components/ui/Avatar";
import { Icon } from "../../components/ui/Icon";
import { EmptyState } from "../../components/ui/EmptyState";
import { SettleUpForm } from "../../components/forms/SettleUpForm";
import { colors, radius, spacing, TAB_BAR_CLEARANCE } from "../../theme/tokens";
import { typography } from "../../theme/typography";
import { formatMoney } from "../../lib/currency";

type Nav = NativeStackNavigationProp<GroupsStackParamList, "Friends">;

function FriendRow({ friend }: { friend: Friend }) {
  const navigation = useNavigation<Nav>();
  const [expanded, setExpanded] = useState(false);
  const [showSettle, setShowSettle] = useState(false);

  const { data: detail } = useQuery({
    queryKey: ["friend", friend.id],
    queryFn: () => friendsApi.get(friend.id),
    enabled: expanded,
  });
  const { data: friendExpenses = [] } = useQuery({
    queryKey: ["friend-expenses", friend.id],
    queryFn: () => expensesApi.list({ friend_id: friend.id }),
    enabled: expanded,
  });

  return (
    <View style={styles.row}>
      <Pressable style={styles.rowHeader} onPress={() => setExpanded((v) => !v)}>
        <Avatar uri={friend.avatar_url} name={friend.first_name} size={44} />
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={[typography.bodySemibold, { color: colors.onSurface }]}>
            {friend.first_name} {friend.last_name}
          </Text>
          <Text style={[typography.labelSm, { color: colors.onSurfaceVariant, textTransform: "none" }]}>{friend.email}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          {friend.balance.length === 0 ? (
            <Text style={[typography.labelSm, { color: colors.onSurfaceVariant, textTransform: "none" }]}>settled up</Text>
          ) : (
            friend.balance.map((b) => (
              <Text
                key={b.currency_code}
                style={[typography.labelSm, { textTransform: "none", color: parseFloat(b.amount) >= 0 ? colors.secondary : colors.tertiary }]}
              >
                {parseFloat(b.amount) >= 0 ? "owes you " : "you owe "}
                {formatMoney(Math.abs(parseFloat(b.amount)))}
              </Text>
            ))
          )}
          <Icon name={expanded ? "expand_less" : "expand_more"} size={18} color={colors.onSurfaceVariant} />
        </View>
      </Pressable>

      <View style={styles.actionsRow}>
        <Pressable onPress={() => navigation.navigate("AddExpense", { friendId: friend.id })}>
          <Text style={[typography.labelSm, { color: colors.primary, textTransform: "none" }]}>Add expense</Text>
        </Pressable>
        <Pressable onPress={() => setShowSettle((v) => !v)}>
          <Text style={[typography.labelSm, { color: colors.primary, textTransform: "none" }]}>Settle up</Text>
        </Pressable>
      </View>

      {expanded && !!detail?.by_group && detail.by_group.length > 0 && (
        <View style={styles.expandedBlock}>
          {detail.by_group.map((g, i) => (
            <Text key={i} style={[typography.labelSm, { color: colors.onSurfaceVariant, textTransform: "none" }]}>
              {parseFloat(g.amount) >= 0 ? "owes you " : "you owe "}
              {formatMoney(Math.abs(parseFloat(g.amount)))} for "{g.group_name}"
            </Text>
          ))}
        </View>
      )}

      {expanded && friendExpenses.length > 0 && (
        <View style={styles.expandedBlock}>
          {friendExpenses.map((e) => (
            <Pressable
              key={e.id}
              style={styles.expenseRow}
              onPress={() => navigation.navigate("ExpenseDetail", { expenseId: e.id })}
            >
              <Text style={[typography.bodyMd, { color: colors.onSurface }]} numberOfLines={1}>
                {e.description}
              </Text>
              <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant }]}>{formatMoney(e.cost)}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {showSettle && <SettleUpForm friend={friend} onDone={() => setShowSettle(false)} />}
    </View>
  );
}

export function FriendsScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data: friendsList = [], isLoading } = useQuery({ queryKey: ["friends"], queryFn: friendsApi.list });
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const addFriend = useMutation({
    mutationFn: () => friendsApi.create(email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      setEmail("");
      setError("");
    },
    onError: () => setError("No user found with that email."),
  });

  return (
    <View style={styles.screen}>
      <FlatList
        data={friendsList}
        keyExtractor={(f) => f.id}
        contentContainerStyle={{ paddingBottom: TAB_BAR_CLEARANCE }}
        ListHeaderComponent={
          <>
            <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
              <Text style={[typography.displayLgMobile, { color: colors.primary, fontSize: 28 }]}>Friends</Text>
              <Pressable style={styles.groupsToggle} onPress={() => navigation.navigate("Groups")}>
                <Icon name="group" size={18} color={colors.onSurfaceVariant} />
                <Text style={[typography.labelSm, { color: colors.onSurfaceVariant, textTransform: "none" }]}>Groups</Text>
              </Pressable>
            </View>

            <View style={styles.addForm}>
              <TextInput
                style={styles.emailInput}
                value={email}
                onChangeText={setEmail}
                placeholder="Friend's email"
                placeholderTextColor={colors.outline}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Pressable
                style={[styles.addButton, (!email || addFriend.isPending) && { opacity: 0.5 }]}
                onPress={() => addFriend.mutate()}
                disabled={!email || addFriend.isPending}
              >
                <Icon name="person_add" size={18} color={colors.onPrimary} />
              </Pressable>
            </View>
            {!!error && (
              <Text style={[typography.bodyMd, { color: colors.error, paddingHorizontal: spacing.containerMargin, marginBottom: spacing.md }]}>
                {error}
              </Text>
            )}
          </>
        }
        renderItem={({ item }) => <FriendRow friend={item} />}
        ListEmptyComponent={
          !isLoading ? <EmptyState icon="person_add" title="No friends yet" subtitle="Add one by email to get started." /> : null
        }
      />
    </View>
  );
}

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
  groupsToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  addForm: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.containerMargin,
    marginBottom: spacing.lg,
  },
  emailInput: {
    flex: 1,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.default,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.onSurface,
    fontFamily: "Geist_400Regular",
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    marginHorizontal: spacing.containerMargin,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.default,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  rowHeader: { flexDirection: "row", alignItems: "center" },
  actionsRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm, justifyContent: "flex-end" },
  expandedBlock: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    gap: spacing.xs,
  },
  expenseRow: { flexDirection: "row", justifyContent: "space-between" },
});
