import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { expenses as expensesApi } from "../../api";
import type { Friend } from "../../api/types";
import { CURRENCY_CODE, RUPEE } from "../../lib/currency";
import { colors, radius, spacing } from "../../theme/tokens";
import { typography } from "../../theme/typography";

interface SettleUpFormProps {
  friend: Friend;
  onDone: () => void;
}

// Ported from web FriendsPage's SettleUpForm: direction toggle (I paid them /
// they paid me) + amount, defaulting to the current balance so a full
// settle-up is a single tap away.
export function SettleUpForm({ friend, onDone }: SettleUpFormProps) {
  const queryClient = useQueryClient();
  const primaryBalance = friend.balance[0];
  const owedByThem = primaryBalance ? parseFloat(primaryBalance.amount) > 0 : false;
  const [amount, setAmount] = useState(primaryBalance ? Math.abs(parseFloat(primaryBalance.amount)).toFixed(2) : "");
  const [iAmPaying, setIAmPaying] = useState(!owedByThem);

  const settle = useMutation({
    mutationFn: () =>
      expensesApi.settleUp({
        other_user_id: friend.id,
        amount,
        currency_code: CURRENCY_CODE,
        direction: iAmPaying ? "i_paid" : "they_paid",
      }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onDone();
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.directionRow}>
        <Pressable
          style={[styles.directionChip, iAmPaying && styles.directionChipActive]}
          onPress={() => setIAmPaying(true)}
        >
          <Text style={[typography.labelSm, { textTransform: "none", color: iAmPaying ? colors.onPrimaryContainer : colors.onSurfaceVariant }]}>
            I paid {friend.first_name}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.directionChip, !iAmPaying && styles.directionChipActive]}
          onPress={() => setIAmPaying(false)}
        >
          <Text style={[typography.labelSm, { textTransform: "none", color: !iAmPaying ? colors.onPrimaryContainer : colors.onSurfaceVariant }]}>
            {friend.first_name} paid me
          </Text>
        </Pressable>
      </View>
      <View style={styles.amountRow}>
        <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant }]}>{RUPEE}</Text>
        <TextInput
          style={styles.amountInput}
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholderTextColor={colors.outline}
        />
        <Pressable
          style={[styles.recordButton, (!amount || settle.isPending) && { opacity: 0.5 }]}
          onPress={() => settle.mutate()}
          disabled={!amount || settle.isPending}
        >
          <Text style={[typography.labelSm, { color: colors.onPrimary, textTransform: "none" }]}>
            {settle.isPending ? "Recording…" : "Record payment"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    gap: spacing.sm,
  },
  directionRow: { flexDirection: "row", gap: spacing.xs },
  directionChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerHigh,
  },
  directionChipActive: { backgroundColor: colors.primaryContainer },
  amountRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  amountInput: {
    width: 80,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.default,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    color: colors.onSurface,
    fontFamily: "Geist_400Regular",
  },
  recordButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
});
