import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Text, View } from 'react-native';
import { font, radius, spacing, useColors } from '@/design';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { t } from '@/i18n';
import { growthRangeLabel, type GrowthTimeRange } from './model';

export function GrowthRangeControl({ name, range, onChange }: { name: string; range: GrowthTimeRange; onChange: (range: GrowthTimeRange) => void }) {
  const colors = useColors();
  const rangeLabel = growthRangeLabel(range);
  return <Pressable accessibilityRole="button" accessibilityLabel={t('student.growthE1Rmcard.copy001', [name, rangeLabel])} accessibilityHint={t('student.growthE1Rmcard.copy002')} onPress={() => onChange(range === '30' ? '90' : range === '90' ? 'all' : '30')} style={{ minHeight: spacing.minimumHitTarget, justifyContent: 'center' }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.space1, minHeight: spacing.point22, paddingLeft: spacing.point10, paddingRight: spacing.point5, backgroundColor: colors.surfaceElevated, borderColor: colors.borderStrong, borderWidth: 1, borderRadius: radius.pill }}>
      <Text style={{ ...font.mono(11), color: colors.textSecondary }}>{rangeLabel}</Text>
      <MaterialCommunityIcons name="chevron-down" size={10} color={colors.gold500} />
    </View>
  </Pressable>;
}
