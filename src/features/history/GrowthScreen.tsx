import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
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
  const chat = useOpenCoachChat(studentId);
  useFocusEffect(useCallback(() => {
    void screen(AnalyticsScreen.ProgressHistory);
    if (studentId) void client.invalidateQueries({ queryKey: feedbackKeys.list(studentId) });
  }, [client, studentId]));
  const values = vm.state.status === 'loaded' ? progressRowValues(vm.state) : null;
  const rows = [
    { id: 'e1rm', title: t('student.progressMenu.e1rm'), value: values?.e1rm ?? '', icon: 'chart-line', onPress: () => router.push('/progress/e1rm') },
    { id: 'history', title: t('student.e1rmSourceHistory'), value: values?.history ?? '', icon: 'clock-outline', onPress: () => router.push('/training-history') },
    { id: 'feedback', title: t('student.feedbackInboxView.copy006'), value: values?.feedback ?? '', emphasized: values?.feedbackEmphasized, icon: 'message-outline', onPress: () => router.navigate('/(student)/feedback') },
    { id: 'intensity', title: t('student.progressMenu.intensity'), value: values?.intensity ?? '', icon: 'chart-bar', onPress: () => router.push('/progress/intensity') },
  ] as const;
  return <Screen edges={['top', 'left', 'right']}>
    <ScrollView contentContainerStyle={{ gap: spacing.space3, paddingHorizontal: spacing.pageHorizontal, paddingTop: spacing.space2, paddingBottom: spacing.point28 }} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={vm.isRefreshing} onRefresh={() => void vm.refresh()} tintColor={colors.gold500} />}>
      <GrowthScreenHeader unreadCount={chat.totalUnread} onOpenChat={() => void chat.openCoachChat()} />
      {rows.map(({ id, ...row }) => <ProgressMenuRow key={id} {...row} />)}
      {vm.state.status === 'error' ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.space2 }}>
        <Text style={{ ...font.body(14), color: colors.textSecondary }}>{t('student.trainingHistoryView.copy022')}</Text>
        <AppButton label={t('student.trainingHistoryView.copy023')} onPress={() => void vm.reload()} />
      </View> : null}
    </ScrollView>
  </Screen>;
}
