import { SetVideoCamera, setVideoCameraState } from './SetVideoCamera';
import { hasVideoDeliveryFailure } from './delivery-failures';
import { useVideoDeliveryRetry } from './VideoDeliveryRecovery';
import type { VideoBadgeInfo } from '@/features/video-player/types';
import type { SetLogUpsertRequest } from '@/api/domains/sets';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { CameraRecorder } from './CameraRecorder';
import { VideoTrimView } from './VideoTrimView';
import { VideoPlayback } from './VideoPlayback';
import { useOverlayHost } from '../OverlayHost';
import { useCameraAvailability } from './use-camera-availability';
import type { SelectedVideo } from './model';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { t } from '@/i18n';
import { ActivityIndicator, Alert, Modal, Text, View, useWindowDimensions } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';

import { useColors, radius, spacing, font, fontMetrics } from '@/design';

import { requestVideoUploadConsent } from './consent';
import { videoUploadManager } from './manager';
import { deleteLocalVideo, pickTrainingVideo, VideoNativeError, type VideoSource } from './native';
import { preserveVideoAttachment, selectVideoUpload, useVideoUploadStore } from './store';

const cameraLabels = {
  empty: 'student.videoAttachmentV3Controls.copy001',
  sending: 'student.videoUpload.sending',
  delivered: 'student.videoAttachmentV3Controls.copy006',
  failed: 'student.videoDelivery.notUploaded',
} as const;

type Props = {
  onActivityChange?: (stableSetId: string, active: boolean) => void;
  compact?: boolean;
  badge?: VideoBadgeInfo | null;
  initialCamera?: boolean;
  inputReady?: boolean;
  buildLogRequest: () => SetLogUpsertRequest;
  editable: boolean;
  ensureSetLog: () => Promise<string>;
  stableSetId: string;
  studentId: string;
};

function promptConsent(input: {
  title: string;
  message: string;
  acceptLabel: string;
  declineLabel: string;
}): Promise<boolean> {
  return new Promise((resolve) => {
    let resolved = false;
    const finish = (value: boolean) => {
      if (resolved) return;
      resolved = true;
      resolve(value);
    };
    Alert.alert(
      input.title,
      input.message,
      [
        {
          text: input.declineLabel,
          style: 'cancel',
          onPress: () => finish(false),
        },
        { text: input.acceptLabel, onPress: () => finish(true) },
      ],
      { cancelable: true, onDismiss: () => finish(false) },
    );
  });
}

