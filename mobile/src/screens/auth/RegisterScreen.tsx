import { useState } from "react";
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
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../../navigation/types";
import { useAuth } from "../../context/AuthContext";
import { MeshBackground } from "../../components/ui/MeshBackground";
import { colors, radius, spacing } from "../../theme/tokens";
import { typography } from "../../theme/typography";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

export function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    setBusy(true);
    setError("");
    try {
      await register(email, password, firstName, lastName);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setError(typeof msg === "string" ? msg : "Could not create account.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <MeshBackground />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={[typography.displayLg, { color: colors.primary }]}>Splitly</Text>
          <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant, marginTop: spacing.sm, marginBottom: spacing.xl }]}>
            Create your account.
          </Text>

          {!!error && <Text style={[typography.bodyMd, { color: colors.error, marginBottom: spacing.md }]}>{error}</Text>}

          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>First name</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholderTextColor={colors.outline}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Last name</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholderTextColor={colors.outline}
              />
            </View>
          </View>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor={colors.outline}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="At least 8 characters"
            placeholderTextColor={colors.outline}
          />

          <Pressable
            style={[styles.button, busy && { opacity: 0.6 }]}
            onPress={onSubmit}
            disabled={busy || !email || password.length < 8 || !firstName}
          >
            <Text style={[typography.bodySemibold, { color: colors.onPrimary }]}>
              {busy ? "Creating…" : "Create account"}
            </Text>
          </Pressable>

          <Pressable onPress={() => navigation.navigate("Login")} style={{ marginTop: spacing.lg }}>
            <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant, textAlign: "center" }]}>
              Already have an account? <Text style={{ color: colors.primary }}>Log in</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: spacing.containerMargin },
  label: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: spacing.xs, marginTop: spacing.md },
  input: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.default,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.onSurface,
    fontSize: 16,
    fontFamily: "Geist_400Regular",
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.xl,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 4 },
  },
});
