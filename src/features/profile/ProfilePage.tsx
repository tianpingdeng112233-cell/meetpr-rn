import type { PropsWithChildren } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AppButton, font, Screen, spacing, useColors } from '@/design';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { ProgressPageHeader } from '@/features/history/ProgressPageHeader';
import { t } from '@/i18n';

export function ProfilePage({ title, children }: PropsWithChildren<{ title: string }>) {
  const router = useRouter();
  return <Screen><ProgressPageHeader title={title} onBack={() => router.back()} />
    <ScrollView contentContainerStyle={{ padding: spacing.pageHorizontal, gap: spacing.base }}>{children}</ScrollView>
  </Screen>;
}
export function ProfilePageStatus({ pending, failed, retry }: { pending: boolean; failed: boolean; retry: () => void }) {
  const colors = useColors();
  if (failed) return <View style={{ gap: spacing.base }}>
    <Text style={{ ...font.body(14), color: colors.textSecondary }}>{t('student.trainingHistoryView.copy022')}</Text>
    <AppButton label={t('student.trainingHistoryView.copy023')} onPress={retry} />
  </View>;
  return <Text style={{ ...font.body(14), color: colors.textMuted }}>{t(pending ? 'student.trainingHistoryView.copy021' : 'student.myProfileView.copy001')}</Text>;
}
export function ProfilePageRow({ title, value, onPress, singleLine = false, danger = false }: {
  title: string; value?: string; onPress: () => void; singleLine?: boolean; danger?: boolean;
}) {
  const colors = useColors();
  return <Pressable accessibilityRole="button" accessibilityLabel={value ? `${title}, ${value}` : title} onPress={onPress} style={{ minHeight: singleLine ? spacing.point56 : spacing.minimumHitTarget + spacing.lg, paddingHorizontal: spacing.base, paddingVertical: spacing.point13, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
    <View style={{ flex: 1, gap: spacing.point3, ...(singleLine ? { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: spacing.sm } as const : {}) }}>
      <Text numberOfLines={singleLine ? 1 : undefined} style={{ ...(singleLine ? { flexShrink: 0 } : {}), ...font.body(15, 'semibold'), color: danger ? colors.danger : colors.textPrimary }}>{title}</Text>
      {value ? <Text textBreakStrategy={singleLine ? 'simple' : undefined} android_hyphenationFrequency={singleLine ? 'none' : undefined} numberOfLines={singleLine ? undefined : 2} style={{ ...(singleLine ? { flexShrink: 0, maxWidth: '100%' } as const : {}), ...font.body(13), color: colors.textMuted }}>{value}</Text> : null}
    </View>
    <MaterialCommunityIcons name="chevron-right" size={15} color={colors.textDim} />
  </Pressable>;
}
