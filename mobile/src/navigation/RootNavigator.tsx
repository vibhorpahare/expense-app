import { StyleSheet, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { AuthStack } from "./AuthStack";
import { AppTabs } from "./AppTabs";
import { colors } from "../theme/tokens";

export function RootNavigator() {
  const { loading, user } = useAuth();

  // App.tsx keeps the splash screen up while fonts load; this covers the
  // brief window while the stored token is being revalidated against
  // GET /get_current_user.
  if (loading) return <View style={styles.splash} />;

  return user ? <AppTabs /> : <AuthStack />;
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.background },
});
