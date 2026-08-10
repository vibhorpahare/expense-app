import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import DateTimePicker from "@react-native-community/datetimepicker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../../navigation/types";
import { useAuth } from "../../context/AuthContext";
import { useCategories } from "../../hooks/useCategories";
import { friends as friendsApi, expenses as expensesApi } from "../../api";
import type { UploadAsset } from "../../api";
import { splitEqually, splitExact, splitByPercent, splitByShareCount, splitByAdjustment, type SplitMode } from "../../lib/splits";
import { validateSplit } from "../../lib/splitValidation";
import { CURRENCY_CODE, RUPEE } from "../../lib/currency";
import { dateAtCurrentTime } from "../../lib/datetime";
import { Keypad } from "../../components/ui/Keypad";
import { Icon } from "../../components/ui/Icon";
import { FriendPicker } from "../../components/forms/FriendPicker";
import { CategoryPicker } from "../../components/forms/CategoryPicker";
import { SplitModeTabs } from "../../components/forms/SplitModeTabs";
import { colors, radius, spacing } from "../../theme/tokens";
import { typography } from "../../theme/typography";

type Props = NativeStackScreenProps<HomeStackParamList, "AddExpense">;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function AddExpenseScreen({ route, navigation }: Props) {
  const { groupId, friendId } = route.params ?? {};
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: friendsList = [] } = useQuery({ queryKey: ["friends"], queryFn: friendsApi.list });
  const { flat: flatCategories } = useCategories();

  const [participantIds, setParticipantIds] = useState<string[]>(
    Array.from(new Set([user!.id, ...(friendId ? [friendId] : [])])),
  );
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("0");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [date, setDate] = useState(todayIso());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [payerId, setPayerId] = useState(user!.id);
  const [mode, setMode] = useState<SplitMode>("equally");
  const [perPerson, setPerPerson] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [receiptAsset, setReceiptAsset] = useState<UploadAsset | null>(null);
  const [extracting, setExtracting] = useState(false);

  const friendById = useMemo(() => new Map(friendsList.map((f) => [f.id, f])), [friendsList]);
  const nameOf = (id: string) => (id === user!.id ? "You" : friendById.get(id)?.first_name ?? "?");

  const setParticipants = (ids: string[]) => {
    setParticipantIds(ids);
    if (!ids.includes(payerId)) setPayerId(ids[0]);
  };

  const handleReceipt = async (fromCamera: boolean) => {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, mediaTypes: ["images"] });
    if (result.canceled || !result.assets[0]) return;

    const picked = result.assets[0];
    const asset: UploadAsset = {
      uri: picked.uri,
      name: picked.fileName ?? "receipt.jpg",
      type: picked.mimeType ?? "image/jpeg",
    };
    setReceiptAsset(asset);
    setExtracting(true);
    try {
      const extracted = await expensesApi.extractReceipt(asset);
      if (extracted.available) {
        if (extracted.title && !description) setDescription(extracted.title);
        if (extracted.amount != null) setCost(String(extracted.amount));
        if (extracted.date) setDate(extracted.date.slice(0, 10));
      }
    } catch {
      // OCR is a convenience prefill -- silently ignore failures.
    } finally {
      setExtracting(false);
    }
  };

  const validation = validateSplit(mode, perPerson, cost, participantIds);

  const create = useMutation({
    mutationFn: () => {
      let shares;
      try {
        switch (mode) {
          case "exact":
            shares = splitExact(cost, payerId, perPerson);
            break;
          case "percent":
            shares = splitByPercent(cost, payerId, perPerson);
            break;
          case "shares":
            shares = splitByShareCount(cost, payerId, perPerson);
            break;
          case "adjustment":
            shares = splitByAdjustment(cost, payerId, perPerson);
            break;
          default:
            shares = splitEqually(cost, payerId, participantIds);
        }
      } catch {
        throw new Error("Invalid split values");
      }
      return expensesApi.create({
        description,
        cost,
        currency_code: CURRENCY_CODE,
        category_id: categoryId,
        date: dateAtCurrentTime(date),
        group_id: groupId,
        shares,
      });
    },
    onSuccess: async (res) => {
      if (res.data.errors && Object.keys(res.data.errors).length > 0) {
        setError(Object.values(res.data.errors).flat().join(", "));
        return;
      }
      const created = res.data.expenses[0];
      if (receiptAsset && created) {
        try {
          await expensesApi.uploadReceipt(created.id, receiptAsset);
        } catch {
          // Expense is already saved; a failed receipt attach shouldn't block the flow.
        }
      }
      ["groups", "group", "friends", "friend", "friend-expenses", "expenses", "dashboard"].forEach((key) =>
        queryClient.invalidateQueries({ queryKey: [key] }),
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    },
    onError: (e: Error) => setError(e.message || "Could not save expense"),
  });

  const canSave = !!description && validation.ok && !create.isPending;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
        <View style={styles.amountSection}>
          <View style={styles.amountRow}>
            <Text style={[typography.displayLgMobile, { color: colors.primary, opacity: 0.5 }]}>{RUPEE}</Text>
            <Text style={[typography.displayLgMobile, { color: colors.onSurface }]}>{cost}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
            <Pressable style={styles.scanButton} onPress={() => handleReceipt(true)}>
              <Icon name="photo_camera" size={18} color={colors.secondary} />
              <Text style={[typography.labelSm, { color: colors.secondary, textTransform: "none" }]}>
                {extracting ? "Reading receipt…" : "Smart Scan Receipt"}
              </Text>
            </Pressable>
            <Pressable style={styles.scanButton} onPress={() => handleReceipt(false)}>
              <Icon name="photo_library" size={18} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>
        </View>

        {!!error && (
          <Text style={[typography.bodyMd, { color: colors.error, paddingHorizontal: spacing.containerMargin, marginBottom: spacing.md }]}>
            {error}
          </Text>
        )}

        <View style={styles.section}>
          <TextInput
            style={styles.descriptionInput}
            value={description}
            onChangeText={setDescription}
            placeholder="What was it for?"
            placeholderTextColor={colors.onSurfaceVariant}
          />
        </View>

        <View style={[styles.section, { flexDirection: "row", gap: spacing.sm }]}>
          <Pressable style={styles.dateChip} onPress={() => setShowDatePicker(true)}>
            <Icon name="calendar_today" size={16} color={colors.onSurfaceVariant} />
            <Text style={[typography.labelSm, { color: colors.onSurfaceVariant, textTransform: "none" }]}>{date}</Text>
          </Pressable>
        </View>
        {showDatePicker && (
          <DateTimePicker
            value={new Date(`${date}T00:00:00`)}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            onChange={(_, selected) => {
              setShowDatePicker(Platform.OS === "ios");
              if (selected) setDate(selected.toISOString().slice(0, 10));
            }}
          />
        )}

        <View style={styles.section}>
          <Text style={styles.label}>Category</Text>
          <CategoryPicker categories={flatCategories} selectedId={categoryId} onChange={setCategoryId} />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={[typography.headlineMd, { color: colors.onSurface, fontSize: 18 }]}>Split with</Text>
          </View>
          <FriendPicker
            friends={friendsList}
            participantIds={participantIds}
            onChange={setParticipants}
            currentUserId={user!.id}
            currentUserName="You"
          />

          <Text style={[styles.label, { marginTop: spacing.md }]}>Paid by</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
            {participantIds.map((uid) => {
              const active = payerId === uid;
              return (
                <Text
                  key={uid}
                  onPress={() => setPayerId(uid)}
                  style={[
                    typography.labelSm,
                    styles.payerChip,
                    { textTransform: "none" },
                    active
                      ? { backgroundColor: colors.primaryContainer, color: colors.onPrimaryContainer }
                      : { backgroundColor: colors.surfaceContainerHigh, color: colors.onSurfaceVariant },
                  ]}
                >
                  {nameOf(uid)}
                </Text>
              );
            })}
          </ScrollView>

          <Text style={[styles.label, { marginTop: spacing.md }]}>Split</Text>
          <SplitModeTabs
            mode={mode}
            onModeChange={setMode}
            perPerson={perPerson}
            onPerPersonChange={setPerPerson}
            cost={cost}
            participantIds={participantIds}
            nameOf={nameOf}
          />
        </View>
      </ScrollView>

      <View style={styles.keypadSheet}>
        <Keypad value={cost} onChange={setCost} />
        <Pressable
          style={[styles.confirmButton, !canSave && { opacity: 0.5 }]}
          onPress={() => create.mutate()}
          disabled={!canSave}
        >
          <Text style={[typography.bodySemibold, { color: colors.onPrimary }]}>
            {create.isPending ? "Saving…" : `Confirm ${RUPEE}${cost}`}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  amountSection: { alignItems: "center", paddingTop: spacing.xl, paddingBottom: spacing.lg },
  amountRow: { flexDirection: "row", alignItems: "flex-start", gap: 4 },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainer,
  },
  section: { paddingHorizontal: spacing.containerMargin, marginBottom: spacing.md },
  label: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: spacing.xs },
  descriptionInput: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.default,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.onSurface,
    fontSize: 18,
    fontFamily: "Geist_400Regular",
  },
  dateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  card: {
    marginHorizontal: spacing.containerMargin,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.default,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  cardHeader: { marginBottom: spacing.md },
  payerChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  keypadSheet: {
    backgroundColor: colors.surfaceContainerLow,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.sm,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 4 },
  },
});
