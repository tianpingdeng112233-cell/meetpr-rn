import { Text, View } from 'react-native';
import { AppButton, font, spacing, useColors } from '@/design';
import { t } from '@/i18n';

export function ProgressLoadState({ failed, onRetry }: { failed: boolean; onRetry: () => void }) {
  const colors = useColors();
  return <View style={{ gap: spacing.base, padding: spacing.pageHorizontal }}>
    <Text style={{ ...font.body(14), color: failed ? colors.textSecondary : colors.textMuted }}>{t(failed ? 'student.trainingHistoryView.copy022' : 'student.trainingHistoryView.copy021')}</Text>
    {failed ? <AppButton label={t('student.trainingHistoryView.copy023')} onPress={onRetry} /> : null}
  </View>;
}
