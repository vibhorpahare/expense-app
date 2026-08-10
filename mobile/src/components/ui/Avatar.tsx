import { Image, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/tokens";
import { typography } from "../../theme/typography";

interface AvatarProps {
  uri?: string | null;
  name: string;
  size?: number;
  borderColor?: string;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function Avatar({ uri, name, size = 48, borderColor }: AvatarProps) {
  const style = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: borderColor ? 2 : 0,
    borderColor,
  };
  if (uri) {
    return <Image source={{ uri }} style={[styles.image, style]} />;
  }
  return (
    <View style={[styles.fallback, style]}>
      <Text style={[typography.labelSm, { color: colors.onSurfaceVariant, fontSize: size * 0.35 }]}>
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.surfaceContainerHighest },
  fallback: {
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: "center",
    justifyContent: "center",
  },
});
