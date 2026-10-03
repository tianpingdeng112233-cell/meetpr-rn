import { useId, useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import { font, radius, spacing, useColors } from '@/design';
import { t } from '@/i18n';

import { volumeChartGeometry } from './charts/volume-geometry';
import { GrowthTrendEmptyState } from './GrowthTrendEmptyState';
import type { VolumeIntensitySeries } from './types';

export function VolumeIntensityChart({ series, isUnlocked }: { series: VolumeIntensitySeries; isUnlocked: boolean }) {
  const colors = useColors();
  const gradientId = `volume-bars-${useId().replace(/:/g, '')}`;
  const isEmpty = !isUnlocked || series.points.length === 0;
  const [width, setWidth] = useState(320);
  const geometry = volumeChartGeometry(series.points, width);
  return <View accessible accessibilityLabel={t(isEmpty ? 'student.volumeIntensityChart.copy003' : 'student.volumeIntensityChart.copy004', [series.points.length])} style={{ gap: 9 }}>
    {isEmpty ? <GrowthTrendEmptyState /> : <>
      <View onLayout={event => setWidth(event.nativeEvent.layout.width)} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: '100%', aspectRatio: 320 / 172 }}>
        <Svg width="100%" height="100%" viewBox="0 0 320 172">
          <Defs>
            <LinearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1={0} x2={0} y1={18} y2={146}>
              <Stop offset={0} stopColor={colors.gold400} />
              <Stop offset={1} stopColor={colors.goldBarDeep} stopOpacity={0.28} />
            </LinearGradient>
          </Defs>
          <Path d={geometry.grid} stroke={colors.surfaceRaised} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <Path d={geometry.baseline} stroke={colors.borderStrong} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          {geometry.bars.map(bar => <Path key={bar.key} d={bar.path} fill={`url(#${gradientId})`} />)}
          <Path d={geometry.rpeLine} fill="none" stroke={colors.bgBase} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          <Path d={geometry.rpeLine} fill="none" stroke={colors.chartLine} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
          {geometry.rpePoints.map(point => <Circle key={point.key} cx={point.x} cy={point.y} r={2.6} fill={colors.chartLine} stroke={colors.bgBase} strokeWidth={1.2} />)}
          <G fontFamily={font.mono(9, 'medium').fontFamily} fontSize={geometry.axisFontSize} textAnchor="middle">
            {geometry.volumeLabels.map(label => <SvgText alignmentBaseline="central" key={label.y} x={label.x} y={label.y} fill={colors.textMuted}>{label.text}</SvgText>)}
            {geometry.rpeLabels.map(label => <SvgText alignmentBaseline="central" key={label.y} x={label.x} y={label.y} fill={colors.chartLine}>{label.text}</SvgText>)}
            {geometry.dates.map(label => <SvgText alignmentBaseline="central" key={label.key} x={label.x} y={label.y} opacity={label.opacity} fontSize={geometry.dateFontSize} fill={colors.textMuted}>{label.text}</SvgText>)}
          </G>
        </Svg>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.space4, paddingLeft: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 9, height: 9, borderRadius: radius.micro, backgroundColor: colors.gold500 }} />
          <Text style={{ ...font.mono(11), color: colors.textMuted }}>{t('student.volumeIntensityChart.copy001')}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 9, height: 9, borderRadius: radius.pill, backgroundColor: colors.chartLine }} />
          <Text style={{ ...font.mono(11), color: colors.textMuted }}>{t('student.volumeIntensityChart.copy002')}</Text>
        </View>
      </View>
    </>}
  </View>;
}
