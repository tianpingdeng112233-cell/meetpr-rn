import { View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { useColors } from '@/design';
import type { E1RMSample } from '@/domain/e1rm';
import { getLocale, t } from '@/i18n';

export function E1RMChart({ samples, rawEligiblePoints, height = 118, placeholder }: {
  samples: readonly E1RMSample[];
  rawEligiblePoints: readonly E1RMSample[];
  height?: number;
  placeholder?: 'zero' | 'formingProgress';
}) {
  const colors = useColors();
  const points = [...samples, ...rawEligiblePoints];
  const dates = points.map(point => point.date.getTime());
  const values = points.map(point => point.valueKg);
  const minX = Math.min(...dates), maxX = Math.max(...dates);
  const minY = Math.min(...values), maxY = Math.max(...values);
  const x = (point: E1RMSample) => maxX === minX ? 160 : 18 + (point.date.getTime() - minX) / (maxX - minX) * 284;
  const y = (point: E1RMSample) => maxY === minY ? 55 : 14 + (1 - (point.valueKg - minY) / (maxY - minY)) * 72;
  const path = samples.map((point, index) => `${index ? 'L' : 'M'} ${x(point)} ${y(point)}`).join(' ');
  const current = samples.at(-1);
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ backgroundColor: colors.bgInset, borderRadius: 10 }}>
    <Svg height={height} width="100%" viewBox="0 0 320 118" preserveAspectRatio="none">
      {[28, 58, 88].map(row => <Line key={row} x1={12} x2={308} y1={row} y2={row} stroke={colors.chartLine} strokeWidth={0.5} />)}
      {placeholder ? <Path d="M 18 82 C 70 80 80 60 125 64 S 205 32 302 24" stroke={colors.gold500} opacity={placeholder === 'zero' ? 0.2 : 0.5} strokeDasharray="4 5" strokeWidth={2} fill="none" /> : <>
        <Path d={path} stroke={colors.gold500} strokeWidth={2} strokeLinejoin="round" fill="none" />
        {rawEligiblePoints.map(point => <Circle key={point.sampleId} cx={x(point)} cy={y(point)} r={2.5} fill={colors.gold500} opacity={point.winnerConfidence === 'low' ? 0.3 : 0.65} />)}
        {current ? <Circle cx={x(current)} cy={y(current)} r={4} fill={colors.gold500} stroke={colors.surfaceCard} strokeWidth={1.5} /> : null}
      </>}
      <SvgText x={12} y={11} fontSize={8} fill={colors.textMuted}>{t('student.growthE1Rmcard.copy006')}</SvgText>
      <SvgText x={308} y={112} textAnchor="end" fontSize={8} fill={colors.textMuted}>{t('student.growthE1Rmcard.copy007')}</SvgText>
      {!placeholder && samples[0] ? <SvgText x={12} y={112} fontSize={8} fill={colors.textMuted}>{new Intl.DateTimeFormat(getLocale(), { month: 'short', day: 'numeric' }).format(samples[0].date)}</SvgText> : null}
    </Svg>
  </View>;
}
