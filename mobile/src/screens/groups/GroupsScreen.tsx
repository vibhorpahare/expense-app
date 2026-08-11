import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { groups as groupsApi, friends as friendsApi } from "../../api";
import type { Friend } from "../../api/types";
import type { GroupsStackParamList } from "../../navigation/types";
import { useAuth } from "../../context/AuthContext";
import { Avatar } from "../../components/ui/Avatar";
import { Icon } from "../../components/ui/Icon";
import { EmptyState } from "../../components/ui/EmptyState";
import { colors, radius, spacing, TAB_BAR_CLEARANCE } from "../../theme/tokens";
import { typography } from "../../theme/typography";
import { formatMoney } from "../../lib/currency";

type Nav = NativeStackNavigationProp<GroupsStackParamList, "Groups">;

export function GroupsScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: groupsList = [], isLoading } = useQuery({ queryKey: ["groups"], queryFn: () => groupsApi.list() });
  const { data: friendsList = [] } = useQuery({ queryKey: ["friends"], queryFn: friendsApi.list });

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Friend[]>([]);
  const [error, setError] = useState("");

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return friendsList.filter(
      (f) =>
        !selected.some((s) => s.id === f.id) &&
        (`${f.first_name} ${f.last_name ?? ""}`.toLowerCase().includes(q) || f.email.toLowerCase().includes(q)),
    );
  }, [query, friendsList, selected]);

  const createGroup = useMutation({
    mutationFn: () => groupsApi.create({ name, group_type: "other", member_emails: selected.map((f) => f.email) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      setShowCreate(false);
      setName("");
      setQuery("");
      setSelected([]);
      setError("");
    },
    onError: () => setError("Could not create group."),
  });

  return (
    <View style={styles.screen}>
      <FlatList
        data={groupsList}
        keyExtractor={(g) => g.id}
        contentContainerStyle={{ paddingBottom: TAB_BAR_CLEARANCE }}
        ListHeaderComponent={
          <>
            <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
              <Text style={[typography.displayLgMobile, { color: colors.primary, fontSize: 28 }]}>Groups</Text>
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                <Pressable
                  style={styles.friendsToggle}
                  onPress={() => navigation.navigate("Friends")}
                >
                  <Icon name="person" size={18} color={colors.onSurfaceVariant} />
                  <Text style={[typography.labelSm, { color: colors.onSurfaceVariant, textTransform: "none" }]}>Friends</Text>
                </Pressable>
                <Pressable style={styles.newButton} onPress={() => setShowCreate((v) => !v)}>
                  <Icon name="group_add" size={20} color={colors.onPrimary} />
                </Pressable>
              </View>
            </View>

            {showCreate && (
              <View style={styles.createCard}>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Group name"
                  placeholderTextColor={colors.outline}
                />
                {selected.length > 0 && (
                  <View style={styles.chipRow}>
                    {selected.map((f) => (
                      <Pressable
                        key={f.id}
                        style={styles.chip}
                        onPress={() => setSelected((s) => s.filter((x) => x.id !== f.id))}
                      >
                        <Text style={[typography.labelSm, { color: colors.onPrimaryContainer, textTransform: "none" }]}>
                          {f.first_name} ✕
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
                <TextInput
                  style={styles.input}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Add from your friends"
                  placeholderTextColor={colors.outline}
                />
                {suggestions.map((f) => (
                  <Pressable
                    key={f.id}
                    style={styles.suggestionRow}
                    onPress={() => {
                      setSelected((s) => [...s, f]);
                      setQuery("");
                    }}
                  >
                    <Text style={[typography.bodyMd, { color: colors.onSurface }]}>
                      {f.first_name} {f.last_name} <Text style={{ color: colors.onSurfaceVariant }}>{f.email}</Text>
                    </Text>
                  </Pressable>
                ))}
                {!!error && <Text style={[typography.bodyMd, { color: colors.error }]}>{error}</Text>}
                <Pressable
                  style={[styles.createButton, (!name || createGroup.isPending) && { opacity: 0.5 }]}
                  onPress={() => createGroup.mutate()}
                  disabled={!name || createGroup.isPending}
                >
                  <Text style={[typography.bodySemibold, { color: colors.onPrimary }]}>Create</Text>
                </Pressable>
              </View>
            )}
          </>
        }
        renderItem={({ item: g }) => {
          const mine = g.members.find((m) => m.id === user?.id)?.balance ?? [];
          return (
            <Pressable style={styles.row} onPress={() => navigation.navigate("GroupDetail", { groupId: g.id })}>
              <Avatar uri={g.avatar_url} name={g.name} size={44} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[typography.bodySemibold, { color: colors.onSurface }]}>{g.name}</Text>
                <Text style={[typography.labelSm, { color: colors.onSurfaceVariant, textTransform: "none" }]}>
                  {g.members.length} members
                </Text>
              </View>
              {mine.length === 0 ? (
                <Text style={[typography.labelSm, { color: colors.onSurfaceVariant, textTransform: "none" }]}>settled up</Text>
              ) : (
                mine.map((b) => (
                  <Text
                    key={b.currency_code}
                    style={[typography.labelSm, { textTransform: "none", color: parseFloat(b.amount) >= 0 ? colors.secondary : colors.tertiary }]}
                  >
                    {parseFloat(b.amount) >= 0 ? "owed " : "owe "}
                    {formatMoney(Math.abs(parseFloat(b.amount)))}
                  </Text>
                ))
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          !isLoading ? <EmptyState icon="group" title="No groups yet" subtitle="Create one to start splitting expenses." /> : null
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
  friendsToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  newButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  createCard: {
    marginHorizontal: spacing.containerMargin,
    marginBottom: spacing.lg,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.default,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  input: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.default,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.onSurface,
    fontFamily: "Geist_400Regular",
    fontSize: 14,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: { backgroundColor: colors.primaryContainer, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  suggestionRow: { paddingVertical: spacing.xs },
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    alignItems: "center",
    marginTop: spacing.xs,
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
});
