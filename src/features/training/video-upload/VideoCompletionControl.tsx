import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { font, radius, spacing, useColors } from '@/design';
import { t } from '@/i18n';
import type { VideoUploadRecord } from './model';
import { completionVideoSummary } from './completion-delivery';
import { useVideoDeliveryRetry, type RetryVideo } from './VideoDeliveryRecovery';

export function VideoCompletionControl({ studentId, videos, waiting, showSummary, children }: {
  studentId: string; videos: (RetryVideo & { upload: VideoUploadRecord })[];
  waiting: boolean; showSummary: boolean; children: ReactNode;
}) {
  const colors = useColors();
  const summary = completionVideoSummary(videos.map(row => row.upload));
  const { retry, recovery } = useVideoDeliveryRetry(studentId);
  if (waiting) return <View testID="video-completion-progress" accessibilityLiveRegion="polite"
    style={{ padding: spacing.md, gap: spacing.sm, borderRadius: radius.card, backgroundColor: colors.surfaceCard }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <MaterialCommunityIcons name={summary.total ? 'cloud-upload-outline' : 'wifi-off'} size={22} color={colors.goldText} />
      <Text style={{ ...font.body(16, 'semibold'), color: colors.textPrimary, flex: 1 }}>{summary.total ? t('student.videoDelivery.progress', [summary.done, summary.total]) : t('student.videoDelivery.waitingNetwork')}</Text>
    </View>
    {summary.total ? <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: summary.total, now: summary.done }}
      style={{ height: 4, borderRadius: radius.pill, backgroundColor: colors.borderSubtle, overflow: 'hidden' }}>
      <View style={{ height: '100%', width: `${summary.done / summary.total * 100}%`, backgroundColor: colors.gold500 }} />
    </View> : null}
    <Text style={{ ...font.body(13), color: colors.textSecondary }}>{t(summary.total ? 'student.videoDelivery.progressBody' : 'student.videoDelivery.waitingNetworkBody')}</Text>
  </View>;
  const visible = showSummary && !summary.delivered;
  return <View style={{ gap: spacing.sm }}>
    {visible ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      {summary.failed ? <MaterialCommunityIcons name="alert-circle-outline" size={20} color={colors.danger} /> : null}
      <Text style={{ flex: 1, ...font.body(13), color: summary.failed ? colors.danger : colors.textSecondary }}>{summary.failed
        ? t('student.videoDelivery.summary', [summary.failed, summary.uploading])
        : t(summary.uploading === 1 ? 'student.videoDelivery.uploadingOne' : 'student.videoDelivery.uploading', [summary.uploading])}</Text>
      {summary.failed ? <Pressable accessibilityRole="button" onPress={() => void retry(videos)}
        style={{ minHeight: spacing.minimumHitTarget, minWidth: spacing.minimumHitTarget, justifyContent: 'center' }}>
        <Text style={{ ...font.body(13, 'semibold'), color: colors.goldText }}>{t('student.videoDelivery.retryNow')}</Text>
      </Pressable> : null}
    </View> : null}
    {children}
    {visible ? <Text style={{ ...font.body(12), color: colors.textSecondary }}>{t('student.videoDelivery.holdHint')}</Text> : null}
    {recovery}
  </View>;
}
