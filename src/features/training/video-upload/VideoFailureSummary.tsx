import { Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { font, radius, spacing, useColors } from '@/design';
import { t } from '@/i18n';
import { EMPTY_VIDEO_UPLOAD } from './model';
import { useVideoUploadStore } from './store';
import { videoDeliveryFailures } from './delivery-failures';
import { useVideoDeliveryRetry, type RetryVideo } from './VideoDeliveryRecovery';

export type DeliverySet = RetryVideo & { exerciseId?: string; setLogId?: string | null };
export function useVideoFailures(studentId: string, sets: readonly DeliverySet[]) {
  const records = useVideoUploadStore(state => state.records);
  const rows = sets.map(set => {
    const key = `${studentId}:${set.stableSetId}`;
    const direct = records[key];
    const found = direct && (!set.setLogId || !direct.setLogId || direct.setLogId === set.setLogId)
      ? [key, direct] as const : Object.entries(records).find(([key, record]) => key.startsWith(`${studentId}:`) && set.setLogId && record.setLogId === set.setLogId);
    return { ...set, stableSetId: found?.[0].slice(studentId.length + 1) ?? set.stableSetId, exerciseId: set.exerciseId ?? '', upload: found?.[1] ?? EMPTY_VIDEO_UPLOAD };
  });
  const failures = videoDeliveryFailures(rows);
  return { ...failures, videos: rows.filter(row => failures.setIds.includes(row.stableSetId)) };
}

export function VideoFailureSummary({ studentId, sets, history = false }: { studentId: string; sets: readonly DeliverySet[]; history?: boolean }) {
  const colors = useColors();
  const failures = useVideoFailures(studentId, sets);
  const { retry, recovery } = useVideoDeliveryRetry(studentId);
  if (!failures.count && !recovery) return null;
  const key = history ? (failures.count === 1 ? 'historyOne' : 'history') : (failures.count === 1 ? 'failedOne' : 'failed');
  return <>
    {failures.count ? <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.control, backgroundColor: colors.dangerSoft }}>
      <MaterialCommunityIcons name="alert-circle-outline" size={20} color={colors.danger} />
      <Text style={{ flex: 1, ...font.body(13), color: colors.danger }}>{t(`student.videoDelivery.${key}`, [failures.count])}</Text>
      <Pressable accessibilityRole="button" onPress={() => void retry(failures.videos)} style={{ minHeight: spacing.minimumHitTarget, minWidth: spacing.minimumHitTarget, justifyContent: 'center' }}>
        <Text style={{ ...font.body(13, 'semibold'), color: colors.goldText }}>{t(history ? 'student.videoAttachmentV3Controls.copy009' : 'student.videoDelivery.retryNow')}</Text>
      </Pressable>
    </View> : null}
    {recovery}
  </>;
}
