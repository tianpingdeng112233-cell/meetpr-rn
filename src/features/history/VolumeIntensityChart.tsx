import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { t } from '@/i18n';
import Svg, {
  Circle,
  Line,
  Path,
  Rect,
  Text as SvgText,
} from 'react-native-svg';

import { useColors, radius, spacing, typography } from '@/design';

import type { VolumeIntensitySeries } from './types';

const WIDTH = 600;
const HEIGHT = 210;
const TOP = 18;
const BOTTOM = 34;
const PLOT_HEIGHT = HEIGHT - TOP - BOTTOM;


export function VolumeIntensityChart({
  series,
  isUnlocked,
}: {
  series: VolumeIntensitySeries;
  isUnlocked: boolean;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  if (!isUnlocked || series.points.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>{t('student.volumeIntensityChart.copy003')}</Text>
      </View>
    );
  }
  const points = series.points;
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
        accessibilityLabel={t('student.volumeIntensityChart.copy004', [points.length])}
        height={HEIGHT}
        preserveAspectRatio="none"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%">
        <Line
          stroke={colors.chartLine}
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
              fill={colors.goldSoft}
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
            stroke={colors.chartLine}
            strokeLinejoin="round"
            strokeWidth={2.5}
          />
        ) : null}
        {rpePoints.map((point) => (
          <Circle
            cx={point.x}
            cy={point.y}
            fill={colors.chartLine}
            key={point.key}
            r={4}
          />
        ))}
        {points.map((point, index) => (
          <SvgText
            fill={colors.textMuted}
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
          <Text style={styles.legendText}>{t('student.volumeIntensityChart.copy001')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.rpeSwatch} />
          <Text style={styles.legendText}>{t('student.volumeIntensityChart.copy002')}</Text>
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 180,
  },
  emptyTitle: { color: colors.textPrimary, ...typography.bodyEmphasis },
  emptyBody: { color: colors.textMuted, textAlign: 'center', ...typography.footnote },
  legend: {
    flexDirection: 'row',
    gap: spacing.base,
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  legendItem: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  legendText: { color: colors.textSecondary, ...typography.caption },
  volumeSwatch: {
    backgroundColor: colors.goldSoft,
    borderRadius: radius.sm,
    height: 9,
    width: 18,
  },
  rpeSwatch: { backgroundColor: colors.chartLine, borderRadius: radius.pill, height: 8, width: 8 },
});
