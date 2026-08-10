import { StyleSheet, Text, View } from "react-native";
import { Icon, IconName } from "./Icon";
import { colors, spacing } from "../../theme/tokens";
import { typography } from "../../theme/typography";

interface EmptyStateProps {
  icon: IconName;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Icon name={icon} size={40} color={colors.outline} />
      <Text style={[typography.bodySemibold, { color: colors.onSurface, marginTop: spacing.md }]}>{title}</Text>
      {subtitle && (
        <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant, marginTop: spacing.xs, textAlign: "center" }]}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
});
