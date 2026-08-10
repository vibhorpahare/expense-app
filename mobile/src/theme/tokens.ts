// Verbatim port of the Obsidian design mockups' tailwind.config extend.colors/borderRadius/spacing.
export const colors = {
  background: "#131315",
  surface: "#131315",
  surfaceDim: "#131315",
  surfaceBright: "#39393b",
  surfaceContainerLowest: "#0e0e10",
  surfaceContainerLow: "#1c1b1d",
  surfaceContainer: "#201f22",
  surfaceContainerHigh: "#2a2a2c",
  surfaceContainerHighest: "#353437",
  surfaceVariant: "#353437",
  surfaceTint: "#c0c1ff",

  primary: "#c0c1ff",
  onPrimary: "#1000a9",
  primaryContainer: "#8083ff",
  onPrimaryContainer: "#0d0096",
  primaryFixed: "#e1e0ff",
  primaryFixedDim: "#c0c1ff",
  onPrimaryFixed: "#07006c",
  onPrimaryFixedVariant: "#2f2ebe",
  inversePrimary: "#494bd6",

  secondary: "#4edea3",
  onSecondary: "#003824",
  secondaryContainer: "#00a572",
  onSecondaryContainer: "#00311f",
  secondaryFixed: "#6ffbbe",
  secondaryFixedDim: "#4edea3",
  onSecondaryFixed: "#002113",
  onSecondaryFixedVariant: "#005236",

  tertiary: "#ffb2b7",
  onTertiary: "#67001b",
  tertiaryContainer: "#ff516a",
  onTertiaryContainer: "#5b0017",
  tertiaryFixed: "#ffdadb",
  tertiaryFixedDim: "#ffb2b7",
  onTertiaryFixed: "#40000d",
  onTertiaryFixedVariant: "#92002a",

  error: "#ffb4ab",
  onError: "#690005",
  errorContainer: "#93000a",
  onErrorContainer: "#ffdad6",

  onSurface: "#e5e1e4",
  onSurfaceVariant: "#c7c4d7",
  onBackground: "#e5e1e4",
  inverseSurface: "#e5e1e4",
  inverseOnSurface: "#313032",

  outline: "#908fa0",
  outlineVariant: "#464554",

  // Not in the token palette but used directly by the mockups for gradients/glass.
  meshMint: "#4edea3",
  meshIndigo: "#494bd6",
  glassBorder: "rgba(255,255,255,0.08)",
  glassBg: "rgba(32,31,34,0.6)",
  glassBgAndroidFallback: "rgba(32,31,34,0.85)",
  innerGlow: "rgba(255,255,255,0.1)",
} as const;

export const radius = {
  default: 16,
  lg: 32,
  xl: 48,
  full: 9999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  containerMargin: 24,
  gutter: 16,
} as const;
