import { View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import type { BodyWeightRecord } from '@/api/domains/body-weights';
import { font, useColors } from '@/design';
import { localDate } from '@/domain/coach/detail-week';
import { getLocale } from '@/i18n';
import { growthChartDateAxis, growthValueDomain, linePath, plotPoint } from './charts/growth-geometry';

export function BodyWeightChart({ records }: { records: readonly BodyWeightRecord[] }) {
  const colors = useColors();
  const axis = growthChartDateAxis(records.map(record => localDate(record.recorded_on)));
  const domain = growthValueDomain(records.map(record => Number(record.weight_kg)));
  const points = records.map(record => ({ ...record, ...plotPoint(localDate(record.recorded_on), Number(record.weight_kg), axis, domain) }));
  const dateText = (date: string) => new Intl.DateTimeFormat(getLocale(), { month: 'short', day: 'numeric' }).format(localDate(date));
  const last = points.at(-1);
  return <View style={{ width: '100%', aspectRatio: 320 / 118 }}>
    <Svg width="100%" height="100%" viewBox="0 0 320 118">
      {[domain.high, (domain.high + domain.low) / 2, domain.low].map((value, index) => {
        const y = 20 + index * 32;
        return <ViewlessGrid key={index} y={y} value={value.toFixed(2)} />;
      })}
      <Path d={linePath(points)} fill="none" stroke={colors.chartLine} strokeWidth={2.4} />
      {points.map((point, index) => <Circle key={point.recorded_on} accessibilityLabel={`${point.recorded_on}, ${point.weight_kg} kg`}
        cx={points.length === 1 ? 173 : point.x} cy={point.y} r={index === points.length - 1 ? 4 : 3}
        fill={index === points.length - 1 ? colors.gold500 : colors.surfaceCard} stroke={colors.chartLine} strokeWidth={1.2} />)}
      {last && points.length === 1 ? <SvgText x={173} y={last.y - 10} textAnchor="middle" fontFamily={font.mono(10, 'bold').fontFamily} fontSize={10} fill={colors.textSecondary}>{last.weight_kg}</SvgText> : null}
      {points.length ? <SvgText x={points.length === 1 ? 173 : 46} y={104} textAnchor={points.length === 1 ? 'middle' : 'start'} fontFamily={font.mono(9).fontFamily} fontSize={9} fill={colors.textMuted}>{dateText(points[0].recorded_on)}</SvgText> : null}
      {last && points.length > 1 ? <SvgText x={300} y={104} textAnchor="end" fontFamily={font.mono(9).fontFamily} fontSize={9} fill={colors.textMuted}>{dateText(last.recorded_on)}</SvgText> : null}
    </Svg>
  </View>;
}
function ViewlessGrid({ y, value }: { y: number; value: string }) {
  const colors = useColors();
  return <>
    <Line x1={46} x2={300} y1={y} y2={y} stroke={colors.borderSubtle} strokeWidth={1} />
    <SvgText x={41} y={y} alignmentBaseline="central" textAnchor="end" fontFamily={font.mono(9).fontFamily} fontSize={9} fill={colors.textMuted}>{value}</SvgText>
  </>;
}
