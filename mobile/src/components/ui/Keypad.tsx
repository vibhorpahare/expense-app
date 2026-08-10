import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Icon } from "./Icon";
import { colors, radius, spacing } from "../../theme/tokens";
import { typography } from "../../theme/typography";

interface KeypadProps {
  value: string;
  onChange: (next: string) => void;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "backspace"] as const;

// Ported 1:1 from the mockup's inline updateAmount(): append digit, prevent a
// second decimal point, backspace-to-empty resets to "0".
function nextAmount(current: string, key: string): string {
  if (key === "backspace") {
    const trimmed = current.slice(0, -1);
    return trimmed === "" ? "0" : trimmed;
  }
  if (key === ".") {
    return current.includes(".") ? current : current + ".";
  }
  if (current === "0") return key;
  return current + key;
}

function KeypadKey({ label, onPress }: { label: (typeof KEYS)[number]; onPress: () => void }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[styles.key, animatedStyle]}>
      <Pressable
        style={styles.keyPressable}
        onPressIn={() => (scale.value = withSpring(0.9, { damping: 15 }))}
        onPressOut={() => (scale.value = withSpring(1, { damping: 15 }))}
        onPress={onPress}
      >
        {label === "backspace" ? (
          <Icon name="backspace" color={colors.onSurface} size={22} />
        ) : (
          <Text style={[typography.headlineMd, { color: colors.onSurface }]}>{label}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

export function Keypad({ value, onChange }: KeypadProps) {
  const handlePress = (key: string) => {
    Haptics.selectionAsync();
    onChange(nextAmount(value, key));
  };

  return (
    <View style={styles.grid}>
      {KEYS.map((key) => (
        <KeypadKey key={key} label={key} onPress={() => handlePress(key)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  key: {
    width: "33.33%",
    aspectRatio: 1.6,
    alignItems: "center",
    justifyContent: "center",
  },
  keyPressable: {
    width: 64,
    height: 64,
    borderRadius: radius.default,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
});
