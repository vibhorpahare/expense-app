import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { FlatCategory } from "../../hooks/useCategories";
import { Icon } from "../ui/Icon";
import { colors, radius, spacing } from "../../theme/tokens";
import { typography } from "../../theme/typography";

interface CategoryPickerProps {
  categories: FlatCategory[];
  selectedId: number | null;
  onChange: (id: number | null) => void;
}

// Ported from AddExpenseModal's category section: selected chip with a clear
// button, or a search box + filtered results when nothing's picked yet.
export function CategoryPicker({ categories, selectedId, onChange }: CategoryPickerProps) {
  const [query, setQuery] = useState("");
  const selected = categories.find((c) => c.id === selectedId);

  if (selected) {
    return (
      <View style={styles.selectedRow}>
        <Text style={[typography.bodyMd, { color: colors.onSurface }]}>{selected.label}</Text>
        <Pressable onPress={() => onChange(null)}>
          <Icon name="close" size={18} color={colors.onSurfaceVariant} />
        </Pressable>
      </View>
    );
  }

  const filtered = categories.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <View>
      <TextInput
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        placeholder="Search category…"
        placeholderTextColor={colors.outline}
      />
      {query.length > 0 && (
        <ScrollView style={styles.dropdown} nestedScrollEnabled keyboardShouldPersistTaps="handled">
          {filtered.length === 0 ? (
            <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant, padding: spacing.md }]}>No matches.</Text>
          ) : (
            filtered.map((c) => (
              <Pressable
                key={c.id}
                style={styles.dropdownRow}
                onPress={() => {
                  onChange(c.id);
                  setQuery("");
                }}
              >
                <Text style={[typography.bodyMd, { color: colors.onSurface }]}>{c.label}</Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  selectedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.default,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
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
  dropdown: {
    marginTop: spacing.xs,
    maxHeight: 180,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.default,
  },
  dropdownRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
});
