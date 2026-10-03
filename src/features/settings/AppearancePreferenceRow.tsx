import { Text, View } from 'react-native';
import { font, useTheme, type Appearance } from '@/design';
import { t } from '@/i18n';
import { PreferenceChip } from '@/features/profile/components';
export function AppearancePreferenceRow() {
  const { appearance, colors, setAppearance } = useTheme();
  return <View style={{ paddingVertical: 14, gap: 10 }}>
    <Text style={{ ...font.body(11), color: colors.textMuted }}>{t('student.appearancePreferenceRow.copy001')}</Text>
    <Text style={{ ...font.body(16, 'semibold'), color: colors.textPrimary }}>{t(`designSystem.appearance.${appearance}`)}</Text>
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>{(['system', 'light', 'dark'] as Appearance[]).map((value) => <PreferenceChip key={value} label={t(`designSystem.appearance.${value}`)} selected={appearance === value} onPress={() => setAppearance(value)} />)}</View>
  </View>;
}
