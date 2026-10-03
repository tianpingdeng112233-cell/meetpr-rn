import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { useSessionStore } from '@/api/session';
import { AppButton, font, Screen, useColors } from '@/design';
import { t } from '@/i18n';
import { HistoryEntriesView } from './HistoryEntriesView';
import { useHistoryViewModel } from './use-history';

export function TrainingHistoryScreen() {
  const router = useRouter();
  const colors = useColors();
  const studentId = useSessionStore(state => state.user?.id ?? '');
  const vm = useHistoryViewModel(studentId);
  if (vm.state.status === 'loaded') return <HistoryEntriesView presentation="stack" visible weeks={vm.state.weeks} onClose={() => router.back()} />;
  return <Screen style={{ padding: 20, gap: 20 }}>
    <AppButton haptic="none" label={t('student.feedbackInboxView.copy005')} onPress={() => router.back()} />
    <Text style={{ ...font.body(19, 'bold'), color: colors.textPrimary }}>{t('student.e1rmSourceHistory')}</Text>
    {vm.state.status === 'error' ? <View style={{ gap: 16 }}>
      <Text style={{ ...font.body(14), color: colors.textSecondary }}>{t('student.trainingHistoryView.copy022')}</Text>
      <AppButton label={t('student.trainingHistoryView.copy023')} onPress={() => void vm.reload()} />
    </View> : <Text style={{ ...font.body(14), color: colors.textMuted }}>{t('student.trainingHistoryView.copy021')}</Text>}
  </Screen>;
}
