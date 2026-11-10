import { Text, View } from 'react-native';
import { font, MeetPRMark, useColors } from '@/design';
import { t } from '@/i18n';
export function MyProfileHeader() {
  const colors = useColors();
  return <View style={{ gap: 14 }}><MeetPRMark /><Text accessibilityRole="header" style={{ ...font.display(34), color: colors.textPrimary }}>{t('student.myProfileView.copy016')}</Text></View>;
}
