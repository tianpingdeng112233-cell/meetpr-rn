import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Text, View } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';

import { font, radius, spacing, useColors } from '@/design';
import { t } from '@/i18n';
import { MeetPRMark } from '@/features/dashboard/MeetPRMark';

export function GrowthScreenHeader({ unreadCount, onOpenChat }: { unreadCount: number; onOpenChat: () => void }) {
  const colors = useColors();
  return <View style={{ gap: 14 }}>
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <MeetPRMark testID="growth-header-mark" />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('student.trainingHistoryView.copy012')}
        accessibilityValue={{ text: unreadCount > 0 ? String(unreadCount) : '' }}
        onPress={onOpenChat}
        style={({ pressed }) => ({ width: spacing.minimumHitTarget, height: spacing.minimumHitTarget, borderRadius: radius.pill, backgroundColor: colors.surfaceCard, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.96 : 1 }] })}>
        <MaterialCommunityIcons name="message-outline" size={21} color={colors.textPrimary} />
        {unreadCount > 0 ? <View testID="growth-header-unread" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', top: 0, right: 0, minWidth: 18, minHeight: 18, paddingHorizontal: spacing.space1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.unread }}>
          <Text style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 'bold', includeFontPadding: false, color: colors.ctaTopHighlight }}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
        </View> : null}
      </Pressable>
    </View>
    <Text style={{ ...font.display(34), color: colors.textPrimary }}>{t('student.trainingHistoryView.copy013')}</Text>
    <Text style={{ ...font.body(12), color: colors.textFaint, marginTop: -spacing.space2 }}>{t('student.trainingHistoryView.copy014')}</Text>
  </View>;
}
