import { ActivityIndicator, View, Text } from 'react-native';
import type { CoachExerciseStats } from '@/api/domains/coach';
import { AppButton, Card, E1RMChart, font, useColors } from '@/design';
import { coachLiftFamilies, e1rmTotals, formatE1RM, trendArrow } from '@/domain/coach/coach-e1rm';
import { localDate } from '@/domain/coach/detail-week';
import { t } from '@/i18n';
import { Copy, Progress, styles } from './components';
import { deviceLocale } from './presentation';

type GrowthSectionProps = {
  stats?: CoachExerciseStats;
  state?: 'loading' | 'failed' | 'loaded';
  onRetry?: () => void;
};

export function GrowthSection({ stats, state = 'loaded', onRetry }: GrowthSectionProps) {
  const colors = useColors();
  if (state === 'loading') return <View style={{ alignItems: 'center', paddingTop: 32 }}><ActivityIndicator color={colors.gold500} /></View>;
  if (state === 'failed') return <View style={{ alignItems: 'center', paddingTop: 32, gap: 10 }}>
    <Copy size={15} bold tone="textTertiary" style={{ textAlign: 'center' }}>{t('coach.growth.error.load')}</Copy>
    <AppButton label={t('coach.detail.retry')} fullWidth={false} onPress={onRetry} style={{ alignSelf: 'center' }} />
  </View>;
  return stats ? <GrowthContent stats={stats} /> : null;
}

function GrowthContent({ stats }: { stats: CoachExerciseStats }) {
  const colors = useColors();
  const totals = e1rmTotals(stats);
  const format = (value: number | null) => formatE1RM(value, deviceLocale());
  if (coachLiftFamilies.every((family) => !stats.e1rm_series?.[family]?.points.length)) return <View style={{ alignItems: 'center', paddingTop: 32 }}>
    <Copy size={15} bold tone="textTertiary" style={{ textAlign: 'center' }}>{t('coach.growth.empty')}</Copy>
  </View>;
  return <View style={styles.stack}>
    <Card fill={colors.textPrimary} style={{ gap: 7, paddingVertical: 16, paddingHorizontal: 16 }}>
      <Copy mono size={12} tone="textDisabled">{t('coach.growth.totalE1RM')}</Copy>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <Text style={{ ...font.display(34), color: colors.inkOnCTAFill }}>{format(totals.latestTotal)}</Text>
        <Copy size={13} tone="textDisabled">kg</Copy>
      </View>
      <Progress value={totals.progress} inverse />
      <View style={styles.between}><Copy size={11} tone="textDisabled">{t('coach.growth.totalProgress %@', [new Intl.NumberFormat(deviceLocale(), { style: 'percent', maximumFractionDigits: 0 }).format(totals.progress)])}</Copy><Copy mono size={11} tone="textDisabled">{t('coach.growth.oneRMTotal %@', [format(totals.oneRMTotal)])}</Copy></View>
    </Card>
    {coachLiftFamilies.map((family) => {
      const value = stats.e1rm?.[family];
      const series = stats.e1rm_series?.[family];
      const trend = series?.trend ?? 'unknown';
      const arrow = trendArrow(trend);
      const trendKey = trend === 'up' ? 'coach.growth.trend.up' : trend === 'down' ? 'coach.growth.trend.down' : 'coach.growth.trend.flat';
      return <Card key={family} style={{ gap: 6, paddingVertical: 15, paddingHorizontal: 15 }}>
        <Copy tone="textSecondary" style={font.mono(12, 'semibold')}>{t(`coach.growth.family.${family}`)}</Copy>
        <View style={[styles.between, { alignItems: 'baseline' }]}>
          {value ? <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <Text style={{ ...font.display(30), color: colors.textPrimary }}>{format(Number(value.value))}</Text>
            <Copy size={13} tone="textTertiary">kg</Copy>
          </View> : <Copy size={15} bold tone="textTertiary">{t('coach.growth.noFamilyData')}</Copy>}
          {arrow && <Copy mono bold size={16} tone={trend === 'up' ? 'success' : trend === 'down' ? 'danger' : 'textTertiary'} accessibilityLabel={t(trendKey)}>{arrow}</Copy>}
        </View>
        {!!series?.points.length && <E1RMChart testID={`coach.growth.chart.${family}`} height={90} points={series.points.map((point) => ({ id: `${family}-${point.date}`, date: localDate(point.date), e1RMKg: Number(point.value) }))} />}
      </Card>;
    })}
  </View>;
}
