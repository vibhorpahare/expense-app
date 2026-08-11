import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useMutation } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../context/AuthContext";
import { users as usersApi } from "../../api";
import { Avatar } from "../../components/ui/Avatar";
import { colors, radius, spacing, TAB_BAR_CLEARANCE } from "../../theme/tokens";
import { typography } from "../../theme/typography";

const NOTIFICATION_LABELS: Record<string, string> = {
  added_as_friend: "Someone adds me as a friend",
  added_to_group: "Someone adds me to a group",
  expense_added: "An expense is added",
  expense_updated: "An expense is edited or deleted",
  comment_added: "Someone comments on an expense",
  news: "Splitly news and updates",
};

export function AccountScreen() {
  const { user, refreshUser, logout } = useAuth();

  const [firstName, setFirstName] = useState(user?.first_name ?? "");
  const [lastName, setLastName] = useState(user?.last_name ?? "");
  const [phone, setPhone] = useState(user?.phone_number ?? "");
  const [password, setPassword] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  const saveProfile = useMutation({
    mutationFn: () =>
      usersApi.update({
        first_name: firstName,
        last_name: lastName,
        phone_number: phone,
        ...(password ? { password } : {}),
      }),
    onSuccess: () => {
      setPassword("");
      setSavedMsg("Saved.");
      refreshUser();
      setTimeout(() => setSavedMsg(""), 2000);
    },
  });

  const saveNotifications = useMutation({
    mutationFn: (settings: Record<string, boolean>) => usersApi.update({ notification_settings: settings }),
    onSuccess: refreshUser,
  });

  const uploadAvatar = useMutation({
    mutationFn: async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, mediaTypes: ["images"] });
      if (result.canceled || !result.assets[0]) return;
      const picked = result.assets[0];
      return usersApi.uploadAvatar({ uri: picked.uri, name: picked.fileName ?? "avatar.jpg", type: picked.mimeType ?? "image/jpeg" });
    },
    onSuccess: refreshUser,
  });

  if (!user) return null;

  const toggleNotification = (key: string) => {
    const next = { ...user.notification_settings, [key]: !user.notification_settings[key] };
    saveNotifications.mutate(next);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.containerMargin, paddingBottom: TAB_BAR_CLEARANCE }}>
      <View style={styles.card}>
        <View style={styles.avatarRow}>
          <Avatar uri={user.avatar_url} name={user.first_name} size={64} />
          <Pressable onPress={() => uploadAvatar.mutate()}>
            <Text style={[typography.labelSm, { color: colors.primary, textTransform: "none" }]}>Change avatar</Text>
          </Pressable>
        </View>

        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>First name</Text>
            <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholderTextColor={colors.outline} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Last name</Text>
            <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholderTextColor={colors.outline} />
          </View>
        </View>

        <Text style={styles.label}>Email</Text>
        <TextInput style={[styles.input, styles.inputDisabled]} value={user.email} editable={false} />

        <Text style={styles.label}>Phone number</Text>
        <TextInput
          style={styles.input}
          value={phone ?? ""}
          onChangeText={setPhone}
          placeholder="+91 98765 43210"
          placeholderTextColor={colors.outline}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>New password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Leave blank to keep current"
          placeholderTextColor={colors.outline}
          secureTextEntry
        />

        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.lg }}>
          <Pressable style={styles.saveButton} onPress={() => saveProfile.mutate()} disabled={saveProfile.isPending}>
            <Text style={[typography.bodySemibold, { color: colors.onPrimary }]}>{saveProfile.isPending ? "Saving…" : "Save"}</Text>
          </Pressable>
          {!!savedMsg && <Text style={[typography.bodyMd, { color: colors.secondary }]}>{savedMsg}</Text>}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={[typography.headlineMd, { color: colors.onSurface, fontSize: 18, marginBottom: spacing.md }]}>Notifications</Text>
        {Object.entries(NOTIFICATION_LABELS).map(([key, label]) => (
          <View key={key} style={styles.switchRow}>
            <Text style={[typography.bodyMd, { color: colors.onSurface, flex: 1 }]}>{label}</Text>
            <Switch
              value={!!user.notification_settings[key]}
              onValueChange={() => toggleNotification(key)}
              trackColor={{ false: colors.surfaceContainerHigh, true: colors.primaryContainer }}
              thumbColor={colors.onSurface}
            />
          </View>
        ))}
      </View>

      <Pressable style={styles.logoutButton} onPress={logout}>
        <Text style={[typography.bodyMd, { color: colors.error }]}>Log out</Text>
      </Pressable>
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
    gap: spacing.xs,
  },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  label: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: spacing.sm, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.default,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.onSurface,
    fontFamily: "Geist_400Regular",
    fontSize: 15,
  },
  inputDisabled: { color: colors.onSurfaceVariant },
  saveButton: { backgroundColor: colors.primary, borderRadius: radius.full, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  switchRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.xs },
  logoutButton: {
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.full,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.sm,
  },
});
