import { Text, View } from 'react-native';
import { Card, font, spacing, useColors } from '@/design';
import { getLocale, t } from '@/i18n';
import type { GrowthStats } from './types';

export function HistoryStatsCard({ stats }: { stats: GrowthStats }) {
  const dimmed = stats.trainingSessionCount === 0;
  return <Card style={{ flexDirection: 'row', gap: spacing.sm, padding: spacing.space4, elevation: 0, shadowOpacity: 0 }}>
    <StatCard label={t('student.trainingHistoryView.copy018')} value={dimmed ? '—' : String(stats.trainingSessionCount)} dimmed={dimmed} />
    <StatCard label={t('student.trainingHistoryView.copy019')} value={dimmed ? '—' : String(stats.trainingWeekCount)} dimmed={dimmed} />
    <StatCard label={t('student.trainingHistoryView.copy020')} value={dimmed ? '—' : stats.totalVolumeKg.toLocaleString(getLocale(), { maximumFractionDigits: 0 })} unit="kg" dimmed={dimmed} />
  </Card>;
}

function StatCard({ label, value, unit, dimmed }: { label: string; value: string; unit?: string; dimmed: boolean }) {
  const colors = useColors();
  return <View style={{ alignItems: 'flex-start', flex: 1, gap: spacing.space1 }}>
    <Text style={{ color: colors.textMuted, ...font.body(11) }}>{label}</Text>
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.point2, maxWidth: '100%' }}>
      <Text adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={1} style={{ color: dimmed ? colors.textDim : colors.textPrimary, ...font.mono(30, 'bold'), flexShrink: 1 }}>{value}</Text>
      {unit ? <Text style={{ color: dimmed ? colors.textDim : colors.textMuted, ...font.mono(12, 'semibold') }}>{unit}</Text> : null}
    </View>
  </View>;
}
