import { StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Line,
  Path,
  Rect,
  Text as SvgText,
} from 'react-native-svg';

import { colors, radius, spacing, typography } from '@/design';

import type { VolumeIntensitySeries } from './types';

const WIDTH = 600;
const HEIGHT = 210;
const TOP = 18;
const BOTTOM = 34;
const PLOT_HEIGHT = HEIGHT - TOP - BOTTOM;
const BAR_COLOR = 'rgba(229,34,30,0.32)';

export function VolumeIntensityChart({
  series,
}: {
  series: VolumeIntensitySeries;
}) {
  if (series.points.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>还没有训练记录</Text>
        <Text style={styles.emptyBody}>完成训练后会显示每周容量和平均 RPE</Text>
      </View>
    );
  }
  const points = series.points.slice(-12);
  const slot = WIDTH / points.length;
  const barWidth = Math.min(32, slot * 0.52);
  const x = (index: number) => slot * index + slot / 2;
  const y = (value: number) => TOP + PLOT_HEIGHT * (1 - value / series.scale);
  const rpePoints = points.flatMap((point, index) =>
    point.rpePlotValue === null
      ? []
      : [{ x: x(index), y: y(point.rpePlotValue), key: point.key }],
  );
  const linePath = rpePoints
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  return (
    <View>
      <Svg
        accessibilityLabel="每周训练容量和平均 RPE"
        height={HEIGHT}
        preserveAspectRatio="none"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%">
        <Line
          stroke={colors.border}
          strokeWidth={1}
          x1={0}
          x2={WIDTH}
          y1={TOP + PLOT_HEIGHT}
          y2={TOP + PLOT_HEIGHT}
        />
        {points.map((point, index) => {
          const barY = y(point.volumeKg);
          return (
            <Rect
              fill={BAR_COLOR}
              height={TOP + PLOT_HEIGHT - barY}
              key={point.key}
              rx={4}
              width={barWidth}
              x={x(index) - barWidth / 2}
              y={barY}
            />
          );
        })}
        {linePath ? (
          <Path
            d={linePath}
            fill="none"
            stroke={colors.green}
            strokeLinejoin="round"
            strokeWidth={2.5}
          />
        ) : null}
        {rpePoints.map((point) => (
          <Circle
            cx={point.x}
            cy={point.y}
            fill={colors.green}
            key={point.key}
            r={4}
          />
        ))}
        {points.map((point, index) => (
          <SvgText
            fill={colors.fgTertiary}
            fontSize={18}
            key={`label-${point.key}`}
            textAnchor="middle"
            x={x(index)}
            y={HEIGHT - 7}>
            {Number(point.startDate.slice(5, 7))}/{Number(point.startDate.slice(8, 10))}
          </SvgText>
        ))}
      </Svg>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={styles.volumeSwatch} />
          <Text style={styles.legendText}>训练容量 kg</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.rpeSwatch} />
          <Text style={styles.legendText}>平均 RPE</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 180,
  },
  emptyTitle: { color: colors.fgPrimary, ...typography.bodyEmphasis },
  emptyBody: { color: colors.fgTertiary, textAlign: 'center', ...typography.footnote },
  legend: {
    flexDirection: 'row',
    gap: spacing.base,
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  legendItem: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  legendText: { color: colors.fgSecondary, ...typography.caption },
  volumeSwatch: {
    backgroundColor: BAR_COLOR,
    borderRadius: radius.sm,
    height: 9,
    width: 18,
  },
  rpeSwatch: { backgroundColor: colors.green, borderRadius: radius.pill, height: 8, width: 8 },
});
