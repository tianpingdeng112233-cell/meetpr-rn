import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppButton, Card, font, radius, spacing, useColors } from '@/design';
import { t } from '@/i18n';

import { GrowthE1RMChart } from './GrowthE1RMChart';
import { GrowthFormingTrendChart } from './GrowthFormingTrendChart';
import { GrowthZeroGhostChart } from './GrowthZeroGhostChart';
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
  return <Card style={{ paddingHorizontal: spacing.space4, paddingVertical: spacing.space4, elevation: 0, shadowOpacity: 0 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.space2, height: spacing.minimumHitTarget, marginTop: -9 }}>
      <Text style={{ ...font.mono(12, 'semibold'), color: colors.textSecondary, flexShrink: 1 }}>{name} E1RM</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={t('student.growthE1Rmcard.copy001', [name, rangeLabel])} accessibilityHint={t('student.growthE1Rmcard.copy002')} onPress={() => setRange(range === '30' ? '90' : range === '90' ? 'all' : '30')} style={{ minHeight: spacing.minimumHitTarget, justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.space1, height: 22, paddingLeft: 10, paddingRight: 5, backgroundColor: colors.surfaceElevated, borderColor: colors.borderStrong, borderWidth: 1, borderRadius: radius.pill }}>
          <Text style={{ ...font.mono(11), color: colors.textSecondary }}>{rangeLabel}</Text>
          <MaterialCommunityIcons name="chevron-down" size={10} color={colors.gold500} />
        </View>
      </Pressable>
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.space1 }}>
      <Text adjustsFontSizeToFit numberOfLines={1} style={{ ...font.mono(38, 'bold'), color: colors.textPrimary, flexShrink: 1 }}>{snapshot.currentKg !== null ? snapshot.currentKg.toFixed(1) : snapshot.state === 'zero' ? t('student.growthE1Rmcard.copy004') : '—'}</Text>
      <Text style={{ ...font.mono(15, 'semibold'), color: colors.textMuted }}>kg</Text>
      <View style={{ flex: 1 }} />
      {snapshot.state === 'formingProgress' ? <Text style={{ ...font.mono(12), color: colors.textMuted }}>{t('student.growthE1Rmcard.copy003')}</Text> : snapshot.state === 'chart' && delta !== null ? <Text style={{ ...font.mono(13, 'bold'), color: colors.goldText }}>{delta < 0 ? '−' : '+'}{Math.abs(delta).toFixed(1)}</Text> : null}
    </View>
    {snapshot.state === 'chart' ? <View style={{ paddingTop: spacing.space2 }}><GrowthE1RMChart samples={snapshot.samples} rawEligiblePoints={snapshot.rawEligiblePoints} /></View> : snapshot.state === 'formingWindowSparse' ? <View style={{ height: 126, justifyContent: 'center' }}>
      <Text style={{ ...font.body(13), color: colors.textMuted, textAlign: 'center' }}>{t('student.growthScreenPresentation.copy004').replace('{window}', rangeLabel)}</Text>
    </View> : snapshot.state === 'zero' ? <View style={{ height: 228, gap: 10, alignItems: 'center', justifyContent: 'center' }}>
      <GrowthZeroGhostChart />
      <Text style={{ ...font.body(14, 'semibold'), color: colors.textSecondary, textAlign: 'center' }}>{t('student.growthEmptyStates.copy006')}</Text>
      <Text style={{ ...font.body(12), color: colors.textMuted, textAlign: 'center' }}>{t('student.growthEmptyStates.copy008')}</Text>
      {curve.family === 'squat' && isZeroTraining ? <AppButton label={t('student.growthEmptyStates.copy009')} onPress={onToday} /> : null}
    </View> : <View style={{ height: 126, paddingTop: 8, gap: 10 }}>
      <GrowthFormingTrendChart recordedCount={snapshot.eligibleDataPointCount} threshold={TREND_UNLOCK_THRESHOLD} currentKg={snapshot.currentKg} latestRecordDate={snapshot.latestRecordDate} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: colors.bgInset, borderRadius: 10 }}>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {Array.from({ length: TREND_UNLOCK_THRESHOLD }, (_, index) => <View key={index} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: index < snapshot.eligibleDataPointCount ? colors.gold500 : 'transparent', borderWidth: index < snapshot.eligibleDataPointCount ? 0 : 1, borderColor: colors.borderStrong }} />)}
        </View>
        <Text numberOfLines={2} ellipsizeMode="tail" style={{ ...font.body(12), color: colors.textTertiary, flex: 1 }}>{t('student.growthEmptyStates.copy003')}<Text style={{ ...font.mono(12), color: colors.textPrimary }}>{snapshot.eligibleDataPointCount}/{TREND_UNLOCK_THRESHOLD}</Text>{t('student.growthEmptyStates.copy004')}<Text style={{ ...font.mono(12), color: colors.textPrimary }}>{remaining}</Text>{t(remaining === 1 ? 'student.growthEmptyStates.copy005.one' : 'student.growthEmptyStates.copy005', [name])}</Text>
      </View>
    </View>}
  </Card>;
}