export function VideoAttachmentControls({
  onActivityChange,
  compact: cameraOnly = false,
  editable,
  ensureSetLog,
  stableSetId,
  studentId,
  initialCamera,
  inputReady = true,
  buildLogRequest,
  badge,
}: Props) {
  // Camera overlays keep the element created at presentation time. Resolve form
  // callbacks at handoff so async prefill and edits made meanwhile are included.
  const logCallbacks = useRef({ ensureSetLog, buildLogRequest, inputReady, badge });
  useLayoutEffect(() => { logCallbacks.current = { ensureSetLog, buildLogRequest, inputReady, badge }; });
  const colors = useColors();
  const { width, fontScale } = useWindowDimensions();
  const compact = width / fontScale < 440;
  const { retry, recovery } = useVideoDeliveryRetry(studentId, { ensureSetLog, buildLogRequest: inputReady ? buildLogRequest : undefined });
  const record = useVideoUploadStore(selectVideoUpload(studentId, stableSetId));
  const [detailVisible, setDetailVisible] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [cameraPresented, setCameraPresented] = useState(false);
  const [videoToTrim, setVideoToTrim] = useState<SelectedVideo | null>(null);
  const pickedUri = useRef<string | null>(null);
  const releaseOriginal = useRef<(() => void) | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; releaseOriginal.current?.(); deleteLocalVideo(pickedUri.current); };
  }, []);
  const [isPreparing, setIsPreparing] = useState(false);
  const interactionActive = choosing || cameraPresented || Boolean(videoToTrim) || isPreparing || detailVisible;
  useLayoutEffect(() => { onActivityChange?.(stableSetId, interactionActive); }, [onActivityChange, stableSetId, interactionActive]);
  useEffect(() => () => onActivityChange?.(stableSetId, false), [onActivityChange, stableSetId]);
  useEffect(() => useVideoUploadStore.subscribe((next, previous) => {
    const select = selectVideoUpload(studentId, stableSetId);
    if (select(next) !== select(previous)) setIsPreparing(false);
  }), [studentId, stableSetId]);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const showActionError = useCallback((error: unknown) => {
    const message = error instanceof VideoNativeError
      ? error.copy
      : t('student.videoAttachmentViewModel.copy001');
    if (cameraOnly) Alert.alert('', message, [{ text: t('student.cameraRecorderView.copy005') }]);
    else setActionErrorMessage(message);
  }, [cameraOnly]);
  const hasCamera = useCameraAvailability();
  const overlay = useOverlayHost();
  // CameraRecorder owns its native Modal; a second window can cover it with a blank screen.
  const [fallbackNode, setFallbackNode] = useState<ReactNode>(null);
  const dismiss = () => {
    setCameraPresented(false);
    if (overlay.isFallback) setFallbackNode(null);
    else overlay.dismiss();
  };
  const present = (node: ReactNode) => {
    setCameraPresented(true);
    if (overlay.isFallback) setFallbackNode(node);
    else overlay.present(node, dismiss);
  };
  const identity = { studentId, stableSetId };
  const choose = async (source: VideoSource) => {
    if (!editable || choosing || isPreparing) return;
    let trimming = false;
    onActivityChange?.(stableSetId, true);
    setChoosing(true);
    setActionErrorMessage(null);
    try {
      if (!(await requestVideoUploadConsent(AsyncStorage, promptConsent)))
        return;
      if (source === 'camera') {
        present(
          <CameraRecorder badge={badge} getBadge={() => logCallbacks.current.badge}
            onClose={dismiss}
            onLibrary={() => { dismiss(); void choose('library'); }}
            onUse={(uri, photoSave) => {
              dismiss();
              attach({
                uri,
                width: 720,
                height: 1280,
                durationMs: null,
                mimeType: 'video/mp4',
                fileName: null,
                codec: null,
                rotationDegrees: 0,
              }, photoSave);
            }}
          />,
        );
        return;
      }
      releaseOriginal.current = preserveVideoAttachment(studentId, stableSetId);
      const video = await pickTrainingVideo();
      if (video) {
        if (!mounted.current) { deleteLocalVideo(video.uri); return; }
        trimming = true;
        pickedUri.current = video.uri;
        setVideoToTrim(video);
      }
    } catch (error) {
      showActionError(error);
    } finally {
      if (!trimming) { releaseOriginal.current?.(); releaseOriginal.current = null; }
      setChoosing(false);
    }
  };
  const attach = (video: SelectedVideo, photoSave?: Promise<boolean>) => {
    onActivityChange?.(stableSetId, true);
    setActionErrorMessage(null);
    setIsPreparing(true);
    void videoUploadManager
      .attach(identity, photoSave ? { ...video, photoSave } : video, () => {
        waitingForInput.current = !logCallbacks.current.inputReady;
        return logCallbacks.current.ensureSetLog();
      }, () => logCallbacks.current.inputReady ? logCallbacks.current.buildLogRequest() : undefined)
      .catch(showActionError)
      .finally(() => setIsPreparing(false));
  };
  const waitingForInput = useRef(false);
  useEffect(() => {
    if (!editable || !inputReady || !waitingForInput.current || record.status !== 'failed') return;
    waitingForInput.current = false;
    void videoUploadManager.retry(
      { studentId, stableSetId },
      () => logCallbacks.current.ensureSetLog(),
      () => logCallbacks.current.buildLogRequest(),
    ).catch(showActionError);
  }, [editable, inputReady, record.status, studentId, stableSetId, showActionError]);
  const autoOpened = useRef(false);
  useEffect(() => {
    if (initialCamera && hasCamera && !autoOpened.current) {
      autoOpened.current = true;
      void choose('camera');
    }
  });
  const remove = async () => {
    setActionErrorMessage(null);
    try {
      await videoUploadManager.remove(identity);
    } catch (error) {
      showActionError(error);
    }
  };
  const playable = Boolean(record.localUri || record.source?.uri || record.attachmentId);
  const failed = hasVideoDeliveryFailure(record);
  const preparing = !failed && (isPreparing || record.status === 'preparing');
  const errorMessage = actionErrorMessage ?? (failed && videoUploadManager.needsReselection(identity)
    ? t('student.videoDelivery.missingBody') : record.errorMessage);
  const percentage = Math.round(record.progress * 100);
  const statusLabel = failed ? t('student.videoAttachmentV3Controls.copy008') : record.status === 'uploading'
    ? t(percentage > 0 ? 'student.videoUpload.sendingProgress' : 'student.videoUpload.sending', [percentage])
    : t(record.status === 'failed' ? 'student.videoAttachmentV3Controls.copy008' : record.status === 'uploaded' ? 'student.videoAttachmentV3Controls.copy006' : 'student.videoAttachmentV3Controls.copy007');
  const delivered = record.status === 'uploaded' && Boolean(record.setLogId && record.attachmentId);
  const transferring = record.status === 'uploading';
  const cameraState = setVideoCameraState(record, delivered, isPreparing);
  if (cameraOnly) return <>
    <Pressable accessibilityRole="button" accessibilityValue={transferring ? { min: 0, max: 100, now: percentage } : undefined} accessibilityLabel={t(cameraLabels[cameraState])} onPress={() => { if (playable || failed) setDetailVisible(true); else void choose('camera'); }} style={{ width: 40, minHeight: 38, justifyContent: 'center', alignItems: 'center' }}>
      <SetVideoCamera state={cameraState}
        fraction={record.status === 'uploaded' ? 1 : transferring ? record.progress : 0} />
    </Pressable>
    {detailVisible ? <Modal visible animationType="slide" onRequestClose={() => setDetailVisible(false)}><View style={{ flex: 1, backgroundColor: colors.bgBase, padding: 16, paddingTop: 48 }}>
      <VideoAction icon="close" label={t('training.allDay.done')} disabled={false} onPress={() => setDetailVisible(false)} />
      {playable ? <VideoPlayback allowGalleryExport inline badge={badge} localUri={record.localUri ?? record.source?.uri ?? null} attachmentId={record.attachmentId} onClose={() => setDetailVisible(false)} /> : null}
      <VideoAction icon="video" label={t('student.videoAttachmentV3Controls.copy001')} disabled={!editable || choosing || isPreparing} onPress={() => void choose('camera')} />
      {failed ? <VideoAction icon="refresh" label={t('student.videoAttachmentV3Controls.copy009')} disabled={!editable} onPress={() => void retry([{ stableSetId }])} /> : null}
      <VideoAction icon="trash-can-outline" label={t('student.videoAttachmentV3Controls.copy005')} disabled={!editable} onPress={() => void remove().then(() => setDetailVisible(false))} />
    </View></Modal> : null}
    {recovery}
    {videoToTrim ? <VideoTrimView uri={videoToTrim.uri} onOutcome={outcome => {
      releaseOriginal.current?.(); releaseOriginal.current = null; deleteLocalVideo(pickedUri.current); pickedUri.current = null; setVideoToTrim(null);
      if (outcome.type === 'saved') attach({ ...videoToTrim, ...outcome.video, mimeType: 'video/mp4', fileName: null });
      else if (outcome.type === 'failed') showActionError(new Error('Trim failed'));
    }} /> : null}
    {overlay.isFallback ? fallbackNode : null}
  </>;
  return (
    <View style={{ backgroundColor: colors.surfaceCard, borderRadius: radius.card, paddingHorizontal: spacing.point14, paddingVertical: spacing.point11, gap: spacing.space2 }}>
      {playable ? <VideoPlayback allowGalleryExport key={record.createdAt} inline badge={badge} localUri={record.localUri ?? record.source?.uri ?? null} attachmentId={record.attachmentId} onClose={() => undefined} /> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        {!playable && record.status === 'none' ? <Text style={{ color: colors.textPrimary, ...font.body(fontMetrics.size16, 'medium') }}>{t('student.videoAttachmentSection.copy001')}</Text> : null}
        {preparing ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1 }}>
          <ActivityIndicator color={colors.gold500} />
          <Text style={{ ...font.body(fontMetrics.size12, 'medium'), color: colors.textSecondary, flexShrink: 0 }}>{t('student.videoAttachmentV3Controls.copy003')}</Text>
        </View> : record.status !== 'none' ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1 }}>
          <Text style={{ ...font.body(fontMetrics.size12), color: failed ? colors.danger : colors.textSecondary, flexShrink: 1 }}>
            {statusLabel}
          </Text>
        </View> : <View style={{ flex: 1 }} />}
        {!preparing ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginLeft: 'auto', flexShrink: 0 }}>
          {record.status === 'none' ? <>
            <VideoAction icon="video" label={t('student.videoAttachmentV3Controls.copy001')} disabled={!editable || choosing || isPreparing || !hasCamera} onPress={() => void choose('camera')} />
            <VideoAction icon="image" label={t('student.videoAttachmentV3Controls.copy002')} disabled={!editable || choosing || isPreparing} onPress={() => void choose('library')} />
          </> : <>
            {failed ? <VideoAction compact={compact} icon="refresh" label={t('student.videoAttachmentV3Controls.copy009')} disabled={!editable || choosing || isPreparing}
              onPress={() => void retry([{ stableSetId, badge: badge ?? undefined }])} /> : null}
            <VideoAction compact={compact && failed} icon="image" label={t('student.videoAttachmentV3Controls.copy004')} disabled={!editable || choosing || isPreparing} onPress={() => void choose('library')} />
            <VideoAction compact={compact && failed} icon="trash-can-outline" label={t('student.videoAttachmentV3Controls.copy005')} disabled={!editable || choosing || isPreparing} onPress={() => void remove()} />
          </>}
        </View> : null}
      </View>
      {errorMessage ? <Text style={{ ...font.body(fontMetrics.size11, 'medium'), color: colors.danger }}>{errorMessage}</Text> : null}
      {recovery}
      {videoToTrim ? <VideoTrimView uri={videoToTrim.uri} onOutcome={outcome => {
        releaseOriginal.current?.();
        releaseOriginal.current = null;
        deleteLocalVideo(pickedUri.current);
        pickedUri.current = null;
        setVideoToTrim(null);
        if (outcome.type === 'saved') attach({ ...videoToTrim, ...outcome.video, mimeType: 'video/mp4', fileName: null });
        else if (outcome.type === 'failed') showActionError(new Error('Trim failed'));
      }} /> : null}
      {overlay.isFallback ? fallbackNode : null}
    </View>
  );
}


function VideoAction({ icon, label, onPress, disabled, compact = false }: {
  compact?: boolean;
  icon: ComponentProps<typeof MaterialCommunityIcons>['name']; label: string; onPress: () => void; disabled: boolean;
}) {
  const colors = useColors();
  const color = `${colors.gold500}${disabled ? '4D' : 'B8'}`;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
    style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.point7, flexShrink: 0,
      borderRadius: radius.control, paddingHorizontal: compact ? spacing.sm : spacing.md, paddingVertical: spacing.sm, minHeight: spacing.minimumHitTarget, minWidth: spacing.minimumHitTarget,
      borderWidth: spacing.point1, borderColor: `${colors.gold500}${disabled ? '1F' : '3D'}`, opacity: pressed ? 0.6 : 1 })}>
    <MaterialCommunityIcons name={icon} size={spacing.space5} color={color} />
    {!compact ? <Text numberOfLines={1} style={{ color, flexShrink: 0, ...font.body(fontMetrics.size15, 'semibold') }}>{label}</Text> : null}
  </Pressable>;
}
