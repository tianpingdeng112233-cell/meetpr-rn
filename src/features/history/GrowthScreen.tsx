import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { ApiError } from '@/api/client';
import { bodyWeightKeys, useBodyWeights } from '@/api/domains/body-weights';
import { bodyWeightRowValue } from './body-weight-model';
import { feedbackKeys } from '@/api/domains';
import { useSessionStore } from '@/api/session';
import { AnalyticsScreen, screen } from '@/analytics';
import { AppButton, Screen, font, spacing, useColors } from '@/design';
import { useOpenCoachChat } from '@/features/chat/open-coach-chat';
import { t } from '@/i18n';
import { GrowthScreenHeader } from './GrowthScreenHeader';
import { ProgressMenuRow } from './ProgressMenuRow';
import { progressRowValues } from './model';
import { useHistoryViewModel } from './use-history';

export function GrowthScreen() {
  const colors = useColors();
  const studentId = useSessionStore(state => state.user?.id ?? '');
  const router = useRouter();
  const client = useQueryClient();
  const vm = useHistoryViewModel(studentId);
  const weights = useBodyWeights(studentId);
  const missingWeights = weights.error instanceof ApiError && weights.error.status === 404;
  const weightValue = missingWeights ? '—' : weights.isPending || weights.isError ? '' : bodyWeightRowValue(weights.data.records);
  const refresh = () => Promise.all([vm.refresh(), weights.refetch()]);
  const reload = () => Promise.all([vm.reload(), weights.refetch()]);
  const chat = useOpenCoachChat(studentId);
  useFocusEffect(useCallback(() => {
    void screen(AnalyticsScreen.ProgressHistory);
    if (studentId) {
      void client.invalidateQueries({ queryKey: feedbackKeys.list(studentId) });
      void client.invalidateQueries({ queryKey: bodyWeightKeys.list(studentId) });
    }
  }, [client, studentId]));
  const values = vm.state.status === 'loaded' ? progressRowValues(vm.state) : null;
  const rows = [
    { id: 'e1rm', title: t('student.progressMenu.e1rm'), value: values?.e1rm ?? '', icon: 'chart-line', onPress: () => router.push('/progress/e1rm') },
    { id: 'history', title: t('student.e1rmSourceHistory'), value: values?.history ?? '', icon: 'clock-outline', onPress: () => router.push('/training-history') },
    { id: 'feedback', title: t('student.feedbackInboxView.copy006'), value: values?.feedback ?? '', emphasized: values?.feedbackEmphasized, icon: 'message-outline', onPress: () => router.navigate('/(student)/feedback') },
    { id: 'body-weight', title: t('student.dashboardProfileMetricsView.copy001'), value: weightValue, icon: 'scale-bathroom', onPress: () => router.push('/progress/body-weight') },
    { id: 'intensity', title: t('student.progressMenu.intensity'), value: values?.intensity ?? '', icon: 'chart-bar', onPress: () => router.push('/progress/intensity') },
  ] as const;
  return <Screen edges={['top', 'left', 'right']}>
    <ScrollView contentContainerStyle={{ gap: spacing.space3, paddingHorizontal: spacing.pageHorizontal, paddingTop: spacing.space2, paddingBottom: spacing.point28 }} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={vm.isRefreshing || weights.isRefetching} onRefresh={() => void refresh()} tintColor={colors.gold500} />}>
      <GrowthScreenHeader unreadCount={chat.totalUnread} onOpenChat={() => void chat.openCoachChat()} />
      {rows.map(({ id, ...row }) => <ProgressMenuRow key={id} {...row} />)}
      {vm.state.status === 'error' || weights.isError ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.space2 }}>
        <Text style={{ ...font.body(14), color: colors.textSecondary }}>{t('student.trainingHistoryView.copy022')}</Text>
        <AppButton label={t('student.trainingHistoryView.copy023')} onPress={() => void reload()} />
      </View> : null}
    </ScrollView>
  </Screen>;
}
