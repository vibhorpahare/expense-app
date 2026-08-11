import { useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../../navigation/types";
import { comments as commentsApi, expenses as expensesApi } from "../../api";
import { useAuth } from "../../context/AuthContext";
import { Icon } from "../../components/ui/Icon";
import { ScreenSkeleton } from "../../components/ui/Skeletons";
import { colors, radius, spacing, TAB_BAR_CLEARANCE } from "../../theme/tokens";
import { typography } from "../../theme/typography";
import { formatMoney } from "../../lib/currency";
import { formatDateTime } from "../../lib/datetime";

type Props = NativeStackScreenProps<HomeStackParamList, "ExpenseDetail">;

export function ExpenseDetailScreen({ route, navigation }: Props) {
  const { expenseId } = route.params;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: expense, isLoading } = useQuery({ queryKey: ["expense", expenseId], queryFn: () => expensesApi.get(expenseId) });
  const { data: commentList = [] } = useQuery({ queryKey: ["comments", expenseId], queryFn: () => commentsApi.list(expenseId) });

  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [commentText, setCommentText] = useState("");
  const [error, setError] = useState("");

  const startEdit = () => {
    if (!expense) return;
    setDescription(expense.description);
    setCost(expense.cost);
    setEditing(true);
  };

  const invalidateExpense = () => {
    queryClient.invalidateQueries({ queryKey: ["expense", expenseId] });
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
    queryClient.invalidateQueries({ queryKey: ["group"] });
    queryClient.invalidateQueries({ queryKey: ["groups"] });
    queryClient.invalidateQueries({ queryKey: ["friend"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const save = useMutation({
    mutationFn: () => {
      if (!expense) throw new Error("not loaded");
      // Re-scale each share proportionally so paid/owed still sum to the new
      // cost -- a metadata edit (description/cost), not a re-split.
      const ratio = parseFloat(cost) / parseFloat(expense.cost || "1");
      const shares = expense.shares.map((s) => ({
        user_id: s.user.id,
        paid_share: (parseFloat(s.paid_share) * ratio).toFixed(2),
        owed_share: (parseFloat(s.owed_share) * ratio).toFixed(2),
      }));
      return expensesApi.update(expense.id, { description, cost, shares });
    },
    onSuccess: (res) => {
      if (res.data.errors && Object.keys(res.data.errors).length > 0) {
        setError(Object.values(res.data.errors).flat().join(", "));
        return;
      }
      setEditing(false);
      invalidateExpense();
    },
    onError: () => setError("Could not save changes"),
  });

  const remove = useMutation({
    mutationFn: () => expensesApi.remove(expense!.id),
    onSuccess: () => {
      invalidateExpense();
      navigation.goBack();
    },
  });

  const uploadReceipt = useMutation({
    mutationFn: async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, mediaTypes: ["images"] });
      if (result.canceled || !result.assets[0]) return;
      const picked = result.assets[0];
      return expensesApi.uploadReceipt(expense!.id, {
        uri: picked.uri,
        name: picked.fileName ?? "receipt.jpg",
        type: picked.mimeType ?? "image/jpeg",
      });
    },
    onSuccess: invalidateExpense,
  });

  const addComment = useMutation({
    mutationFn: () => commentsApi.create(expense!.id, commentText),
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["comments", expenseId] });
    },
  });

  const removeComment = useMutation({
    mutationFn: (id: string) => commentsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comments", expenseId] }),
  });

  const confirmDelete = () => {
    Alert.alert("Delete expense?", undefined, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove.mutate() },
    ]);
  };

  if (isLoading || !expense) {
    return (
      <View style={styles.screen}>
        <ScreenSkeleton />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.containerMargin, paddingBottom: TAB_BAR_CLEARANCE }}>
      <View style={styles.card}>
        {!!error && <Text style={[typography.bodyMd, { color: colors.error, marginBottom: spacing.sm }]}>{error}</Text>}

        {editing ? (
          <View style={{ gap: spacing.sm }}>
            <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholderTextColor={colors.outline} />
            <TextInput style={styles.input} value={cost} onChangeText={setCost} keyboardType="numeric" placeholderTextColor={colors.outline} />
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <Pressable style={styles.saveButton} onPress={() => save.mutate()} disabled={save.isPending}>
                <Text style={[typography.bodySemibold, { color: colors.onPrimary }]}>Save</Text>
              </Pressable>
              <Pressable style={styles.cancelButton} onPress={() => setEditing(false)}>
                <Text style={[typography.bodyMd, { color: colors.onSurface }]}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.headlineMd, { color: colors.onSurface }]}>{expense.description}</Text>
              <Text style={[typography.displayLgMobile, { color: colors.onSurface, fontSize: 28, marginTop: spacing.xs }]}>
                {formatMoney(expense.cost)}
              </Text>
              <Text style={[typography.labelSm, { color: colors.onSurfaceVariant, textTransform: "none", marginTop: spacing.xs }]}>
                {formatDateTime(expense.date)}
              </Text>
            </View>
            <View style={{ gap: spacing.xs }}>
              <Pressable style={styles.iconButton} onPress={startEdit}>
                <Icon name="edit" size={16} color={colors.onSurface} />
              </Pressable>
              <Pressable style={[styles.iconButton, { borderColor: colors.error }]} onPress={confirmDelete}>
                <Icon name="delete" size={16} color={colors.error} />
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.sharesRow}>
          {expense.shares.map((s) => {
            const positive = parseFloat(s.net_balance) >= 0;
            return (
              <View key={s.user.id} style={[styles.shareChip, { backgroundColor: positive ? "rgba(78,222,163,0.12)" : "rgba(255,178,183,0.12)" }]}>
                <Text style={[typography.labelSm, { textTransform: "none", color: positive ? colors.secondary : colors.tertiary }]}>
                  {s.user.first_name}: {positive ? "+" : ""}
                  {parseFloat(s.net_balance).toFixed(2)}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={{ marginTop: spacing.md }}>
          {expense.receipt_url ? (
            <Image source={{ uri: expense.receipt_url }} style={styles.receiptImage} resizeMode="cover" />
          ) : (
            <Pressable style={styles.attachButton} onPress={() => uploadReceipt.mutate()}>
              <Text style={[typography.labelSm, { color: colors.primary, textTransform: "none" }]}>Attach receipt</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={[typography.headlineMd, { color: colors.onSurface, fontSize: 18, marginBottom: spacing.md }]}>Comments</Text>
        {commentList.length === 0 && (
          <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant, marginBottom: spacing.md }]}>No comments yet.</Text>
        )}
        {commentList.map((c) => (
          <View key={c.id} style={styles.commentRow}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyMdMedium, { color: colors.onSurface }]}>
                {c.user?.first_name ?? "System"}{" "}
                <Text style={[typography.labelSm, { color: colors.onSurfaceVariant, textTransform: "none" }]}>
                  {new Date(c.created_at).toLocaleString()}
                </Text>
              </Text>
              <Text style={[typography.bodyMd, { color: colors.onSurface, marginTop: 2 }]}>{c.content}</Text>
            </View>
            {c.user?.id === user?.id && (
              <Pressable onPress={() => removeComment.mutate(c.id)}>
                <Icon name="delete" size={14} color={colors.onSurfaceVariant} />
              </Pressable>
            )}
          </View>
        ))}
        <View style={styles.commentInputRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={commentText}
            onChangeText={setCommentText}
            placeholder="Add a comment…"
            placeholderTextColor={colors.outline}
          />
          <Pressable
            style={[styles.postButton, (!commentText.trim() || addComment.isPending) && { opacity: 0.5 }]}
            onPress={() => addComment.mutate()}
            disabled={!commentText.trim() || addComment.isPending}
          >
            <Icon name="send" size={16} color={colors.onPrimary} />
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  card: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.default,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between" },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.default,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.onSurface,
    fontFamily: "Geist_400Regular",
    fontSize: 15,
  },
  saveButton: { backgroundColor: colors.primary, borderRadius: radius.full, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  cancelButton: { borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: radius.full, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  sharesRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.md },
  shareChip: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full },
  receiptImage: { width: "100%", height: 200, borderRadius: radius.default },
  attachButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  commentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.default,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  commentInputRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  postButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
