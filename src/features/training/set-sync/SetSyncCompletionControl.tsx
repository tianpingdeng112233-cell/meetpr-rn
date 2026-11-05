import { ActivityIndicator, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AppButton, font, fontMetrics, radius, spacing, useColors } from '@/design';
import { t } from '@/i18n';
import { HoldToCompleteButton } from '../HoldToCompleteButton';
import type { SetCompletionState } from './completion';

export function SetSyncCompletionControl({ state, disabled, onComplete }: { state: SetCompletionState; disabled?: boolean; onComplete: () => void }) {
  const colors = useColors();
  if (state === 'syncing') return <View accessibilityRole="progressbar" accessibilityLabel={t('student.setSync.syncing')} style={{ minHeight: spacing.completionControlHeight, backgroundColor: colors.holdTrack, borderRadius: radius.control, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
    <ActivityIndicator color={colors.inkOnCTAFill} /><Text style={{ ...font.body(fontMetrics.size15, 'bold'), color: colors.inkOnCTAFill }}>{t('student.setSync.syncing')}</Text>
  </View>;
  if (state === 'failed') return <View style={{ gap: spacing.sm }}>
    <View style={{ padding: spacing.md, borderRadius: radius.control, backgroundColor: colors.failureSoft, flexDirection: 'row', gap: spacing.sm }}>
      <MaterialCommunityIcons name="alert-outline" size={spacing.lg} color={colors.failure} />
      <View style={{ flex: 1, gap: spacing.xs }}><Text style={{ ...font.body(fontMetrics.size15, 'bold'), color: colors.failure }}>{t('student.setSync.failedTitle')}</Text>
        <Text style={{ ...font.body(fontMetrics.size13), color: colors.textSecondary }}>{t('student.setSync.failedBody')}</Text></View>
    </View>
    <AppButton label={t('student.setSync.retry')} onPress={onComplete} style={{ minHeight: spacing.completionControlHeight }} />
  </View>;
  return <HoldToCompleteButton disabled={disabled || state === 'reward'} onComplete={onComplete} />;
}
