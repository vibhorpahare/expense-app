import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { StyleSheet } from "react-native";
import { colors } from "../../theme/tokens";

// RN has no CSS radial-gradient/filter:blur() -- react-native-svg's
// RadialGradient is the direct native equivalent (GPU-composited gradient,
// no blur hack needed, the falloff itself provides the "mesh" softness).
export function MeshBackground({ seed = 0 }: { seed?: number }) {
  // Vary blob position slightly per seed so e.g. different group detail
  // screens don't look identical.
  const mintCx = `${15 + (seed % 3) * 10}%`;
  const indigoCx = `${85 - (seed % 3) * 10}%`;

  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="mint" cx={mintCx} cy="10%" r="60%">
          <Stop offset="0%" stopColor={colors.meshMint} stopOpacity={0.35} />
          <Stop offset="100%" stopColor={colors.meshMint} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="indigo" cx={indigoCx} cy="45%" r="55%">
          <Stop offset="0%" stopColor={colors.meshIndigo} stopOpacity={0.35} />
          <Stop offset="100%" stopColor={colors.meshIndigo} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={colors.background} />
      <Rect width="100%" height="100%" fill="url(#mint)" />
      <Rect width="100%" height="100%" fill="url(#indigo)" />
    </Svg>
  );
}
