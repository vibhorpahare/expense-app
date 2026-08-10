import { useEffect } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { colors, radius, spacing } from "../../theme/tokens";

export function SkeletonBlock({ style }: { style?: ViewStyle }) {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[styles.block, animatedStyle, style]} />;
}

export function ScreenSkeleton() {
  return (
    <View style={styles.container}>
      <SkeletonBlock style={{ height: 160, borderRadius: radius.lg, marginBottom: spacing.lg }} />
      <SkeletonBlock style={{ height: 44, borderRadius: radius.default, marginBottom: spacing.md, width: "60%" }} />
      <SkeletonBlock style={{ height: 72, borderRadius: radius.default, marginBottom: spacing.sm }} />
      <SkeletonBlock style={{ height: 72, borderRadius: radius.default, marginBottom: spacing.sm }} />
      <SkeletonBlock style={{ height: 72, borderRadius: radius.default }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.containerMargin },
  block: { backgroundColor: colors.surfaceContainerHigh },
});
