import { Text, View } from 'react-native';
import { font, MeetPRMark, useColors } from '@/design';
import { t } from '@/i18n';
export function GrowthScreenHeader() {
  const colors = useColors();
  return <View style={{ gap: 14 }}><MeetPRMark testID="growth-header-mark" /><Text accessibilityRole="header" style={{ ...font.display(34), color: colors.textPrimary }}>{t('student.trainingHistoryView.copy013')}</Text></View>;
}
