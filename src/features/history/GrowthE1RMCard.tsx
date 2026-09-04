import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppButton, Card, font, useColors } from '@/design';
import { getLocale, t } from '@/i18n';

import { E1RMChart } from './E1RMChart';
import { growthRangeLabel, growthSnapshot, LIFT_PRESENTATION, TREND_UNLOCK_THRESHOLD, type GrowthTimeRange } from './model';
import type { GrowthCurve } from './types';

export function GrowthE1RMCard({ curve, isZeroTraining, onToday }: { curve: GrowthCurve; isZeroTraining: boolean; onToday: () => void }) {
  const colors = useColors();
  const [range, setRange] = useState<GrowthTimeRange>('30');
  const snapshot = growthSnapshot(curve, range);
  const name = LIFT_PRESENTATION[curve.family].name;
  const rangeLabel = growthRangeLabel(range);
  const remaining = TREND_UNLOCK_THRESHOLD - snapshot.eligibleDataPointCount;
  const delta = snapshot.deltaKg;
  return <Card style={{ gap: 10, padding: 16 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <Text style={{ ...font.body(15, 'semibold'), color: colors.textPrimary, flexShrink: 1 }}>{name} E1RM</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={t('student.growthE1Rmcard.copy001', [name, rangeLabel])} accessibilityHint={t('student.growthE1Rmcard.copy002')} onPress={() => setRange(range === '30' ? '90' : range === '90' ? 'all' : '30')} style={{ backgroundColor: colors.surfaceElevated, borderColor: colors.borderStrong, borderWidth: 1, borderRadius: 99, paddingHorizontal: 12, minHeight: 44, justifyContent: 'center' }}>
        <Text style={{ ...font.body(12, 'medium'), color: colors.textSecondary }}>{rangeLabel} ⌄</Text>
      </Pressable>
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
      <Text style={{ ...font.display(28), color: colors.textPrimary }}>{snapshot.currentKg !== null ? snapshot.currentKg.toFixed(1) : snapshot.state === 'zero' ? t('student.growthE1Rmcard.copy004') : '—'}</Text>
      {snapshot.currentKg !== null ? <Text style={{ ...font.body(12), color: colors.textMuted }}>kg</Text> : null}
      <View style={{ flex: 1 }} />
      {snapshot.state === 'formingProgress' ? <Text style={{ ...font.body(12), color: colors.textMuted }}>{t('student.growthE1Rmcard.copy003')}</Text> : snapshot.state === 'chart' && delta !== null ? <Text style={{ ...font.mono(13, 'bold'), color: delta < 0 ? colors.danger : colors.success }}>{delta < 0 ? '−' : '+'}{Math.abs(delta).toFixed(1)}</Text> : null}
    </View>
    {snapshot.state === 'chart' ? <E1RMChart samples={snapshot.samples} rawEligiblePoints={snapshot.rawEligiblePoints} /> : snapshot.state === 'formingWindowSparse' ? <Text style={{ ...font.body(13), color: colors.textMuted, paddingVertical: 28 }}>{t('student.growthScreenPresentation.copy004').replace('{window}', rangeLabel)}</Text> : <>
      <E1RMChart samples={[]} rawEligiblePoints={[]} placeholder={snapshot.state} />
      {snapshot.state === 'zero' ? <>
        <Text style={{ ...font.body(14, 'semibold'), color: colors.textSecondary }}>{t('student.growthEmptyStates.copy006')}</Text>
        <Text style={{ ...font.body(12), color: colors.textMuted }}>{t('student.growthEmptyStates.copy008')}</Text>
        {curve.family === 'squat' && isZeroTraining ? <AppButton label={t('student.growthEmptyStates.copy009')} onPress={onToday} /> : null}
      </> : <>
        <Text style={{ ...font.body(13), color: colors.textSecondary }}>{t('student.growthEmptyStates.copy003')}<Text style={{ color: colors.goldText }}>{snapshot.eligibleDataPointCount}</Text>{t('student.growthEmptyStates.copy004')}<Text style={{ color: colors.goldText }}>{remaining}</Text>{t(remaining === 1 ? 'student.growthEmptyStates.copy005.one' : 'student.growthEmptyStates.copy005', [name])}</Text>
        {snapshot.latestRecordDate ? <Text style={{ ...font.mono(11), color: colors.textMuted }}>{new Intl.DateTimeFormat(getLocale(), { month: 'short', day: 'numeric' }).format(snapshot.latestRecordDate)}</Text> : null}
      </>}
    </>}
  </Card>;
}
