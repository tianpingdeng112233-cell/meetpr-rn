import { useId, useState } from 'react';
import { View } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { font, useColors } from '@/design';
import type { E1RMSample } from '@/domain/e1rm';
import { getLocale, t } from '@/i18n';

import { growthChartGeometry, growthValueDomain, growthChartDateAxis, plotPoint } from './charts/growth-geometry';

export function GrowthE1RMChart({ samples, rawEligiblePoints, onSelect, selectedPointId }: {
  selectedPointId?: string | null;
  onSelect?: (sample: E1RMSample) => void;
  samples: readonly E1RMSample[];
  rawEligiblePoints: readonly E1RMSample[];
}) {
  const colors = useColors();
  const gradientId = `growth-area-${useId().replace(/:/g, '')}`;
  const [width, setWidth] = useState(320);
  const geometry = growthChartGeometry(samples, rawEligiblePoints, width);
  const current = geometry.current;
  const all = [...samples, ...rawEligiblePoints];
  const axis = growthChartDateAxis(all.map(point => point.date));
  const domain = growthValueDomain(all.map(point => point.valueKg));
  const positions = rawEligiblePoints.map(sample => ({ sample, ...plotPoint(sample.date, sample.valueKg, axis, domain) }));
  return <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ width: '100%', aspectRatio: 320 / 118 }}>
    <Svg accessibilityElementsHidden importantForAccessibility="no-hide-descendants" width="100%" height="100%" viewBox="0 0 320 118">
      <Defs>
        <LinearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1={0} x2={0} y1={20} y2={84}>
          <Stop offset={0} stopColor={colors.gold500} stopOpacity={0.22} />
          <Stop offset={0.72} stopColor={colors.gold500} stopOpacity={0.04} />
          <Stop offset={1} stopColor={colors.gold500} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={geometry.axes} fill="none" stroke={colors.textGhost} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <Path d={geometry.middle} fill="none" stroke={colors.borderSubtle} strokeWidth={1} strokeDasharray={[3, 4]} vectorEffect="non-scaling-stroke" />
      <Path d={geometry.area} fill={`url(#${gradientId})`} />
      <Path d={geometry.line} fill="none" stroke={colors.chartLine} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {geometry.raw.map((point, index) => <Path key={rawEligiblePoints[index].sampleId} d={point.diamond} fill={point.origin === 'imported' ? colors.textTertiary : colors.chartLine} opacity={0.35} />)}
      {samples.slice(0, -1).map(sample => {
        const point = plotPoint(sample.date, sample.valueKg, axis, domain);
        return <Circle key={sample.sampleId} cx={point.x} cy={point.y} r={3.2} fill={colors.surfaceCard} stroke={colors.chartLine} strokeWidth={1.2} />;
      })}
      {current ? <>
        <Path d={current.guide} stroke={colors.gold500} strokeOpacity={0.6} strokeWidth={1} strokeDasharray={[2, 3]} vectorEffect="non-scaling-stroke" />
        <Circle cx={current.x} cy={current.y} r={4.5} fill={colors.gold500} stroke={colors.surfaceCard} strokeWidth={1.5} />
      </> : null}
      {positions.filter(({ sample }) => sample.winnerPointId === selectedPointId).map(({ sample, x, y }) => <Circle key={`selected-${sample.winnerPointId}`} testID="growth-selected-node" cx={x} cy={y} r={4.5} fill={colors.gold500} stroke={colors.surfaceCard} strokeWidth={1.5} />)}
      <G fontFamily={font.mono(9, 'medium').fontFamily} fontSize={geometry.axisFontSize} textAnchor="middle">
        {geometry.yLabels.map((label, index) => <SvgText alignmentBaseline="central" key={label.y} x={label.x} y={label.y} fill={index === 1 ? colors.textDim : colors.textTertiary}>{label.text}</SvgText>)}
        <SvgText alignmentBaseline="central" x={13} y={54} rotation={-90} origin="13,54" fontSize={8.5} fill={colors.textMuted}>{t('student.growthE1Rmcard.copy006')}</SvgText>
        <SvgText alignmentBaseline="central" x={175} y={114} fontSize={8.5} fill={colors.textMuted}>{t('student.growthE1Rmcard.copy007')}</SvgText>
        {geometry.dates.map(label => <SvgText alignmentBaseline="central" key={label.x} x={label.x} y={label.y} fontFamily={font.mono(9).fontFamily} textAnchor={label.anchor} fill={colors.textMuted}>{label.text}</SvgText>)}
      </G>
      {current ? <G>
        <Rect {...current.label.background} fill={colors.surfaceCard} fillOpacity={0.9} />
        <SvgText alignmentBaseline="central" x={current.label.x} y={current.label.y} fontFamily={font.mono(10, 'bold').fontFamily} fontSize={10} textAnchor="middle" fill={colors.gold500}>{current.label.text}</SvgText>
      </G> : null}
    </Svg>
    {onSelect ? positions.map(({ sample, x, y }) => <Pressable feedback="none"
      key={sample.sampleId}
      testID={`growth-point-${sample.winnerPointId}`}
      accessibilityRole="button"
      accessibilityState={{ selected: sample.winnerPointId === selectedPointId }}
      accessibilityLabel={t('student.e1rmSourceAccessibility', [sample.date.toLocaleDateString(getLocale()), sample.winnerOrigin === 'imported' ? t('student.e1rmSourceImported') : t('student.e1rmSourceDailyBest'), sample.valueKg.toFixed(1)])}
      onPress={event => {
        if (!event?.nativeEvent || event.nativeEvent.locationX == null) { onSelect(sample); return; }
        const tapX = x + (event.nativeEvent.locationX - 24) * 320 / width;
        const tapY = y + (event.nativeEvent.locationY - 24) * 320 / width;
        const nearest = positions.reduce((best, point) => Math.hypot(point.x - tapX, point.y - tapY) < Math.hypot(best.x - tapX, best.y - tapY) ? point : best);
        onSelect(nearest.sample);
      }}
      style={{ position: 'absolute', left: x * width / 320 - 24, top: y * width / 320 - 24, width: 48, height: 48 }}
    />) : null}
  </View>;
}
