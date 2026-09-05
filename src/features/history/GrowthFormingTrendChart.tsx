import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';

import { font, useColors } from '@/design';

import { dayMonth, formingTrendGeometry } from './charts/growth-geometry';

export function GrowthFormingTrendChart({ recordedCount, threshold, currentKg, latestRecordDate, height = 68 }: {
  recordedCount: number;
  threshold: number;
  currentKg: number | null;
  latestRecordDate: Date | null;
  height?: number;
}) {
  const colors = useColors();
  const [width, setWidth] = useState(320);
  const geometry = formingTrendGeometry(width, height, recordedCount, threshold, currentKg);
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ height, width: '100%' }}>
    <Svg width="100%" height={height}>
      <Path d={geometry.axes} fill="none" stroke={colors.borderStrong} strokeWidth={1} />
      <Path d={geometry.middle} fill="none" stroke={colors.borderSubtle} strokeWidth={1} strokeDasharray={[3, 4]} />
      <Path d={geometry.ghost} fill="none" stroke={colors.borderStrong} strokeWidth={2} strokeLinecap="round" strokeDasharray={[2, 7]} />
      {geometry.points.map((point, index) => <G key={index}>
        {index < geometry.visibleCount ? <>
          <Circle cx={point.x} cy={point.y} r={4.5} fill={colors.gold500} stroke={colors.surfaceCard} strokeWidth={1.5} />
          {index === geometry.visibleCount - 1 ? <Circle cx={point.x} cy={point.y} r={9.5} fill="none" stroke={colors.goldRGB} strokeOpacity={0.35} strokeWidth={1.5} /> : null}
        </> : <Circle cx={point.x} cy={point.y} r={3.5} fill="none" stroke={colors.borderStrong} strokeWidth={1.5} />}
      </G>)}
      <G fontFamily={font.mono(10).fontFamily} fontSize={10}>
        {geometry.axisValues?.map((value, index) => <SvgText alignmentBaseline="central" key={index} x={geometry.axisX} y={geometry.axisYs[index]} textAnchor="end" fill={index === 1 ? colors.textMuted : colors.textTertiary}>{value}</SvgText>)}
        <SvgText alignmentBaseline="central" x={geometry.dateX} y={geometry.dateY} textAnchor="middle" fill={colors.textMuted}>{dayMonth(latestRecordDate)}</SvgText>
      </G>
    </Svg>
  </View>;
}
