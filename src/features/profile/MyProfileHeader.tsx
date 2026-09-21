import { Text, View } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { font, useColors } from '@/design';
import { t } from '@/i18n';

/** MeetPRMark.header: 16pt Archivo Black, eight stroke copies and a knockout fill. */
function ProfileMark() {
  const colors = useColors();
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: 97, height: 24 }}>
    {Array.from({ length: 9 }, (_, index) => {
      const angle = index * Math.PI / 4;
      return <View key={index} style={{ position: 'absolute', height: 24, flexDirection: 'row', alignItems: 'center', transform: index < 8 ? [{ translateX: Math.cos(angle) * 2.56 }, { translateY: Math.sin(angle) * 2.56 }] : [] }}>
        <Text style={{ ...font.display(16, 'black'), letterSpacing: -1.76, color: index < 8 ? colors.textPrimary : colors.bgBase }}>MEETP</Text>
        <Text style={{ ...font.display(16, 'black'), letterSpacing: -1.76, marginLeft: -2.08, color: index < 8 ? colors.textPrimary : colors.bgBase }}>R</Text>
      </View>;
    })}
  </View>;
}

export function MyProfileHeader({ unreadCount = 0, onOpenChat }: { unreadCount?: number; onOpenChat?: () => void }) {
  const colors = useColors();
  return <View style={{ gap: 14 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <ProfileMark />
      <Pressable accessibilityRole="button" accessibilityLabel={t('student.myProfileView.copy015')} accessibilityValue={{ text: unreadCount > 0 ? String(unreadCount) : '' }} accessibilityState={{ disabled: !onOpenChat }} disabled={!onOpenChat} onPress={onOpenChat} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceCard, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.97 : 1 }] })}>
        <MaterialCommunityIcons name="message-outline" size={21} color={colors.textPrimary} />
        {unreadCount > 0 ? <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', top: 0, right: 0, minWidth: 18, minHeight: 18, paddingHorizontal: 4, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.unread }}>
          <Text style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 'bold', color: colors.ctaTopHighlight }}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
        </View> : null}
      </Pressable>
    </View>
    <Text accessibilityRole="header" style={{ ...font.display(34), color: colors.textPrimary }}>{t('student.myProfileView.copy016')}</Text>
    <Text style={{ ...font.mono(11), letterSpacing: 0.44, color: colors.textFaint, marginTop: -8 }}>{t('student.myProfileView.copy017')}</Text>
  </View>;
}
