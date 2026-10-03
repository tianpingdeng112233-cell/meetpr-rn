import type { VideoBadgeInfo } from '@/features/video-player/types';
import type { SetLogUpsertRequest } from '@/api/domains/sets';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { CameraRecorder } from './CameraRecorder';
import { VideoPlayback } from './VideoPlayback';
import { useOverlayHost } from '../OverlayHost';
import { useCameraAvailability } from './use-camera-availability';
import type { SelectedVideo } from './model';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { t } from '@/i18n';
import { ActivityIndicator, Alert, Modal, Text, View } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';

import { useColors, radius, spacing, font, fontMetrics } from '@/design';

import { requestVideoUploadConsent } from './consent';
import { videoUploadManager } from './manager';
import { pickTrainingVideo, VideoNativeError, type VideoSource } from './native';
import { selectVideoUpload, useVideoUploadStore } from './store';

type Props = {
  badge?: VideoBadgeInfo | null;
  initialCamera?: boolean;
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
  editable,
  ensureSetLog,
  stableSetId,
  studentId,
  initialCamera,
  buildLogRequest,
  badge,
}: Props) {
  const colors = useColors();
  const record = useVideoUploadStore(selectVideoUpload(studentId, stableSetId));
  const [choosing, setChoosing] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  useEffect(() => useVideoUploadStore.subscribe((next, previous) => {
    const select = selectVideoUpload(studentId, stableSetId);
    if (select(next) !== select(previous)) setIsPreparing(false);
  }), [studentId, stableSetId]);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const showActionError = (error: unknown) =>
    setActionErrorMessage(
      error instanceof VideoNativeError
        ? error.copy
        : t('student.videoAttachmentViewModel.copy001'),
    );
  const hasCamera = useCameraAvailability();
  const overlay = useOverlayHost();
  const [fallbackNode, setFallbackNode] = useState<ReactNode>(null);
  const dismiss = () => {
    if (overlay.isFallback) setFallbackNode(null);
    else overlay.dismiss();
  };
  const present = (node: ReactNode) => {
    if (overlay.isFallback) setFallbackNode(node);
    else overlay.present(node, dismiss);
  };
  const identity = { studentId, stableSetId };
  const choose = async (source: VideoSource) => {
    if (!editable || choosing || isPreparing) return;
    setChoosing(true);
    setActionErrorMessage(null);
    try {
      if (!(await requestVideoUploadConsent(AsyncStorage, promptConsent)))
        return;
      if (source === 'camera') {
        present(
          <CameraRecorder
            onClose={dismiss}
            onUse={(uri) => {
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
              });
            }}
          />,
        );
        return;
      }
      const video = await pickTrainingVideo();
      if (video) attach(video);
    } catch (error) {
      showActionError(error);
    } finally {
      setChoosing(false);
    }
  };
  const attach = (video: SelectedVideo) => {
    setActionErrorMessage(null);
    setIsPreparing(true);
    void videoUploadManager
      .attach(identity, video, ensureSetLog, buildLogRequest)
      .catch(showActionError)
      .finally(() => setIsPreparing(false));
  };
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
  const action = (icon: ComponentProps<typeof MaterialCommunityIcons>['name'], label: string, onPress: () => void, unavailable = false) => {
    const disabled = !editable || choosing || isPreparing || unavailable;
    const color = `${colors.gold500}${disabled ? '4D' : 'B8'}`;
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.point7, flexShrink: 0,
          borderRadius: radius.control, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: spacing.minimumHitTarget,
          borderWidth: spacing.point1, borderColor: `${colors.gold500}${disabled ? '1F' : '3D'}`, opacity: pressed ? 0.6 : 1 })}>
        <MaterialCommunityIcons name={icon} size={spacing.space5} color={color} />
        <Text style={{ color, flexShrink: 0, ...font.body(fontMetrics.size15, 'semibold') }}>{label}</Text>
      </Pressable>
    );
  };
  const playable = Boolean(record.localUri || record.source?.uri || record.attachmentId);
  const preparing = isPreparing || record.status === 'preparing';
  const errorMessage = actionErrorMessage ?? record.errorMessage;
  const percentage = Math.round(record.progress * 100);
  const statusLabel = record.status === 'uploading'
    ? t(percentage > 0 ? 'student.videoUpload.sendingProgress' : 'student.videoUpload.sending', [percentage])
    : t(record.status === 'failed' ? 'student.videoAttachmentV3Controls.copy008' : record.status === 'uploaded' ? 'student.videoAttachmentV3Controls.copy006' : 'student.videoAttachmentV3Controls.copy007');
  return (
    <View style={{ backgroundColor: colors.surfaceCard, borderRadius: radius.card, paddingHorizontal: spacing.point14, paddingVertical: spacing.point11, gap: spacing.space2 }}>
      {playable ? <VideoPlayback key={record.createdAt} inline badge={badge} localUri={record.localUri ?? record.source?.uri ?? null} attachmentId={record.attachmentId} onClose={() => undefined} /> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md }}>
        {!playable ? <Text style={{ color: colors.textPrimary, ...font.body(fontMetrics.size16, 'medium') }}>{t('student.videoAttachmentSection.copy001')}</Text> : null}
        {preparing ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexGrow: 1 }}>
          <ActivityIndicator color={colors.gold500} />
          <Text style={{ ...font.body(fontMetrics.size12, 'medium'), color: colors.textSecondary }}>{t('student.videoAttachmentV3Controls.copy003')}</Text>
        </View> : record.status !== 'none' ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs, flexGrow: 1, flexShrink: 1 }}>
          <Text style={{ ...font.body(fontMetrics.size12), color: record.status === 'failed' ? colors.danger : colors.textSecondary, flexShrink: 1 }}>
            {statusLabel}
          </Text>
          {record.status === 'failed' ? action('refresh', t('student.videoAttachmentV3Controls.copy009'), () => {
            setActionErrorMessage(null);
            void videoUploadManager.retry(identity, ensureSetLog).catch(showActionError);
          }) : null}
        </View> : <View style={{ flex: 1 }} />}
        {!preparing ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.point10, marginLeft: 'auto', flexShrink: 0 }}>
          {record.status === 'none' ? <>
            {action('video', t('student.videoAttachmentV3Controls.copy001'), () => void choose('camera'), !hasCamera)}
            {action('image', t('student.videoAttachmentV3Controls.copy002'), () => void choose('library'))}
          </> : <>
            {action('image', t('student.videoAttachmentV3Controls.copy004'), () => void choose('library'))}
            {action('trash-can-outline', t('student.videoAttachmentV3Controls.copy005'), () => void remove())}
          </>}
        </View> : null}
      </View>
      {errorMessage ? <Text style={{ ...font.body(fontMetrics.size11, 'medium'), color: colors.danger }}>{errorMessage}</Text> : null}
      {overlay.isFallback && fallbackNode !== null ? (
        <Modal visible animationType="slide" onRequestClose={dismiss}>{fallbackNode}</Modal>
      ) : null}
    </View>
  );
}
