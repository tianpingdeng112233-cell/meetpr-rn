import { Text, View } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { font, radius, spacing, useTheme, type Appearance } from '@/design';
import { t } from '@/i18n';

/** Profile-only presentation; appearance selection still uses the shared theme store. */
export function MyProfileAppearanceRow() {
  const { appearance, colors, setAppearance } = useTheme();
  return <View accessibilityLabel={t('student.appearancePreferenceRow.copy002', [t(`designSystem.appearance.${appearance}`)])} style={{ paddingHorizontal: spacing.base, paddingVertical: spacing.point14, gap: spacing.point10 }}>
    <Text style={{ ...font.body(15, 'semibold'), color: colors.textPrimary }}>{t('student.appearancePreferenceRow.copy001')}</Text>
    <View style={{ flexDirection: 'row', gap: spacing.point6 }}>{(['system', 'light', 'dark'] as Appearance[]).map((value) => {
      const selected = appearance === value;
      return <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setAppearance(value)} style={{ flex: 1, alignItems: 'center', minHeight: spacing.minimumHitTarget, paddingHorizontal: spacing.sm, justifyContent: 'center', borderRadius: radius.inset, borderWidth: 1, borderColor: selected ? colors.ctaBackground : colors.borderDefault, backgroundColor: selected ? colors.ctaBackground : colors.surfaceCard }}>
        <Text style={{ ...font.body(13, 'semibold'), color: selected ? colors.ctaText : colors.textPrimary }}>{t(`designSystem.appearance.${value}`)}</Text>
      </Pressable>;
    })}</View>
  </View>;
}
