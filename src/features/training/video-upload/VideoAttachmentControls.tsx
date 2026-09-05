import type { SetLogUpsertRequest } from '@/api/domains/sets';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { CameraRecorder } from './CameraRecorder';
import { VideoPlayback } from './VideoPlayback';
import { useOverlayHost } from '../OverlayHost';
import { useCameraAvailability } from './use-camera-availability';
import type { SelectedVideo } from './model';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { t } from '@/i18n';
import { Alert, Modal, Pressable, Text, View } from 'react-native';

import { useColors, radius, spacing, typography } from '@/design';

import { requestVideoUploadConsent } from './consent';
import { videoUploadManager } from './manager';
import { pickTrainingVideo, VideoNativeError, type VideoSource } from './native';
import { selectVideoUpload, useVideoUploadStore } from './store';

type Props = {
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
}: Props) {
  const colors = useColors();
  const record = useVideoUploadStore(selectVideoUpload(studentId, stableSetId));
  const [choosing, setChoosing] = useState(false);
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
    if (!editable || choosing) return;
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
    void videoUploadManager
      .attach(identity, video, ensureSetLog, buildLogRequest)
      .catch(showActionError);
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
  const action = (label: string, onPress: () => void) => (
    <Pressable
      disabled={!editable || choosing}
      onPress={onPress}
      style={{
        borderRadius: radius.pill,
        padding: spacing.sm,
        backgroundColor: colors.goldSoft,
      }}
    >
      <Text style={{ color: colors.goldText, ...typography.footnote }}>
        {label}
      </Text>
    </Pressable>
  );
  return (
    <View style={{ gap: spacing.sm }}>
      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
      >
        <Pressable
          disabled={record.status === 'none'}
          onPress={() =>
            present(
              <VideoPlayback
                localUri={record.localUri ?? record.source?.uri ?? null}
                attachmentId={record.attachmentId}
                onClose={dismiss}
              />,
            )
          }
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
          }}
        >
          {record.status !== 'none' ? (
            <MaterialCommunityIcons
              name="play-circle-outline"
              size={22}
              color={colors.gold500}
            />
          ) : null}
          <Text style={{ color: colors.textSecondary }}>
            {t('student.videoAttachmentSection.copy001')}
          </Text>
        </Pressable>
        {record.status === 'none' ? (
          <>
            {hasCamera
              ? action(
                  t('student.videoAttachmentV3Controls.copy001'),
                  () => void choose('camera'),
                )
              : null}
            {action(
              t('student.videoAttachmentV3Controls.copy002'),
              () => void choose('library'),
            )}
          </>
        ) : (
          <>
            {action(t('student.videoAttachmentV3Controls.copy004'), () =>
              Alert.alert(
                t('student.videoAttachmentV3Controls.copy004'),
                undefined,
                [
                  ...(hasCamera
                    ? [
                        {
                          text: t('student.videoAttachmentV3Controls.copy001'),
                          onPress: () => void choose('camera'),
                        },
                      ]
                    : []),
                  {
                    text: t('student.videoAttachmentV3Controls.copy002'),
                    onPress: () => void choose('library'),
                  },
                  {
                    text: t('student.cameraRecorderView.copy005'),
                    style: 'cancel',
                  },
                ],
              ),
            )}
            {action(
              t('student.videoAttachmentV3Controls.copy005'),
              () => void remove(),
            )}
          </>
        )}
      </View>
      {record.status === 'failed' ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
          }}
        >
          <Text style={{ color: colors.danger, flex: 1 }}>
            {record.errorMessage ?? t('student.videoAttachmentV3Controls.copy008')}
          </Text>
          {action(
            t('student.videoAttachmentV3Controls.copy009'),
            () => {
              setActionErrorMessage(null);
              void videoUploadManager
                .retry(identity, ensureSetLog)
                .catch(showActionError);
            },
          )}
        </View>
      ) : null}
      {actionErrorMessage ? (
        <Text style={{ color: colors.danger }}>{actionErrorMessage}</Text>
      ) : null}
      {overlay.isFallback && fallbackNode !== null ? (
        <Modal visible animationType="slide" onRequestClose={dismiss}>
          {fallbackNode}
        </Modal>
      ) : null}
    </View>
  );
}
