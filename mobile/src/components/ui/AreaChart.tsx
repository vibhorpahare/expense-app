import { View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { colors } from "../../theme/tokens";

export interface AreaChartPoint {
  label: string;
  value: number;
}

interface AreaChartProps {
  points: AreaChartPoint[];
  height?: number;
  color?: string;
}

// Hand-rolled SVG area chart (no charting library -- this is the only chart
// in the app that needs one, not enough to justify the dependency). Builds a
// smooth quadratic-bezier path through real monthly totals, mirroring the
// mockup's Q/T path syntax but driven by actual data.
export function AreaChart({ points, height = 180, color = colors.primary }: AreaChartProps) {
  const width = 400;
  const max = Math.max(1, ...points.map((p) => p.value));
  const stepX = points.length > 1 ? width / (points.length - 1) : width;

  const coords = points.map((p, i) => ({
    x: i * stepX,
    y: height - (p.value / max) * (height - 20) - 10,
  }));

  let linePath = "";
  coords.forEach((c, i) => {
    if (i === 0) {
      linePath += `M${c.x},${c.y}`;
    } else {
      const prev = coords[i - 1];
      const midX = (prev.x + c.x) / 2;
      linePath += ` Q${prev.x},${prev.y} ${midX},${(prev.y + c.y) / 2} T${c.x},${c.y}`;
    }
  });
  const areaPath = `${linePath} V${height} H0 Z`;
  const last = coords[coords.length - 1];

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {coords.length > 0 && (
          <>
            <Path d={areaPath} fill="url(#areaFill)" />
            <Path d={linePath} fill="none" stroke={color} strokeWidth={3} />
            {last && <Circle cx={last.x} cy={last.y} r={5} fill={color} />}
          </>
        )}
      </Svg>
    </View>
  );
}
