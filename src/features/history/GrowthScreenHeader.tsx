import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, Text, View } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';

import { font, radius, spacing, useColors } from '@/design';
import { t } from '@/i18n';

export function GrowthScreenHeader({ unreadCount, onOpenChat }: { unreadCount: number; onOpenChat: () => void }) {
  const colors = useColors();
  return <View style={{ gap: 14 }}>
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <GrowthHeaderMark />
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

// MeetPRMark.header: eight offset Archivo Black copies form the stroke under
// a bgBase knockout. Keep this local until the other student headers migrate.
function GrowthHeaderMark() {
  const colors = useColors();
  const glyphStyle = { ...font.display(16, 'black'), letterSpacing: -16 * 0.11, includeFontPadding: false };
  return <View testID="growth-header-mark" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: 97, height: 24, justifyContent: 'center' }}>
    {Array.from({ length: 9 }, (_, index) => {
      const angle = index * Math.PI / 4;
      const color = index < 8 ? colors.textPrimary : colors.bgBase;
      return <View key={index} style={[StyleSheet.absoluteFill, { flexDirection: 'row', alignItems: 'center', transform: [{ translateX: index < 8 ? Math.cos(angle) * 16 * 0.16 : 0 }, { translateY: index < 8 ? Math.sin(angle) * 16 * 0.16 : 0 }] }]}>
        <Text style={[glyphStyle, { color }]}>MEETP</Text>
        <Text style={[glyphStyle, { color, marginLeft: -16 * 0.13 }]}>R</Text>
      </View>;
    })}
  </View>;
}
