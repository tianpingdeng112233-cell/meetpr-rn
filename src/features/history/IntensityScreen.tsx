import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, Text } from 'react-native';
import { useSessionStore } from '@/api/session';
import { AnalyticsEvent, track } from '@/analytics';
import { Card, Screen, font, spacing, useColors } from '@/design';
import { t } from '@/i18n';
import { ProgressPageHeader } from './ProgressPageHeader';
import { ProgressLoadState } from './ProgressLoadState';
import { VolumeIntensityChart } from './VolumeIntensityChart';
import { useHistoryViewModel } from './use-history';

export function IntensityScreen() {
  const colors = useColors();
  const router = useRouter();
  const studentId = useSessionStore(state => state.user?.id ?? '');
  const vm = useHistoryViewModel(studentId);
  useFocusEffect(useCallback(() => { void track(AnalyticsEvent.ProgressViewed, { tab: 'volume' }); }, []));
  return <Screen edges={['top', 'left', 'right']}>
    <ProgressPageHeader title={t('student.progressMenu.intensity')} onBack={() => router.back()} />
    {vm.state.status === 'loaded' ? <ScrollView contentContainerStyle={{ padding: spacing.pageHorizontal, paddingBottom: spacing.xxl }}>
      <Card style={{ paddingHorizontal: spacing.point14, paddingTop: spacing.point15, paddingBottom: spacing.space3, gap: spacing.space3 }}>
        <Text style={{ ...font.mono(13), color: colors.textSecondary }}>{t('student.trainingHistoryView.copy008')}</Text>
        <VolumeIntensityChart series={vm.state.volumeIntensity} isUnlocked={vm.state.stats.unlocksTrends} />
      </Card>
    </ScrollView> : <ProgressLoadState failed={vm.state.status === 'error'} onRetry={() => void vm.reload()} />}
  </Screen>;
}
