import { router } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ActivityIndicator, Text, View, type PressableProps } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { font, radius, spacing, useColors } from '@/design';
import { t, type TranslationKey } from '@/i18n';
export function Pill({ label, mono = false, haptic, ...props }: PressableProps & { label: string; mono?: boolean; haptic?: 'light' | 'warning' }) {
  const colors = useColors();
  return <Pressable haptic={haptic} {...props} accessibilityRole="button" accessibilityLabel={props.accessibilityLabel ?? label} style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.textPrimary, opacity: props.disabled ? 0.35 : pressed ? 0.7 : 1 })}><Text style={{ ...(mono ? font.mono(11, 'bold') : font.body(13, 'bold')), color: colors.bgBase }}>{label}</Text></Pressable>;
}
export function ReceivingState({ state, pending = false, retry }: { state: 'loading' | 'failed' | 'empty'; pending?: boolean; retry: () => void }) {
  const colors = useColors();
  const title: TranslationKey = state === 'loading' ? 'coach.inbox.loading' : state === 'failed' ? 'coach.inbox.loadFailed' : pending ? 'coach.videoFeedback.noPendingVideos' : 'coach.inbox.emptyTitle';
  if (pending) return <View style={{ paddingVertical: state === 'loading' ? spacing.point32 : spacing.point18, gap: spacing.space4, alignItems: 'center' }}>
    {state === 'loading' ? <ActivityIndicator testID="coach.inbox.loading" accessibilityLabel={t(title)} color={colors.gold500} /> : <>
      <MaterialCommunityIcons name={state === 'failed' ? 'alert-outline' : 'check-circle-outline'} size={44} color={colors.textTertiary} />
      <Text style={{ ...font.body(20, 'bold'), color: colors.textPrimary, textAlign: 'center' }}>{t(title)}</Text>
      {state === 'empty' ? <Text style={{ ...font.body(15), color: colors.textSecondary, textAlign: 'center' }}>{t('coach.videoFeedback.noPendingVideosSubtitle')}</Text> : null}
    </>}
  </View>;
  return <View style={{ padding: 32, gap: 16, alignItems: 'center' }}>
    {state === 'loading' ? <ActivityIndicator testID="coach.inbox.loading" accessibilityLabel={t(title)} color={colors.gold500} /> : <View style={{ backgroundColor: colors.surfaceCard, borderRadius: 26, width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}><MaterialCommunityIcons name={state === 'failed' ? 'alert-outline' : pending ? 'check-circle-outline' : 'message-outline'} size={20} color={state === 'failed' ? colors.danger : colors.success} /></View>}
    <Text style={{ ...font.body(15, 'semibold'), color: colors.textPrimary, textAlign: 'center' }}>{t(title)}</Text>
    {state === 'empty' ? <Text style={{ ...font.body(12), color: colors.textDisabled, textAlign: 'center' }}>{t(pending ? 'coach.videoFeedback.noPendingVideosSubtitle' : 'coach.inbox.emptySubtitle')}</Text> : null}
    {state === 'failed' ? <Pill haptic="light" label={t('chat.retry')} onPress={retry} /> : null}
  </View>;
}

export function BackButton({ disabled = false, testID }: { disabled?: boolean; testID?: string }) {
  const colors = useColors();
  return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={t('coach.videoFeedback.back')} disabled={disabled} onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceCard, opacity: disabled ? 0.35 : 1 }}><MaterialCommunityIcons name="arrow-left" size={20} color={colors.textPrimary} /></Pressable>;
}
