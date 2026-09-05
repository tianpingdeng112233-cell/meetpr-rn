import type { PropsWithChildren } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, type TextProps } from 'react-native';

import { Card, Screen, font, radius, useColors } from '@/design';
import { t } from '@/i18n';

export function ProfileText({ style, ...props }: TextProps) {
  const colors = useColors();
  return <Text {...props} style={[{ ...font.body(14), color: colors.textPrimary }, style]} />;
}

/** CoachKit still uses SecondaryButton: body 15, two lines, card fill. */
export function InviteSecondaryButton({ label, disabled, onPress }: { label: string; disabled?: boolean; onPress: () => void }) {
  const colors = useColors();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [{ flex: 1, minHeight: 44, paddingHorizontal: 20, paddingVertical: 14, borderRadius: radius.pill,
      backgroundColor: colors.surfaceCard, borderColor: colors.borderDefault, borderWidth: 1, justifyContent: 'center', opacity: disabled ? 0.35 : 1 }, pressed && { transform: [{ scale: 0.97 }] }]}>
    <ProfileText numberOfLines={2} style={{ ...font.body(15, 'semibold'), color: colors.textSecondary, textAlign: 'center' }}>{label}</ProfileText>
  </Pressable>;
}

export function Capsule({ label, onPress, disabled, danger, testID }: {
  label: string; onPress: () => void; disabled?: boolean; danger?: boolean; testID?: string;
}) {
  const colors = useColors();
  return <Pressable testID={testID} accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [{ minHeight: 44, paddingHorizontal: 18, paddingVertical: 10, borderRadius: radius.pill, borderWidth: 1,
      borderColor: danger ? `${colors.danger}59` : colors.borderStrong, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.35 : 1 }, pressed && { transform: [{ scale: 0.97 }] }]}>
    <ProfileText style={{ ...font.body(14, 'semibold'), color: danger ? colors.danger : colors.textPrimary }}>{label}</ProfileText>
  </Pressable>;
}

export function ProfileSheet({ title, subtitle, onClose, children }: PropsWithChildren<{ title: string; subtitle: string; onClose: () => void }>) {
  const colors = useColors();
  return <Modal visible animationType="slide" onRequestClose={onClose}>
    <Screen>
      <ScrollView contentContainerStyle={profileStyles.content}>
        <View style={{ alignSelf: 'flex-start' }}><Capsule label={t('coach.profile.sheet.back')} onPress={onClose} testID="coach.profile.sheet.back" /></View>
        <ProfileText accessibilityRole="header" style={font.display(28)}>{title}</ProfileText>
        <ProfileText style={{ color: colors.textTertiary, marginBottom: 10 }}>{subtitle}</ProfileText>
        {children}
      </ScrollView>
    </Screen>
  </Modal>;
}

export function Confirmation({ title, message, confirmLabel, cancelLabel, busy, onCancel, onConfirm, testID }: {
  title: string; message: string; confirmLabel: string; cancelLabel: string; busy?: boolean;
  onCancel: () => void; onConfirm: () => void; testID: string;
}) {
  const colors = useColors();
  return <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => { if (!busy) onCancel(); }}>
    <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
      <Pressable testID={`${testID}.backdrop`} accessibilityLabel={cancelLabel} accessibilityRole="button" disabled={busy} onPress={onCancel}
        style={[StyleSheet.absoluteFill, { backgroundColor: `${colors.textPrimary}99` }]} />
      <Card elevation="modal" style={{ gap: 16, padding: 24 }} accessibilityViewIsModal>
        <ProfileText accessibilityRole="header" style={font.display(21)}>{title}</ProfileText>
        <ProfileText style={{ color: colors.textSecondary, lineHeight: 23 }}>{message}</ProfileText>
        <View style={profileStyles.actions}>
          <View style={profileStyles.flex}><Capsule label={cancelLabel} disabled={busy} onPress={onCancel} testID={`${testID}.cancel`} /></View>
          <Pressable testID={`${testID}.confirm`} accessibilityRole="button" accessibilityState={{ disabled: !!busy, busy: !!busy }} disabled={busy} onPress={onConfirm}
            style={{ flex: 1, minHeight: 44, padding: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: `${colors.danger}1A`, borderRadius: radius.pill }}>
            <ProfileText style={{ ...font.body(14, 'semibold'), color: colors.danger }}>{confirmLabel}</ProfileText>
          </Pressable>
        </View>
      </Card>
    </View>
  </Modal>;
}

export const profileStyles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 28, gap: 14 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  flex: { flex: 1 },
  section: { gap: 12 },
  row: { paddingVertical: 14, paddingHorizontal: 16, minHeight: 48, flexDirection: 'row', gap: 12, alignItems: 'center' },
});
