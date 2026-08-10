import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { colors } from "../theme/tokens";

// Shared dark-theme header styling for every native-stack navigator.
export const stackScreenOptions: NativeStackNavigationOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.onSurface,
  headerTitleStyle: { fontFamily: "Sora_600SemiBold", fontSize: 18 },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.background },
};
