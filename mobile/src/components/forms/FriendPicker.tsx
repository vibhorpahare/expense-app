import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { Friend } from "../../api/types";
import { Avatar } from "../ui/Avatar";
import { Icon } from "../ui/Icon";
import { colors, radius, spacing } from "../../theme/tokens";
import { typography } from "../../theme/typography";

interface FriendPickerProps {
  friends: Friend[];
  participantIds: string[];
  onChange: (ids: string[]) => void;
  currentUserId: string;
  currentUserName: string;
}

// Ported from AddExpenseModal's "With" section: avatar row of current
// participants (self can't be removed) + search-to-add for the rest.
export function FriendPicker({ friends, participantIds, onChange, currentUserId, currentUserName }: FriendPickerProps) {
  const [query, setQuery] = useState("");

  const friendById = new Map(friends.map((f) => [f.id, f]));
  const nameOf = (id: string) => (id === currentUserId ? currentUserName : friendById.get(id)?.first_name ?? "?");

  const matching = friends.filter(
    (f) =>
      !participantIds.includes(f.id) &&
      (f.first_name.toLowerCase().includes(query.toLowerCase()) || f.email.toLowerCase().includes(query.toLowerCase())),
  );

  const removeParticipant = (id: string) => {
    if (id === currentUserId) return;
    onChange(participantIds.filter((p) => p !== id));
  };

  return (
    <View>
      <View style={styles.avatarRow}>
        {participantIds.map((id) => (
          <View key={id} style={styles.avatarSlot}>
            <View>
              <Avatar
                uri={friendById.get(id)?.avatar_url}
                name={nameOf(id)}
                size={56}
                borderColor={id === currentUserId ? colors.primary : undefined}
              />
              {id === currentUserId ? (
                <View style={styles.checkBadge}>
                  <Icon name="check" size={12} color={colors.onSecondary} />
                </View>
              ) : (
                <Pressable style={styles.removeBadge} onPress={() => removeParticipant(id)}>
                  <Icon name="close" size={12} color={colors.onSurface} />
                </Pressable>
              )}
            </View>
            <Text style={[typography.labelSm, { color: colors.onSurfaceVariant, textTransform: "none", marginTop: spacing.xs }]}>
              {id === currentUserId ? "You" : nameOf(id)}
            </Text>
          </View>
        ))}
      </View>

      <TextInput
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        placeholder="Add a friend by name or email…"
        placeholderTextColor={colors.outline}
      />
      {query.length > 0 && matching.length > 0 && (
        <View style={styles.dropdown}>
          {matching.map((f) => (
            <Pressable
              key={f.id}
              style={styles.dropdownRow}
              onPress={() => {
                onChange([...participantIds, f.id]);
                setQuery("");
              }}
            >
              <Text style={[typography.bodyMd, { color: colors.onSurface }]}>
                {f.first_name} {f.last_name} ({f.email})
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatarRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginBottom: spacing.md },
  avatarSlot: { alignItems: "center", width: 64 },
  checkBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: radius.full,
    backgroundColor: colors.secondary,
    borderWidth: 2,
    borderColor: colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  removeBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerHighest,
    borderWidth: 2,
    borderColor: colors.surfaceContainer,
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
    fontSize: 14,
  },
  dropdown: {
    marginTop: spacing.xs,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.default,
    overflow: "hidden",
  },
  dropdownRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
});
