import { TextStyle } from "react-native";

// Mockup fontSize scale: [px, {lineHeight: multiplier, letterSpacing: em, fontWeight}].
// RN's lineHeight/letterSpacing are absolute px, not multipliers/em -- converted below.
export const typography: Record<string, TextStyle> = {
  displayLg: {
    fontFamily: "Sora_700Bold",
    fontSize: 48,
    lineHeight: 52.8, // 1.1 * 48
    letterSpacing: -1.92, // -0.04em * 48
  },
  displayLgMobile: {
    fontFamily: "Sora_700Bold",
    fontSize: 32,
    lineHeight: 38.4, // 1.2 * 32
    letterSpacing: -0.64, // -0.02em * 32
  },
  headlineMd: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 24,
    lineHeight: 31.2, // 1.3 * 24
    letterSpacing: -0.24, // -0.01em * 24
  },
  bodyLg: {
    fontFamily: "Geist_400Regular",
    fontSize: 18,
    lineHeight: 28.8, // 1.6 * 18
    letterSpacing: 0,
  },
  bodyMd: {
    fontFamily: "Geist_400Regular",
    fontSize: 16,
    lineHeight: 24, // 1.5 * 16
    letterSpacing: 0,
  },
  bodyMdMedium: {
    fontFamily: "Geist_500Medium",
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
  },
  bodySemibold: {
    fontFamily: "Geist_600SemiBold",
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
  },
  labelSm: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 12,
    lineHeight: 12, // 1 * 12
    letterSpacing: 0.6, // 0.05em * 12
    textTransform: "uppercase",
  },
} as const;

// Font weights loaded via useFonts() in App.tsx -- keep in sync with this list.
export const FONT_WEIGHTS_TO_LOAD = [
  "Sora_400Regular",
  "Sora_600SemiBold",
  "Sora_700Bold",
  "Sora_800ExtraBold",
  "Geist_400Regular",
  "Geist_500Medium",
  "Geist_600SemiBold",
  "JetBrainsMono_500Medium",
] as const;
