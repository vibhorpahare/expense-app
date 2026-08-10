import { Platform, Pressable, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Icon, IconName } from "./Icon";
import { colors, radius, spacing } from "../../theme/tokens";

const TAB_ICONS: Record<string, IconName> = {
  HomeTab: "grid_view",
  ActivityTab: "receipt_long",
  InsightsTab: "analytics",
  GroupsTab: "group",
  AccountTab: "person",
};

// Floating pill bottom nav from the mockups: blurred glass pill, active tab
// gets a glowing primary-container circle behind its icon.
export function BottomNav({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.pill}>
        {Platform.OS === "android" ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.glassBgAndroidFallback }]} />
        ) : (
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        )}
        <View style={styles.border} />
        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const onPress = () => {
              const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
            };
            return (
              <Pressable key={route.key} onPress={onPress} style={styles.tabButton} hitSlop={8}>
                {isFocused && <View style={styles.activePill} />}
                <Icon
                  name={TAB_ICONS[route.name] ?? "grid_view"}
                  size={24}
                  color={isFocused ? colors.onPrimaryContainer : colors.onSurfaceVariant}
                />
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const PILL_HEIGHT = 64;

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: spacing.xl,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  pill: {
    width: "90%",
    maxWidth: 400,
    height: PILL_HEIGHT,
    borderRadius: radius.full,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 20 },
    elevation: 20,
  },
  border: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  row: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: spacing.sm,
  },
  tabButton: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  activePill: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.primaryContainer,
    shadowColor: colors.primary,
    shadowOpacity: 0.6,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 0 },
  },
});
