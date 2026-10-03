import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import type { FeedbackVideo } from '@/api/domains/feedback';
import { AppButton, font, IconButton, radius, spacing, useColors } from '@/design';
import { t } from '@/i18n';
import { feedbackVideoSummary } from './video-presentation';

export function FeedbackHeader({ detail = false }: { detail?: boolean }) {
  const colors = useColors();
  const router = useRouter();
  return <View style={[styles.header, { borderBottomColor: colors.borderHairline }]}>
    <IconButton haptic="none" accessibilityLabel={t('student.feedbackInboxView.copy005')} onPress={() => router.canGoBack() ? router.back() : router.replace('/(student)/today')}
      icon={props => <MaterialCommunityIcons name="arrow-left" {...props} />} />
    <View style={{ flex: 1, gap: spacing.point2 }}>
      <Text style={{ ...font.body(16, 'bold'), color: colors.textPrimary }}>{t(detail ? 'student.feedbackDetailView.copy003' : 'student.feedbackInboxView.copy006')}</Text>
      {!detail ? <Text style={{ ...font.body(11), color: colors.textMuted }}>{t('student.feedbackInboxView.copy007')}</Text> : null}
    </View>
  </View>;
}
export function FeedbackLoading() {
  const colors = useColors();
  return <ActivityIndicator style={{ padding: spacing.lg }} color={colors.gold500} accessibilityLabel={t('student.feedbackInboxView.copy009')} />;
}
export function FeedbackLoadError({ retry }: { retry: () => void }) {
  const colors = useColors();
  return <View style={styles.empty}>
    <Text style={{ ...font.body(13), color: colors.textSecondary }}>{t('chat.loadMessagesFailed')}</Text>
    <AppButton variant="link" label={t('student.feedbackInboxView.copy011')} onPress={retry} />
  </View>;
}
export function FeedbackEmpty() {
  const colors = useColors();
  return <View style={styles.empty}>
    <MaterialCommunityIcons name="message-outline" size={34} color={colors.textDim} />
    <Text style={{ ...font.body(15, 'bold'), color: colors.textSecondary }}>{t('student.feedbackInboxView.copy010')}</Text>
  </View>;
}
export function PlaybackLinkError({ detail = false }: { detail?: boolean }) {
  const colors = useColors();
  return <View accessibilityLiveRegion="polite" style={styles.error}>
    <MaterialCommunityIcons name="alert-outline" size={14} color={colors.dangerMuted} />
    <Text style={{ ...font.body(12), color: colors.dangerMuted, flex: 1 }}>{t(detail ? 'student.feedbackDetailView.copy004' : 'student.feedbackInboxView.copy002')}</Text>
  </View>;
}
export function FeedbackVideoCard({ video, resolving, disabled, play, detail = false }: {
  video: FeedbackVideo; resolving: boolean; disabled: boolean; play: () => void; detail?: boolean;
}) {
  const colors = useColors();
  const summary = feedbackVideoSummary(video) || t('student.feedbackDetailView.copy005');
  return <Pressable accessibilityRole="button" accessibilityLabel={t('student.feedbackDetailView.copy007', [summary])}
    accessibilityState={{ disabled, busy: resolving }} disabled={disabled} onPress={play}
    style={[styles.video, { backgroundColor: detail ? colors.surfaceCard : colors.bgInset, borderColor: colors.borderDefault, borderWidth: detail ? 1 : 0 }]}>
    {resolving ? <ActivityIndicator color={colors.gold500} /> : <MaterialCommunityIcons name="play-box" size={30} color={colors.gold500} />}
    <View style={{ flex: 1, gap: spacing.point2 }}>
      <Text style={{ ...font.body(detail ? 11 : 13), color: colors.textSecondary }}>{t(detail ? 'student.feedbackDetailView.copy008' : 'student.feedbackInboxView.copy008')}</Text>
      <Text style={{ ...(detail ? font.body(15) : font.mono(10)), color: detail ? colors.textPrimary : colors.textFaint }} numberOfLines={detail ? undefined : 1}>{summary}</Text>
    </View>
    {detail ? <MaterialCommunityIcons name="chevron-right" size={16} color={colors.textMuted} /> : null}
  </Pressable>;
}
export function FeedbackVideoUnavailable() {
  const colors = useColors();
  return <View style={[styles.video, { backgroundColor: colors.surfaceCard, borderColor: colors.borderDefault, borderWidth: 1 }]}>
    <MaterialCommunityIcons name="video-off-outline" size={20} color={colors.textMuted} />
    <Text style={{ ...font.body(15), color: colors.textMuted, flex: 1 }}>{t('student.feedbackDetailView.copy009')}</Text>
  </View>;
}
const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.space3, paddingHorizontal: spacing.point18, paddingTop: spacing.space1, paddingBottom: spacing.point14, borderBottomWidth: 1 },
  video: { flexDirection: 'row', alignItems: 'center', gap: spacing.point10, paddingHorizontal: spacing.point11, paddingVertical: spacing.sm, borderRadius: radius.inset, minHeight: spacing.minimumHitTarget },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  error: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
