import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { GroupsStackParamList } from "../../navigation/types";
import { groups as groupsApi } from "../../api";
import { useAuth } from "../../context/AuthContext";
import { Avatar } from "../../components/ui/Avatar";
import { colors, radius, spacing, TAB_BAR_CLEARANCE } from "../../theme/tokens";
import { typography } from "../../theme/typography";

type Props = NativeStackScreenProps<GroupsStackParamList, "GroupSettings">;

const GROUP_TYPES = ["home", "trip", "couple", "apartment", "house", "other"];

export function GroupSettingsScreen({ route, navigation }: Props) {
  const { groupId } = route.params;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: group } = useQuery({ queryKey: ["group", groupId], queryFn: () => groupsApi.get(groupId) });

  const [name, setName] = useState(group?.name ?? "");
  const [groupType, setGroupType] = useState(group?.group_type ?? "other");
  const [simplify, setSimplify] = useState(group?.simplify_by_default ?? true);
  const [error, setError] = useState("");

  if (!group) return null;

  const isOwner = user?.id === group.created_by_id;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["group", groupId] });
    queryClient.invalidateQueries({ queryKey: ["groups"] });
  };

  const save = useMutation({
    mutationFn: () => groupsApi.update(groupId, { name, group_type: groupType, simplify_by_default: simplify }),
    onSuccess: () => {
      invalidate();
      navigation.goBack();
    },
    onError: () => setError("Could not save changes"),
  });

  const uploadAvatar = useMutation({
    mutationFn: async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, mediaTypes: ["images"] });
      if (result.canceled || !result.assets[0]) return;
      const picked = result.assets[0];
      return groupsApi.uploadAvatar(groupId, {
        uri: picked.uri,
        name: picked.fileName ?? "avatar.jpg",
        type: picked.mimeType ?? "image/jpeg",
      });
    },
    onSuccess: invalidate,
    onError: () => setError("Could not upload image"),
  });

  const toggleArchive = useMutation({
    mutationFn: () => (group.archived_at ? groupsApi.unarchive(groupId) : groupsApi.archive(groupId)),
    onSuccess: (res) => {
      if (!res.success) {
        setError(Object.values(res.errors).flat().join(", ") || "Could not archive group");
        return;
      }
      invalidate();
      navigation.goBack();
    },
    onError: () => setError("Could not update archive status"),
  });

  const remove = useMutation({
    mutationFn: () => groupsApi.remove(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      navigation.popToTop();
    },
    onError: () => setError("Could not delete group -- it may have expenses or a non-zero balance"),
  });

  const confirmDelete = () => {
    Alert.alert("Delete group?", `This deletes "${group.name}" and all its expenses. This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove.mutate() },
    ]);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.containerMargin, paddingBottom: TAB_BAR_CLEARANCE }}>
      {!!error && <Text style={[typography.bodyMd, { color: colors.error, marginBottom: spacing.md }]}>{error}</Text>}

      <View style={styles.avatarRow}>
        <Avatar uri={group.avatar_url} name={group.name} size={64} />
        <Pressable onPress={() => uploadAvatar.mutate()}>
          <Text style={[typography.labelSm, { color: colors.primary, textTransform: "none" }]}>Change photo</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholderTextColor={colors.outline} />

      <Text style={styles.label}>Type</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
        {GROUP_TYPES.map((t) => {
          const active = groupType === t;
          return (
            <Text
              key={t}
              onPress={() => setGroupType(t)}
              style={[
                typography.labelSm,
                styles.typeChip,
                { textTransform: "none" },
                active
                  ? { backgroundColor: colors.primaryContainer, color: colors.onPrimaryContainer }
                  : { backgroundColor: colors.surfaceContainerHigh, color: colors.onSurfaceVariant },
              ]}
            >
              {t[0].toUpperCase() + t.slice(1)}
            </Text>
          );
        })}
      </ScrollView>

      <View style={styles.switchRow}>
        <Text style={[typography.bodyMd, { color: colors.onSurface }]}>Simplify group debts by default</Text>
        <Switch
          value={simplify}
          onValueChange={setSimplify}
          trackColor={{ false: colors.surfaceContainerHigh, true: colors.primaryContainer }}
          thumbColor={colors.onSurface}
        />
      </View>

      <Pressable style={[styles.saveButton, save.isPending && { opacity: 0.6 }]} onPress={() => save.mutate()} disabled={save.isPending}>
        <Text style={[typography.bodySemibold, { color: colors.onPrimary }]}>Save changes</Text>
      </Pressable>

      <View style={styles.dangerZone}>
        <Pressable style={styles.outlineButton} onPress={() => toggleArchive.mutate()}>
          <Text style={[typography.bodyMd, { color: colors.onSurface }]}>{group.archived_at ? "Unarchive group" : "Archive group"}</Text>
        </Pressable>
        {isOwner ? (
          <Pressable style={[styles.outlineButton, { borderColor: colors.error }]} onPress={confirmDelete}>
            <Text style={[typography.bodyMd, { color: colors.error }]}>Delete group</Text>
          </Pressable>
        ) : (
          <Text style={[typography.labelSm, { color: colors.onSurfaceVariant, textTransform: "none" }]}>
            Only the group owner can delete it.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg },
  label: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: spacing.md, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.default,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.onSurface,
    fontFamily: "Geist_400Regular",
    fontSize: 16,
  },
  typeChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, overflow: "hidden" },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.lg },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.xl,
  },
  dangerZone: {
    marginTop: spacing.xxl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    gap: spacing.sm,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.full,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
});
