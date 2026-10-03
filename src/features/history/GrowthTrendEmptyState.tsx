import { Text, View } from 'react-native';

import { font, useColors } from '@/design';
import { t } from '@/i18n';

export function GrowthTrendEmptyState() {
  const colors = useColors();
  return <View style={{ minHeight: 172, alignItems: 'center', justifyContent: 'center' }}>
    <Text accessibilityLabel={t('student.growthEmptyStates.copy002')} style={{ ...font.body(13), color: colors.textMuted, textAlign: 'center' }}>{t('student.growthEmptyStates.copy001')}</Text>
  </View>;
}
