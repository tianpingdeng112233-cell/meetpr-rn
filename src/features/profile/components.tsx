import type { PropsWithChildren } from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { AppButton, font, radius, Screen, spacing, useColors } from '@/design';
import { t } from '@/i18n';
export function ProfileModal({ children, title, onClose, busy = false, sheet = false }: PropsWithChildren<{ title: string; onClose: () => void; busy?: boolean; sheet?: boolean }>) {
  const colors = useColors();
  return <Modal visible animationType="slide" transparent={sheet} onRequestClose={busy ? () => undefined : onClose}>
    <View style={{ flex: 1, backgroundColor: sheet ? colors.modalShadow : colors.bgBase, paddingTop: sheet ? 72 : 0 }}>
      <Screen style={sheet ? { borderTopLeftRadius: 24, borderTopRightRadius: 24 } : undefined}>
        <View style={{ padding: spacing.base, gap: spacing.sm }}><AppButton haptic="none" variant="link" label={t('student.accountSecuritySheets.copy013')} disabled={busy} onPress={onClose} /><Text accessibilityRole="header" style={{ ...font.body(20, 'bold'), color: colors.textPrimary }}>{title}</Text></View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.base, gap: spacing.base }}>{children}</ScrollView>
      </Screen>
    </View>
  </Modal>;
}
export function ProfileText({ children, error = false }: PropsWithChildren<{ error?: boolean }>) {
  const colors = useColors();
  return <Text accessibilityRole={error ? 'alert' : undefined} style={{ ...font.body(16), color: error ? colors.danger : colors.textSecondary }}>{children}</Text>;
}
export function MyProfileGroupCard({ children }: PropsWithChildren) {
  const colors = useColors();
  return <View style={{ backgroundColor: colors.surfaceCard, borderRadius: radius.card, overflow: 'hidden' }}>{children}</View>;
}
export function MyProfileDivider({ inset = false }: { inset?: boolean } = {}) {
  const colors = useColors();
  return <View style={{ height: spacing.point1, marginHorizontal: inset ? spacing.base : spacing.zero, backgroundColor: colors.borderSubtle }} />;
}
export function PreferenceChip({ label, selected, onPress, disabled = false }: { label: string; selected: boolean; onPress: () => void; disabled?: boolean }) {
  const colors = useColors();
  return <Pressable accessibilityRole="button" accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress} style={{ minHeight: 44, paddingHorizontal: 13, justifyContent: 'center', borderRadius: 22, backgroundColor: selected ? colors.gold500 : colors.bgInset, opacity: disabled ? 0.5 : 1 }}><Text style={{ ...font.body(14, 'semibold'), color: selected ? colors.inkOnGold : colors.textPrimary }}>{label}</Text></Pressable>;
}
