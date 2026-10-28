import { Text, View } from 'react-native';
import { Card, font, spacing, useColors } from '@/design';
import { getLocale, t } from '@/i18n';
import type { GrowthLoaded } from './types';
import { growthRangeLabel, LIFT_PRESENTATION, totalSnapshot, type GrowthTimeRange } from './model';
import { GrowthRangeControl } from './GrowthRangeControl';
import { GrowthE1RMChart } from './GrowthE1RMChart';

export function GrowthTotalCard({ curves, headlineKg, range, onRangeChange }: { curves: GrowthLoaded['curves']; headlineKg: number | null; range: GrowthTimeRange; onRangeChange: (range: GrowthTimeRange) => void }) {
  const colors = useColors();
  const snapshot = totalSnapshot(curves, range);
  const delta = snapshot.deltaKg;
  return <Card style={{ padding: spacing.space4, gap: spacing.space2, elevation: 0, shadowOpacity: 0 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.space2 }}>
      <Text style={{ ...font.mono(12, 'semibold'), color: colors.textSecondary, flexShrink: 1 }}>{t('student.progressMenu.totalTitle')}</Text>
      <GrowthRangeControl name={t('student.progressMenu.total')} range={range} onChange={onRangeChange} />
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.space1 }}>
      <Text style={{ ...font.mono(38, 'bold'), color: colors.textPrimary, flexShrink: 1 }}>{headlineKg?.toFixed(1) ?? '—'}</Text>
      <Text style={{ ...font.mono(15, 'semibold'), color: colors.textMuted }}>kg</Text>
      <View style={{ flex: 1 }} />
      {snapshot.state === 'chart' && delta !== null ? <Text style={{ ...font.mono(13, 'bold'), color: colors.goldText }}>{delta < 0 ? '−' : '+'}{Math.abs(delta).toFixed(1)}</Text> : null}
    </View>
    {snapshot.state === 'chart' ? <GrowthE1RMChart samples={snapshot.samples} /> : <View style={{ paddingVertical: spacing.xl, gap: spacing.space3 }}>
      <Text style={{ ...font.body(13), color: colors.textMuted, textAlign: 'center' }}>{snapshot.state === 'missing' ? t('student.progressMenu.totalEmpty') : t('student.growthScreenPresentation.copy004').replace('{window}', growthRangeLabel(range))}</Text>
      {snapshot.state === 'missing' ? <Text style={{ ...font.body(13), color: colors.textMuted, textAlign: 'center' }}>{t('student.progressMenu.missing', [snapshot.missing.map(family => LIFT_PRESENTATION[family].name).join(getLocale().startsWith('zh') ? '、' : ', ')])}</Text> : null}
    </View>}
  </Card>;
}
