import { Text, View } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { font, useTheme, type Appearance } from '@/design';
import { t } from '@/i18n';

/** Profile-only presentation; appearance selection still uses the shared theme store. */
export function MyProfileAppearanceRow() {
  const { appearance, colors, setAppearance } = useTheme();
  return <View accessibilityLabel={t('student.appearancePreferenceRow.copy002', [t(`designSystem.appearance.${appearance}`)])} style={{ paddingHorizontal: 16, paddingVertical: 14, minHeight: 68, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
    <View style={{ flexGrow: 1, flexBasis: 120, minWidth: 120, gap: 3 }}>
      <Text style={{ ...font.body(11), color: colors.textMuted }}>{t('student.appearancePreferenceRow.copy001')}</Text>
      <Text style={{ ...font.body(16, 'semibold'), color: colors.textPrimary }}>{t(`designSystem.appearance.${appearance}`)}</Text>
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{(['system', 'light', 'dark'] as Appearance[]).map((value) => {
      const selected = appearance === value;
      return <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setAppearance(value)} style={{ minHeight: 34, paddingHorizontal: 10, justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: selected ? `${colors.gold500}80` : colors.borderDefault, backgroundColor: selected ? colors.goldSoft : colors.surfaceElevated }}>
        <Text style={{ ...font.body(13, 'semibold'), color: selected ? colors.gold500 : colors.textMuted }}>{t(`designSystem.appearance.${value}`)}</Text>
      </Pressable>;
    })}</View>
  </View>;
}
