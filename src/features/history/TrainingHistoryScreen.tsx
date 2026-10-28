import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useSessionStore } from '@/api/session';
import { AnalyticsEvent, track } from '@/analytics';
import { Screen } from '@/design';
import { t } from '@/i18n';
import { HistoryEntriesView } from './HistoryEntriesView';
import { ProgressPageHeader } from './ProgressPageHeader';
import { ProgressLoadState } from './ProgressLoadState';
import { useHistoryViewModel } from './use-history';

export function TrainingHistoryScreen() {
  const router = useRouter();
  const studentId = useSessionStore(state => state.user?.id ?? '');
  const vm = useHistoryViewModel(studentId);
  useFocusEffect(useCallback(() => { void track(AnalyticsEvent.ProgressViewed, { tab: 'history' }); }, []));
  if (vm.state.status === 'loaded') return <HistoryEntriesView presentation="stack" visible weeks={vm.state.weeks} stats={vm.state.stats} onClose={() => router.back()} />;
  return <Screen edges={['top', 'left', 'right']}>
    <ProgressPageHeader title={t('student.e1rmSourceHistory')} onBack={() => router.back()} />
    <ProgressLoadState failed={vm.state.status === 'error'} onRetry={() => void vm.reload()} />
  </Screen>;
}
