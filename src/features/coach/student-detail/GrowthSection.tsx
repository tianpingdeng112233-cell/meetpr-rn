import { View, Text } from 'react-native';
import type { CoachExerciseStats } from '@/api/domains/coach';
import { Card, font, Sparkline, useColors } from '@/design';
import { coachLiftFamilies, e1rmTotals, formatE1RM, trendArrow } from '@/domain/coach/coach-e1rm';
import { t } from '@/i18n';
import { Copy, Empty, Progress, styles } from './components';
import { deviceLocale } from './presentation';

export function GrowthSection({ stats }: { stats: CoachExerciseStats }) {
  const colors = useColors();
  const totals = e1rmTotals(stats);
  const format = (value: number | null) => formatE1RM(value, deviceLocale());
  if (coachLiftFamilies.every((family) => !stats.e1rm_series?.[family]?.points.length)) return <Empty title={t('coach.growth.empty')} />;
  return <View style={styles.stack}>
    <Card fill={colors.textPrimary} style={{ gap: 10 }}>
      <Copy mono size={12} tone="inkOnCTAFill">{t('coach.growth.totalE1RM')}</Copy>
      <Text style={{ ...font.display(34), color: colors.inkOnCTAFill }}>{format(totals.latestTotal)} <Copy tone="inkOnCTAFill">kg</Copy></Text>
      <Progress value={totals.progress} inverse />
      <View style={styles.between}><Copy size={11} tone="inkOnCTAFill">{t('coach.growth.totalProgress %@', [new Intl.NumberFormat(deviceLocale(), { style: 'percent', maximumFractionDigits: 0 }).format(totals.progress)])}</Copy><Copy size={11} tone="inkOnCTAFill">{t('coach.growth.oneRMTotal %@', [format(totals.oneRMTotal)])}</Copy></View>
    </Card>
    {coachLiftFamilies.map((family) => {
      const value = stats.e1rm?.[family];
      const series = stats.e1rm_series?.[family];
      const trend = series?.trend ?? 'unknown';
      const arrow = trendArrow(trend);
      const trendKey = trend === 'up' ? 'coach.growth.trend.up' : trend === 'down' ? 'coach.growth.trend.down' : 'coach.growth.trend.flat';
      return <Card key={family} style={{ gap: 10 }}>
        <Copy mono size={12} bold>{t(`coach.growth.family.${family}`)}</Copy>
        <View style={styles.between}>{value ? <Text style={{ ...font.display(30), color: colors.textPrimary }}>{format(Number(value.value))} <Copy>kg</Copy></Text> : <Copy tone="textTertiary">{t('coach.growth.noFamilyData')}</Copy>}
          {arrow && <Copy size={24} tone={trend === 'up' ? 'success' : trend === 'down' ? 'danger' : 'textTertiary'} accessibilityLabel={t(trendKey)}>{arrow}</Copy>}
        </View>
        {!!series?.points.length && <Sparkline height={90} data={series.points.map((point) => ({ x: new Date(`${point.date}T00:00:00Z`).getTime(), y: Number(point.value) }))} />}
      </Card>;
    })}
  </View>;
}
