import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Text, View } from 'react-native';
import { font, spacing, useColors } from '@/design';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { t } from '@/i18n';

export function ProgressPageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  const colors = useColors();
  return <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.base, paddingVertical: spacing.md }}>
    <Pressable accessibilityRole="button" accessibilityLabel={t('student.feedbackInboxView.copy005')} onPress={onBack} style={{ minWidth: spacing.minimumHitTarget, minHeight: spacing.minimumHitTarget, alignItems: 'center', justifyContent: 'center' }}>
      <MaterialCommunityIcons name="arrow-left" size={26} color={colors.textPrimary} />
    </Pressable>
    <Text style={{ flex: 1, textAlign: 'left', ...font.body(19, 'bold'), color: colors.textPrimary }}>{title}</Text>
  </View>;
}
