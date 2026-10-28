import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSessionStore } from '@/api/session';
import { AnalyticsEvent, track } from '@/analytics';
import { Screen, StatTile, font, radius, spacing, typography, useColors } from '@/design';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { formatKg } from '@/features/dashboard/model';
import { t } from '@/i18n';
import type { LiftFamily } from '@/domain/e1rm';
import { GrowthE1RMCard } from './GrowthE1RMCard';
import { GrowthTotalCard } from './GrowthTotalCard';
import { GrowthSourceSheet } from './GrowthSourceSheet';
import { ProgressPageHeader } from './ProgressPageHeader';
import { ProgressLoadState } from './ProgressLoadState';
import { LIFT_FAMILIES, LIFT_PRESENTATION, type GrowthTimeRange } from './model';
import { growthSourceDetail } from './source-detail';
import { useHistoryViewModel } from './use-history';

export function E1RMScreen() {
  const colors = useColors();
  const router = useRouter();
  const studentId = useSessionStore(state => state.user?.id ?? '');
  const vm = useHistoryViewModel(studentId);
  const [segment, setSegment] = useState<'total' | LiftFamily>('total');
  const [range, setRange] = useState<GrowthTimeRange>('30');
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  useFocusEffect(useCallback(() => { void track(AnalyticsEvent.ProgressViewed, { tab: 'e1rm' }); }, []));
  const data = vm.state.status === 'loaded' ? vm.state : null;
  const point = selectedPointId ? data?.sourcePoints.get(selectedPointId) : null;
  const detail = point && data ? growthSourceDetail(point, data.logs, data.exerciseNames) : null;
  const changeRange = (next: GrowthTimeRange) => { setSelectedPointId(null); setRange(next); };
  return <Screen edges={['top', 'left', 'right']}>
    <ProgressPageHeader title={t('student.progressMenu.e1rm')} onBack={() => router.back()} />
    {data ? <ScrollView contentContainerStyle={{ padding: spacing.pageHorizontal, gap: spacing.space3, paddingBottom: spacing.xxl }}>
      <Text style={{ ...font.body(12), color: colors.textFaint }}>{t('student.trainingHistoryView.copy014')}</Text>
      <View style={{ flexDirection: 'row', gap: spacing.point6 }}>
        {(['total', ...LIFT_FAMILIES] as const).map(family => <Pressable key={family} accessibilityRole="button" accessibilityState={{ selected: segment === family }} onPress={() => { setSelectedPointId(null); setSegment(family); }} style={{ flex: 1, minHeight: spacing.minimumHitTarget, paddingVertical: spacing.space2, alignItems: 'center', justifyContent: 'center', backgroundColor: segment === family ? colors.ctaBackground : colors.surfaceCard, borderWidth: 1, borderColor: segment === family ? colors.ctaBackground : colors.borderDefault, borderRadius: radius.control }}>
          <Text style={{ ...font.body(13, 'bold'), textAlign: 'center', color: segment === family ? colors.ctaText : colors.textPrimary }}>{family === 'total' ? t('student.progressMenu.total') : family === 'bench' ? t('student.progressMenu.bench') : LIFT_PRESENTATION[family].name}</Text>
        </Pressable>)}
      </View>
      {segment === 'total' ? <>
        <GrowthTotalCard curves={data.curves} headlineKg={data.stats.sbdTotalKg} range={range} onRangeChange={changeRange} />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <StatTile label={t('student.trainingHistoryView.copy015')} value={data.stats.sbdTotalKg === null ? '—' : formatKg(data.stats.sbdTotalKg)} unit="kg" style={{ flex: 1, padding: spacing.space3, gap: spacing.space2 }} />
          <StatTile label={t('student.trainingHistoryView.copy016')} value={data.stats.trainingTotalKg === null ? '—' : formatKg(data.stats.trainingTotalKg)} unit="kg" style={{ flex: 1, padding: spacing.space3, gap: spacing.space2 }} />
        </View>
        {data.stats.sbdTotalKg !== null && data.stats.trainingTotalKg !== null && data.stats.trainingTotalKg > 0 && data.stats.sbdTotalKg > data.stats.trainingTotalKg ? <Text style={{ color: colors.success, ...typography.footnote }}>{t('student.trainingHistoryView.copy017', [Math.round(data.stats.sbdTotalKg / data.stats.trainingTotalKg * 100)])}</Text> : null}
      </> : <GrowthE1RMCard curve={data.curves[segment]} range={range} onRangeChange={changeRange} selectedPointId={selectedPointId} onSelect={sample => setSelectedPointId(sample.winnerPointId)} isZeroTraining={data.stats.trainingSessionCount === 0} onToday={() => router.navigate('/(student)/today')} />}
    </ScrollView> : <ProgressLoadState failed={vm.state.status === 'error'} onRetry={() => void vm.reload()} />}
    <GrowthSourceSheet detail={detail} onClose={() => setSelectedPointId(null)} />
  </Screen>;
}
