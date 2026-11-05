import { useState } from 'react';
import { Modal, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AppButton, font, radius, spacing, useColors } from '@/design';
import { t } from '@/i18n';
import type { SetLogUpsertRequest } from '@/api/domains/sets';
import type { VideoBadgeInfo } from '@/features/video-player/types';
import { useVideoUploadStore } from './store';

export type RetryVideo = { stableSetId: string; badge?: VideoBadgeInfo };

/** Shared by editable sets and read-only history; identity stays with the failed set. */
export function useVideoDeliveryRetry(studentId: string, callbacks?: {
  ensureSetLog: () => Promise<string>; buildLogRequest?: () => SetLogUpsertRequest;
}) {
  const colors = useColors();
  const [missing, setMissing] = useState<RetryVideo[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const selected = missing[0];
  const record = useVideoUploadStore(state => selected ? state.records[`${studentId}:${selected.stableSetId}`] : undefined);
  const retry = async (videos: readonly RetryVideo[]) => {
    const { videoUploadManager } = await import('./manager');
    const absent = videos.filter(video => videoUploadManager.needsReselection({ studentId, stableSetId: video.stableSetId }));
    setError(false);
    setMissing(absent);
    await Promise.all(videos.filter(video => !absent.includes(video)).map(video =>
      videoUploadManager.retry({ studentId, stableSetId: video.stableSetId }, callbacks?.ensureSetLog, callbacks?.buildLogRequest),
    )).catch(() => setError(true));
  };
  const close = () => { if (!busy) { setMissing([]); setError(false); } };
  const badge = selected?.badge;
  const details = [badge?.exerciseName, badge?.setOrdinal ? t('student.historyEntriesView.copy001', [badge.setOrdinal]) : null,
    badge?.weightKg != null && badge?.reps != null ? `${badge.weightKg} kg × ${badge.reps}` : null,
    badge?.rpe != null ? `RPE ${badge.rpe}` : null].filter(Boolean).join(' · ');
  const recovery = selected ? <Modal transparent visible animationType="slide" onRequestClose={close}>
    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: colors.modalShadow }}>
      <View accessibilityViewIsModal style={{ padding: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.md, backgroundColor: colors.surfaceCard, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card }}>
        {details ? <Text style={{ ...font.body(12), color: colors.textSecondary }}>{details}</Text> : null}
        <MaterialCommunityIcons name="alert-circle-outline" color={colors.danger} size={28} />
        <Text style={{ ...font.body(20, 'bold'), color: colors.danger }}>{t('student.videoDelivery.missingTitle')}</Text>
        <Text style={{ ...font.body(15), color: colors.textSecondary }}>{t('student.videoDelivery.missingBody')}{record?.savedToPhotos ? ` ${t('student.videoDelivery.savedToPhotos')}` : ''}</Text>
        {error ? <Text style={{ ...font.body(13), color: colors.danger }}>{t('student.videoAttachmentViewModel.copy001')}</Text> : null}
        <AppButton disabled={busy} label={t('student.videoDelivery.pickAgain')} onPress={() => {
          setBusy(true); setError(false);
          void (async () => {
            const { pickTrainingVideo } = await import('./native');
            const { videoUploadManager } = await import('./manager');
            const video = await pickTrainingVideo();
            if (!video) return;
            await videoUploadManager.replaceMissing({ studentId, stableSetId: selected.stableSetId }, video, callbacks?.ensureSetLog);
            setMissing(current => current.slice(1));
          })().catch(() => setError(true)).finally(() => setBusy(false));
        }} />
        <AppButton variant="link" disabled={busy} label={t('student.videoDelivery.later')} onPress={close} />
      </View>
    </View>
  </Modal> : null;
  return { retry, recovery };
}
