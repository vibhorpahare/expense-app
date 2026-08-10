import { useEffect } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications as notificationsApi } from "../../api";
import { EmptyState } from "../../components/ui/EmptyState";
import { colors, radius, spacing } from "../../theme/tokens";
import { typography } from "../../theme/typography";

// Notification content is server-generated HTML from a small safe-tag
// allowlist (matches web's dangerouslySetInnerHTML usage) -- RN has no HTML
// renderer here, so tags are stripped for plain-text display.
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

export function NotificationsScreen() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["notifications"], queryFn: notificationsApi.list });

  useEffect(() => {
    notificationsApi.markRead().then(() => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });
  }, [queryClient]);

  return (
    <View style={styles.screen}>
      <FlatList
        data={data?.notifications ?? []}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ padding: spacing.containerMargin }}
        renderItem={({ item: n }) => (
          <View style={styles.row}>
            <Text style={[typography.bodyMd, { color: colors.onSurface }]}>{stripHtml(n.content)}</Text>
            <Text style={[typography.labelSm, { color: colors.onSurfaceVariant, textTransform: "none", marginTop: spacing.xs }]}>
              {new Date(n.created_at).toLocaleString()}
            </Text>
          </View>
        )}
        ListEmptyComponent={!isLoading ? <EmptyState icon="notifications_none" title="No activity yet" /> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  row: {
    padding: spacing.md,
    borderRadius: radius.default,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginBottom: spacing.sm,
  },
});
