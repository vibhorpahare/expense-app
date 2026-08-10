import { Platform, StyleSheet, View, ViewProps } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius } from "../../theme/tokens";

interface GlassCardProps extends ViewProps {
  radiusVariant?: keyof typeof radius;
  innerGlow?: boolean;
}

// "glass-card" + "inner-glow" from the mockups' CSS: translucent blurred bg,
// subtle white border, and a soft highlight along the top edge (RN has no
// `box-shadow: inset`, so the highlight is a thin top gradient strip instead).
// Animates in on mount (mirrors the mockup's `animate-slide-up` sections).
export function GlassCard({ style, radiusVariant = "default", innerGlow = true, children, ...rest }: GlassCardProps) {
  const r = radius[radiusVariant];
  return (
    <Animated.View
      entering={FadeInDown.duration(400).springify().damping(18)}
      style={[{ borderRadius: r, overflow: "hidden" }, style]}
      {...rest}
    >
      {Platform.OS === "android" ? (
        <View style={StyleSheet.absoluteFill} />
      ) : (
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
      )}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: Platform.OS === "android" ? colors.glassBgAndroidFallback : "rgba(255,255,255,0.04)",
            borderWidth: 1,
            borderColor: colors.glassBorder,
            borderRadius: r,
          },
        ]}
      />
      {innerGlow && (
        <LinearGradient
          colors={[colors.innerGlow, "transparent"]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, height: 8 }}
        />
      )}
      <View style={{ borderRadius: r }}>{children}</View>
    </Animated.View>
  );
}
