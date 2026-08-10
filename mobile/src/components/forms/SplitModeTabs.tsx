import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { SplitMode } from "../../lib/splits";
import { validateSplit } from "../../lib/splitValidation";
import { colors, radius, spacing } from "../../theme/tokens";
import { typography } from "../../theme/typography";

const MODES: { key: SplitMode; label: string }[] = [
  { key: "equally", label: "Equally" },
  { key: "exact", label: "Exact amounts" },
  { key: "percent", label: "Percentages" },
  { key: "shares", label: "Shares" },
  { key: "adjustment", label: "Adjustment" },
];

interface SplitModeTabsProps {
  mode: SplitMode;
  onModeChange: (mode: SplitMode) => void;
  perPerson: Record<string, string>;
  onPerPersonChange: (next: Record<string, string>) => void;
  cost: string;
  participantIds: string[];
  nameOf: (id: string) => string;
}

export function SplitModeTabs({ mode, onModeChange, perPerson, onPerPersonChange, cost, participantIds, nameOf }: SplitModeTabsProps) {
  const validation = validateSplit(mode, perPerson, cost, participantIds);

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modeRow}>
        {MODES.map((m) => {
          const active = mode === m.key;
          return (
            <Text
              key={m.key}
              onPress={() => onModeChange(m.key)}
              style={[
                typography.labelSm,
                styles.modeChip,
                { textTransform: "none" },
                active
                  ? { backgroundColor: colors.primary, color: colors.onPrimary }
                  : { backgroundColor: colors.surfaceContainerHigh, color: colors.onSurfaceVariant },
              ]}
            >
              {m.label}
            </Text>
          );
        })}
      </ScrollView>

      {mode !== "equally" && (
        <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
          {participantIds.map((uid) => (
            <View key={uid} style={styles.personRow}>
              <Text style={[typography.bodyMd, { color: colors.onSurface }]}>{nameOf(uid)}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                <TextInput
                  style={styles.personInput}
                  value={perPerson[uid] ?? ""}
                  onChangeText={(v) => onPerPersonChange({ ...perPerson, [uid]: v })}
                  keyboardType="numeric"
                  placeholder={mode === "shares" ? "1" : "0.00"}
                  placeholderTextColor={colors.outline}
                />
                <Text style={[typography.labelSm, { color: colors.onSurfaceVariant, width: 20 }]}>
                  {mode === "percent" ? "%" : mode === "shares" ? "sh" : ""}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {!!validation.message && (
        <Text style={[typography.labelSm, { color: validation.ok ? colors.secondary : colors.tertiary, textTransform: "none", marginTop: spacing.sm }]}>
          {validation.message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  modeRow: { gap: spacing.xs, paddingRight: spacing.md },
  modeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  personInput: {
    width: 90,
    textAlign: "right",
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.default,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    color: colors.onSurface,
    fontFamily: "Geist_400Regular",
    fontSize: 14,
  },
});
