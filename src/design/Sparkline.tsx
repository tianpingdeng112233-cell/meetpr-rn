import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useColors } from './theme';

export type SparklineDatum = {
  /** Monotonic domain value, normally a timestamp. */
  x: number;
  y: number;
};

export type SparklineProps = {
  data: readonly SparklineDatum[];
  height?: number;
  lineColor?: string;
  lineWidth?: number;
  showEndDot?: boolean;
  showPointDots?: boolean;
};

const VIEWBOX_WIDTH = 600;
const VIEWBOX_HEIGHT = 120;
const VERTICAL_PADDING = 10;

export function buildStepSparklinePath(
  data: readonly SparklineDatum[],
  width = VIEWBOX_WIDTH,
  height = VIEWBOX_HEIGHT,
  verticalPadding = VERTICAL_PADDING,
): { d: string; points: { x: number; y: number }[] } {
  const sorted = [...data]
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    .sort((left, right) => left.x - right.x);
  if (sorted.length === 0) {
    return { d: '', points: [] };
  }

  const minimumX = sorted[0].x;
  const maximumX = sorted[sorted.length - 1].x;
  const values = sorted.map((point) => point.y);
  const minimumY = Math.min(...values);
  const maximumY = Math.max(...values);
  const xSpan = Math.max(maximumX - minimumX, 1);
  const ySpan = Math.max(maximumY - minimumY, 1);
  const usableHeight = Math.max(height - verticalPadding * 2, 1);
  const points = sorted.map((point, index) => ({
    x:
      sorted.length === 1
        ? width / 2
        : ((point.x - minimumX) / xSpan) * width,
    y: verticalPadding + (1 - (point.y - minimumY) / ySpan) * usableHeight,
    index,
  }));
  const [first, ...rest] = points;
  const commands = [`M ${first.x} ${first.y}`];
  for (const point of rest) {
    // Record trajectories hold the previous best until a new record date,
    // then jump vertically to the new plateau.
    commands.push(`H ${point.x}`, `V ${point.y}`);
  }
  return { d: commands.join(' '), points };
}

/** Compact record-trajectory chart shared by Dashboard and later growth cards. */
export function Sparkline({
  data,
  height = 110,
  lineColor,
  lineWidth = 1.5,
  showEndDot = true,
  showPointDots = true,
}: SparklineProps) {
  const colors = useColors();
  const geometry = useMemo(() => buildStepSparklinePath(data), [data]);
  if (geometry.points.length === 0) {
    return null;
  }
  const last = geometry.points[geometry.points.length - 1];
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg
        height={height}
        preserveAspectRatio="none"
        style={styles.chart}
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        width="100%">
        <Path
          d={geometry.d}
          fill="none"
          stroke={lineColor ?? colors.textPrimary}
          strokeLinejoin="round"
          strokeWidth={lineWidth}
        />
        {showPointDots
          ? geometry.points.map((point, index) => (
              <Circle
                cx={point.x}
                cy={point.y}
                fill={lineColor ?? colors.textPrimary}
                key={`${point.x}-${point.y}-${index}`}
                opacity={0.55}
                r={2}
              />
            ))
          : null}
        {showEndDot ? (
          <Circle cx={last.x} cy={last.y} fill={colors.gold500} r={4} />
        ) : null}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({ chart: { width: '100%' } });
