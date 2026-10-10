import { Text, View } from 'react-native';
import { Card, radius, spacing, typography, useColors } from '@/design';
import { t } from '@/i18n';

export function NutritionPlaceholder() {
  const colors = useColors();
  return <View accessible accessibilityLabel={t('student.rn.nutrition.accessibility')}>
    <Card style={{ padding: spacing.base, gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
        <Text style={{ ...typography.caption, color: colors.textPrimary }}>{t('student.rn.nutrition.title')}</Text>
        <Text style={{ ...typography.caption, color: colors.textMuted, backgroundColor: colors.surfaceRaised, borderRadius: radius.chip, paddingHorizontal: spacing.sm, paddingVertical: spacing.point2 }}>{t('student.rn.nutrition.soon')}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
        {(['student.rn.nutrition.carbs', 'student.rn.nutrition.protein', 'student.rn.nutrition.fat', 'student.rn.nutrition.fiber'] as const).map(key =>
          <View key={key} style={{ flex: 1, minWidth: 0, alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm, borderRadius: radius.inset, backgroundColor: colors.surfaceRaised }}>
            <Text style={{ ...typography.caption, color: colors.textSecondary }}>{t(key)}</Text>
            <Text style={{ ...typography.monoLabel, color: colors.textSecondary }}>— g</Text>
          </View>)}
      </View>
    </Card>
  </View>;
}
