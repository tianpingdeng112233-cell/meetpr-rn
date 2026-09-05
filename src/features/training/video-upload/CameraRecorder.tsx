import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, Camera } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { useEffect, useRef, useState } from 'react';
import {
  AppState,
  Linking,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import Video from 'react-native-video';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton, font, spacing, useColors } from '@/design';
import { t } from '@/i18n';
import { deleteLocalVideo } from './native';
import { VIDEO_MAX_DURATION_SECONDS } from './model';
const SAVE_TO_PHOTOS_KEY = 'training.video.saveToPhotos.v1';
const clockText = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
export function CameraRecorder({
  onClose,
  onUse,
  maxDurationSeconds = VIDEO_MAX_DURATION_SECONDS,
}: {
  onClose: () => void;
  onUse: (uri: string) => void;
  maxDurationSeconds?: number;
}) {
  const colors = useColors();
  const camera = useRef<CameraView>(null);
  const [permission, setPermission] = useState<
    'loading' | 'granted' | 'denied'
  >('loading');
  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [review, setReview] = useState<string | null>(null);
  const [saveToPhotos, setSaveToPhotos] = useState(true);
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);
  const [using, setUsing] = useState(false);
  const [error, setError] = useState(false);
  const generation = useRef(0);
  const ownedUri = useRef<string | null>(null);
  const startedAt = useRef(0);
  const photosPermission = useRef<Promise<boolean> | null>(null);
  const closed = useRef(false);
  const recordingActive = useRef(false);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  const requestPhotos = () => {
    photosPermission.current ??= MediaLibrary.getPermissionsAsync(true, [
      'video',
    ])
      .then(async (current) => {
        if (current.granted) return true;
        if (!current.canAskAgain) return false;
        return (await MediaLibrary.requestPermissionsAsync(true, ['video']))
          .granted;
      })
      .catch(() => false);
    return photosPermission.current;
  };
  useEffect(() => {
    let live = true;
    closed.current = false;
    void (async () => {
      const camera = await Camera.requestCameraPermissionsAsync();
      const microphone = await Camera.requestMicrophonePermissionsAsync();
      if (live)
        setPermission(
          camera.granted && microphone.granted ? 'granted' : 'denied',
        );
    })().catch(() => {
      if (live) setPermission('denied');
    });
    void AsyncStorage.getItem(SAVE_TO_PHOTOS_KEY)
      .then((value) => {
        if (live) {
          setSaveToPhotos(value !== 'false');
          setPreferenceLoaded(true);
        }
      })
      .catch(() => {
        if (live) setPreferenceLoaded(true);
      });
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        generation.current++;
        cameraRefStop();
        deleteLocalVideo(ownedUri.current);
        ownedUri.current = null;
        closeRef.current();
      }
    });
    const cameraRefStop = () => cameraRef.current?.stopRecording();
    const cameraRef = camera;
    return () => {
      live = false;
      closed.current = true;
      // Invalidate any recordAsync promise still settling after unmount.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++;
      cameraRefStop();
      deleteLocalVideo(ownedUri.current);
      subscription.remove();
    };
  }, []);
  useEffect(() => {
    if (review && preferenceLoaded && saveToPhotos) void requestPhotos();
  }, [review, preferenceLoaded, saveToPhotos]);
  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => {
      const seconds = Math.min(
        maxDurationSeconds,
        Math.floor((Date.now() - startedAt.current) / 1000),
      );
      setElapsed(seconds);
      if (seconds >= maxDurationSeconds) camera.current?.stopRecording();
    }, 200);
    return () => clearInterval(timer);
  }, [recording, maxDurationSeconds]);
  const record = async () => {
    if (recordingActive.current) {
      camera.current?.stopRecording();
      return;
    }
    if (!ready || closed.current) return;
    recordingActive.current = true;
    const current = ++generation.current;
    setError(false);
    setRecording(true);
    setElapsed(0);
    startedAt.current = Date.now();
    try {
      const video = await camera.current?.recordAsync({
        maxDuration: maxDurationSeconds,
      });
      if (current !== generation.current || closed.current) {
        deleteLocalVideo(video?.uri ?? null);
        return;
      }
      if (!video?.uri) throw new Error('Recording incomplete');
      ownedUri.current = video.uri;
      setReview(video.uri);
    } catch {
      if (current === generation.current && !closed.current) setError(true);
    } finally {
      recordingActive.current = false;
      if (current === generation.current && !closed.current)
        setRecording(false);
    }
  };
  const use = async () => {
    if (!review || using) return;
    setUsing(true);
    if (saveToPhotos) {
      try {
        if (!(await requestPhotos())) throw new Error('Photos denied');
        await MediaLibrary.Asset.create(review);
      } catch {
        ToastAndroid.show(
          t('student.cameraRecorderView.copy013'),
          ToastAndroid.LONG,
        );
      }
    }
    if (closed.current) return;
    ownedUri.current = null;
    onUse(review);
  };
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgBase }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgBase }}>
        <View style={{ padding: spacing.base }}>
          <AppButton
            variant="secondary"
            label={t('student.cameraRecorderComponents.copy011')}
            onPress={onClose}
          />
        </View>
        {permission === 'denied' ? (
          <View style={{ padding: spacing.xl, gap: spacing.base }}>
            <Text style={{ color: colors.textPrimary }}>
              {t('student.cameraRecorderView.copy002')}
            </Text>
            <Text style={{ color: colors.textSecondary }}>
              {t('student.cameraRecorderView.copy003')}
            </Text>
            <AppButton
              label={t('student.cameraRecorderView.copy004')}
              onPress={() => void Linking.openSettings()}
            />
          </View>
        ) : permission === 'granted' ? (
          <>
            <View style={{ flex: 1, backgroundColor: colors.bgDeep }}>
              {review ? (
                <Video
                  source={{ uri: review }}
                  repeat
                  controls
                  resizeMode="contain"
                  style={StyleSheet.absoluteFill}
                  onError={() => setError(true)}
                />
              ) : (
                <CameraView
                  ref={camera}
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  mode="video"
                  videoQuality="720p"
                  videoBitrate={2_750_000}
                  onCameraReady={() => setReady(true)}
                  onMountError={() => {
                    camera.current?.stopRecording();
                    closeRef.current();
                  }}
                />
              )}
            </View>
            <View
              style={{
                padding: spacing.base,
                gap: spacing.md,
                alignItems: 'center',
              }}
            >
              {error ? (
                <Text style={{ color: colors.danger }}>
                  {t('student.cameraRecorderView.copy008')}
                </Text>
              ) : null}
              {review ? (
                <>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.md,
                    }}
                  >
                    <Text style={{ color: colors.textPrimary }}>
                      {t('student.cameraRecorderComponents.copy006')}
                    </Text>
                    <Switch
                      disabled={!preferenceLoaded || using}
                      value={saveToPhotos}
                      onValueChange={(value) => {
                        setSaveToPhotos(value);
                        void AsyncStorage.setItem(
                          SAVE_TO_PHOTOS_KEY,
                          String(value),
                        ).catch(() => undefined);
                      }}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', gap: spacing.base }}>
                    <AppButton
                      disabled={using}
                      variant="secondary"
                      label={t('student.cameraRecorderView.copy009')}
                      onPress={() => {
                        deleteLocalVideo(review);
                        ownedUri.current = null;
                        setReview(null);
                        setReady(false);
                        setError(false);
                      }}
                    />
                    <AppButton
                      disabled={using || !preferenceLoaded || error}
                      label={t('student.cameraRecorderComponents.copy010')}
                      onPress={() => void use()}
                    />
                  </View>
                </>
              ) : (
                <>
                  <Text style={{ color: colors.textPrimary, ...font.mono(18) }}>
                    {clockText(elapsed)}
                  </Text>
                  <Text style={{ color: colors.textSecondary }}>
                    {t('student.cameraRecorderComponents.copy002', [
                      maxDurationSeconds - elapsed,
                    ])}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t(
                      recording
                        ? 'student.cameraRecorderComponents.copy003'
                        : 'student.cameraRecorderComponents.copy004',
                    )}
                    disabled={!ready}
                    onPress={() => void record()}
                    style={{
                      width: 82,
                      height: 82,
                      borderRadius: 41,
                      borderWidth: 4,
                      borderColor: colors.gold500,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <View
                      style={{
                        width: recording ? 32 : 66,
                        height: recording ? 32 : 66,
                        borderRadius: recording ? 6 : 33,
                        backgroundColor: colors.gold500,
                      }}
                    />
                  </Pressable>
                </>
              )}
            </View>
          </>
        ) : (
          <Text style={{ color: colors.textSecondary }}>
            {t('student.cameraRecorderView.copy001')}
          </Text>
        )}
      </SafeAreaView>
    </View>
  );
}
