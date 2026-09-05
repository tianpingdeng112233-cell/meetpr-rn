import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { t } from '@/i18n';
import { lineSegments, symbolRadius, xTicks, yDomain, yTicks, type E1RMChartLineInterpolation } from './e1rm-chart';
import { useColors } from './theme';
import { font } from './tokens';

export type E1RMChartPointOrigin = 'logged' | 'imported';
export type E1RMChartPointConfidence = 'normal' | 'low';
export type { E1RMChartLineInterpolation } from './e1rm-chart';
export type E1RMChartPoint = {
  id: string;
  date: Date;
  e1RMKg: number;
  origin?: E1RMChartPointOrigin;
  confidence?: E1RMChartPointConfidence;
  winnerPointID?: string;
  marksRecord?: boolean;
};
export type E1RMChartProps = (
  | { points: readonly E1RMChartPoint[]; smoothed?: never; rawEligible?: never }
  | { points?: never; smoothed: readonly E1RMChartPoint[]; rawEligible: readonly E1RMChartPoint[] }
) & {
  height?: number;
  lineInterpolation?: E1RMChartLineInterpolation;
  onSelect?: (point: E1RMChartPoint) => void;
  testID?: string;
};

/** Coach samples default to logged/normal, with no records or tap interaction. */
export function E1RMChart(props: E1RMChartProps) {
  const { height = 90, lineInterpolation = 'curve', testID } = props;
  const colors = useColors();
  const [width, setWidth] = useState(0);
  const sorted = (points: readonly E1RMChartPoint[]) => [...points].sort((a, b) => a.date.getTime() - b.date.getTime());
  const smoothed = sorted(props.points ?? props.smoothed);
  const rawEligible = props.points ? smoothed : sorted(props.rawEligible);
  const all = [...smoothed, ...rawEligible];
  const domain = yDomain(all.map((point) => point.e1RMKg));
  const kilograms = yTicks(domain);
  const dates = xTicks(all.map((point) => point.date), 4);
  // Mono10 is ~6pt per character. Labels get at least 28pt; the plot has
  // 4pt edge insets and a separate 14pt band below it for the date labels.
  const labelWidth = Math.max(28, ...kilograms.map((value) => String(value).length * 6 + 8));
  const left = labelWidth + 4;
  const right = Math.max(left, width - 4);
  const top = 4;
  const bottom = Math.max(top, height - 14 - 4);
  const times = all.map((point) => point.date.getTime());
  const first = Math.min(...times);
  const last = Math.max(...times);
  const x = (date: Date) => first === last ? (left + right) / 2 : left + (date.getTime() - first) / (last - first) * (right - left);
  const y = (value: number) => bottom - (value - domain[0]) / (domain[1] - domain[0]) * (bottom - top);
  const positions = smoothed.map((point) => ({ x: x(point.date), y: y(point.e1RMKg) }));
  const baseColor = (point: E1RMChartPoint) => point.origin === 'imported' ? colors.textTertiary : colors.chartLine;
  const axisFont = font.mono(10, 'medium');
  // TODO: Add record dots (area 46), latest-record date/callout, imported
  // legend and nearest-point onSelect when a caller needs those signatures.
  return <View
    testID={testID}
    accessible
    accessibilityRole="image"
    accessibilityLabel={t(smoothed.length === 1 ? 'designSystem.e1rm.chartLabelOne %@' : 'designSystem.e1rm.chartLabel %@', [smoothed.length])}
    onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    style={{ height }}>
    {width > 0 && <Svg width={width} height={height} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {kilograms.map((value) => <YAxisTick key={value} value={value} y={y(value)} left={left} right={right} labelWidth={labelWidth} />)}
      {dates.map((date, index) => <SvgText
        key={date.getTime()} x={x(date)} y={height - 3}
        textAnchor={dates.length === 1 ? 'middle' : index === 0 ? 'start' : index === dates.length - 1 ? 'end' : 'middle'}
        fontFamily={axisFont.fontFamily} fontSize={10} fill={colors.textMuted}>
        {t('designSystem.date.monthDay %@ %@', [date.getMonth() + 1, date.getDate()])}
      </SvgText>)}
      {lineSegments(positions, lineInterpolation).map((d, index) => <Path
        key={smoothed[index + 1].id} d={d} fill="none" stroke={baseColor(smoothed[index + 1])}
        strokeOpacity={0.8} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray={smoothed[index + 1].origin === 'imported' ? [5, 3] : undefined} />)}
      {rawEligible.map((point) => {
        const cx = x(point.date);
        const cy = y(point.e1RMKg);
        const fill = baseColor(point);
        if (point.confidence === 'low') {
          const halfDiagonal = Math.sqrt(24 / 2);
          return <Path key={point.id} d={`M ${cx} ${cy - halfDiagonal} L ${cx + halfDiagonal} ${cy} L ${cx} ${cy + halfDiagonal} L ${cx - halfDiagonal} ${cy} Z`} fill={fill} opacity={0.35} />;
        }
        return <Circle key={point.id} cx={cx} cy={cy} r={symbolRadius(36)} fill={fill} opacity={point.origin === 'imported' ? 0.65 : 1} />;
      })}
    </Svg>}
  </View>;
}

function YAxisTick({ value, y, left, right, labelWidth }: { value: number; y: number; left: number; right: number; labelWidth: number }) {
  const colors = useColors();
  return <>
    <Line x1={left} x2={right} y1={y} y2={y} stroke={colors.borderSubtle} strokeWidth={1} />
    <SvgText x={labelWidth - 4} y={y + 3} textAnchor="end" fontFamily={font.mono(10, 'medium').fontFamily} fontSize={10} fill={colors.textMuted}>{String(value)}</SvgText>
  </>;
}
