import type { PropsWithChildren } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppButton, font, Screen, spacing, useColors } from '@/design';
import { t } from '@/i18n';
export function ProfileModal({ children, title, onClose, busy = false, sheet = false }: PropsWithChildren<{ title: string; onClose: () => void; busy?: boolean; sheet?: boolean }>) {
  const colors = useColors();
  return <Modal visible animationType="slide" transparent={sheet} onRequestClose={busy ? () => undefined : onClose}>
    <View style={{ flex: 1, backgroundColor: sheet ? colors.modalShadow : colors.bgBase, paddingTop: sheet ? 72 : 0 }}>
      <Screen style={sheet ? { borderTopLeftRadius: 24, borderTopRightRadius: 24 } : undefined}>
        <View style={{ padding: spacing.base, gap: spacing.sm }}><AppButton variant="link" label={t('student.accountSecuritySheets.copy013')} disabled={busy} onPress={onClose} /><Text accessibilityRole="header" style={{ ...font.body(20, 'bold'), color: colors.textPrimary }}>{title}</Text></View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.base, gap: spacing.base }}>{children}</ScrollView>
      </Screen>
    </View>
  </Modal>;
}
export function ProfileText({ children, error = false }: PropsWithChildren<{ error?: boolean }>) {
  const colors = useColors();
  return <Text accessibilityRole={error ? 'alert' : undefined} style={{ ...font.body(16), color: error ? colors.danger : colors.textSecondary }}>{children}</Text>;
}
export function MyProfileSectionLabel({ children }: PropsWithChildren) {
  const colors = useColors();
  return <Text accessibilityRole="header" style={{ ...font.mono(11), letterSpacing: 0.44, color: colors.textFaint, marginTop: 2 }}>{children}</Text>;
}
export function MyProfileGroupCard({ children }: PropsWithChildren) {
  const colors = useColors();
  return <View style={{ backgroundColor: colors.surfaceCard, borderRadius: 16, overflow: 'hidden' }}>{children}</View>;
}
export function MyProfileDivider() {
  const colors = useColors();
  return <View style={{ height: 1, backgroundColor: colors.borderSubtle }} />;
}
export function MyProfileValueRow({ title, value, onPress, danger = false }: { title: string; value?: string; onPress: () => void; danger?: boolean }) {
  const colors = useColors();
  return <Pressable accessibilityRole="button" onPress={onPress} style={{ minHeight: value ? 68 : 52, paddingHorizontal: 16, paddingVertical: value ? 14 : 15, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
    <View style={{ flex: 1, gap: 3 }}><Text style={{ ...font.body(value ? 11 : 15, value ? 'regular' : 'semibold'), color: danger ? colors.danger : value ? colors.textMuted : colors.textPrimary }}>{title}</Text>{value ? <Text numberOfLines={2} style={{ ...font.body(16, 'semibold'), color: colors.textPrimary }}>{value}</Text> : null}</View>
    <MaterialCommunityIcons name="chevron-right" size={15} color={colors.textDim} />
  </Pressable>;
}
export function PreferenceChip({ label, selected, onPress, disabled = false }: { label: string; selected: boolean; onPress: () => void; disabled?: boolean }) {
  const colors = useColors();
  return <Pressable accessibilityRole="button" accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress} style={{ minHeight: 44, paddingHorizontal: 13, justifyContent: 'center', borderRadius: 22, backgroundColor: selected ? colors.gold500 : colors.bgInset, opacity: disabled ? 0.5 : 1 }}><Text style={{ ...font.body(14, 'semibold'), color: selected ? colors.inkOnGold : colors.textPrimary }}>{label}</Text></Pressable>;
}
