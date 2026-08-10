import { DarkTheme, Theme } from "@react-navigation/native";
import { colors, radius, spacing } from "./tokens";
import { typography } from "./typography";

export { colors, radius, spacing, typography };

// Dark-only app -- no light theme/toggle. Extends React Navigation's DarkTheme
// so screen chrome (header bg, etc.) matches the Obsidian palette.
export const navigationTheme: Theme = {
  ...DarkTheme,
  dark: true,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surfaceContainer,
    text: colors.onSurface,
    border: colors.outlineVariant,
    notification: colors.tertiary,
  },
};
