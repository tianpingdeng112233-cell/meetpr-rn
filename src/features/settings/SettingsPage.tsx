import type { PropsWithChildren } from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen, font, spacing, useColors } from '@/design';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { t } from '@/i18n';

export function SettingsPage({ title, busy, onClose, children }: PropsWithChildren<{ title: string; busy: boolean; onClose: () => void }>) {
  const colors = useColors();
  return <Modal visible animationType="slide" onRequestClose={busy ? () => undefined : onClose}>
    <Screen>
      <View style={{ minHeight: 56, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('student.setEntrySheet.copy006')} disabled={busy} onPress={onClose} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text accessibilityRole="header" style={{ flex: 1, textAlign: 'center', ...font.body(16, 'bold'), color: colors.textPrimary }}>{title}</Text>
        <View style={{ width: 44 }} />
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.base, paddingBottom: 32, gap: 20 }}>{children}</ScrollView>
    </Screen>
  </Modal>;
}
export function SettingsSectionTitle({ children }: PropsWithChildren) {
  const colors = useColors();
  return <Text accessibilityRole="header" style={{ ...font.body(12, 'semibold'), color: colors.textMuted }}>{children}</Text>;
}
