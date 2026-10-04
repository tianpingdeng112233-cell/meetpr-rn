import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, Camera } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, Modal, StatusBar, StyleSheet, Text, ToastAndroid, View } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import Video from 'react-native-video';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton, IconButton, font, radius, spacing, useColors } from '@/design';
import { BrandSwitch } from '@/design/BrandSwitch';
import { useTheme } from '@/design/theme';
import { TrimPlayButton } from './TrimPlayButton';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { t } from '@/i18n';
import { deleteLocalVideo } from './native';
import { VIDEO_MAX_DURATION_SECONDS } from './model';
import { TrimTimeline } from './TrimTimeline';
import { useTrimSource, warnTrimPreparation } from './useTrimSource';
import { trainingVideoTrim } from './trim-native';
const SAVE_TO_PHOTOS_KEY = 'training.video.saveToPhotos.v1';
const TRIM_HINT_DISMISSED_KEY = 'training.video.trimHintDismissed.v1';
const clockText = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
type CameraRecorderProps = {
  onClose: () => void;
  onUse: (uri: string) => void;
  maxDurationSeconds?: number;
};

export function CameraRecorder({
  onClose,
  onUse,
  maxDurationSeconds = VIDEO_MAX_DURATION_SECONDS,
}: CameraRecorderProps) {
  const colors = useColors();
  const { scheme } = useTheme();
  const [dragging, setDragging] = useState(false);
  const camera = useRef<CameraView>(null);
  const [permission, setPermission] = useState<
    'loading' | 'granted' | 'denied'
  >('loading');
  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [review, setReview] = useState<string | null>(null);
  const [trimHintVisible, setTrimHintVisible] = useState(false);
  const [hintClosed, setHintClosed] = useState(false);
  const [saveToPhotos, setSaveToPhotos] = useState(true);
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);
  const [using, setUsing] = useState(false);
  const usingRef = useRef(false);
  const trimTouched = useRef(false);
  const [error, setError] = useState(false);
  const { session, workingUri, thumbnails, status, playback } = useTrimSource(review, () => {}, 'review');
  const { player, selection, ready: trimReady, playing, setPlaying, move, toggle, onLoad, onSeek, onProgress, onEnd } = playback;
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
    void AsyncStorage.getItem(TRIM_HINT_DISMISSED_KEY)
      .then(value => { if (live) setTrimHintVisible(value !== 'true'); })
      .catch(() => { if (live) setTrimHintVisible(true); });
    const subscription = AppState.addEventListener('change', (state) => {
      // Only interrupt an in-flight recording; completed reviews still own their local video.
      // Android also reports a transient 'background' while the camera / permission activity attaches,
      // so closing the recorder here would dismiss it before the user ever sees it.
      if (state === 'background' && recordingActive.current) {
        generation.current++;
        cameraRefStop();
        deleteLocalVideo(ownedUri.current);
        ownedUri.current = null;
        recordingActive.current = false;
        if (live) {
          setRecording(false);
          setReview(null);
          setError(false);
          setElapsed(0);
        }
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
      setHintClosed(false);
      trimTouched.current = false;
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
    if (!review || usingRef.current || closed.current) return;
    usingRef.current = true;
    setUsing(true);
    const current = session.current;
    const changed = trimTouched.current && status === 'ready' &&
      (selection.startSeconds > 0 || selection.endSeconds < selection.sourceDurationSeconds);
    let result: { uri: string; durationMs: number } | null = null;
    if (changed && workingUri && current?.active) {
      setPlaying(false);
      try {
        result = await trainingVideoTrim().trim(workingUri, Math.round(selection.startSeconds * 1000), Math.round(selection.endSeconds * 1000));
        // Own before awaiting Photos so unmount also reclaims an export in that window.
        current.own(result.uri);
        if (!current.active || closed.current) return;
      } catch (error) {
        warnTrimPreparation('export', error);
        if (!closed.current && current.active) {
          ToastAndroid.show(t('student.cameraRecorderView.copy011'), ToastAndroid.LONG);
          usingRef.current = false;
          setUsing(false);
        }
        return;
      }
    }
    const output = result?.uri ?? review;
    if (saveToPhotos) {
      try {
        if (!(await requestPhotos())) throw new Error('Photos denied');
        if (closed.current) return;
        await MediaLibrary.Asset.create(output);
      } catch {
        if (!closed.current) ToastAndroid.show(t('student.cameraRecorderView.copy013'), ToastAndroid.LONG);
      }
    }
    if (closed.current) return;
    if (result) {
      current?.saved(result);
      deleteLocalVideo(ownedUri.current);
      dismissTrimHint();
    } else {
      current?.dispose();
    }
    ownedUri.current = null;
    onUse(output);
  };
  const close = () => {
    if (usingRef.current) return;
    closed.current = true;
    generation.current++;
    camera.current?.stopRecording();
    session.current?.dispose();
    deleteLocalVideo(ownedUri.current);
    ownedUri.current = null;
    onClose();
  };
  const dismissTrimHint = () => {
    setTrimHintVisible(false);
    void AsyncStorage.setItem(TRIM_HINT_DISMISSED_KEY, 'true').catch(() => undefined);
  };
  const toolbar = (
          <View testID="trim-header" pointerEvents="box-none" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: spacing.base, backgroundColor: review ? colors.bgBase : undefined }}>
            <IconButton
              haptic="none"
              accessibilityLabel={t('student.cameraRecorderComponents.copy011')}
              disabled={using}
              onPress={close}
              style={{ backgroundColor: review ? colors.surfaceRaised : colors.numberPadScrim }}
              icon={({ size }) => <MaterialCommunityIcons name="close" size={size} color={review ? colors.textPrimary : colors.inkOnCTAFill} />}
            />
            {review ? <AppButton variant="link" disabled={using} label={t('student.cameraRecorderView.copy009')} onPress={() => {
              if (usingRef.current) return;
              session.current?.dispose();
              deleteLocalVideo(review);
              ownedUri.current = null;
              setReview(null);
              setReady(false);
              setError(false);
            }} /> : null}
            {permission === 'granted' && !review ? (
              <View style={{ alignItems: 'flex-end', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.control, backgroundColor: colors.numberPadScrim }}>
                <Text style={{ color: colors.inkOnCTAFill, ...font.mono(18) }}>{clockText(elapsed)}</Text>
                <Text style={{ color: colors.inkOnCTAFill, ...font.body(12) }}>
                  {t('student.cameraRecorderComponents.copy002', [maxDurationSeconds - elapsed])}
                </Text>
              </View>
            ) : null}
          </View>
  );
  return (
    <Modal visible presentationStyle="fullScreen" statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
      <StatusBar barStyle={review && scheme === 'light' ? 'dark-content' : 'light-content'} />
      <SafeAreaView testID="trim-page" style={{ flex: 1, backgroundColor: review ? colors.bgBase : colors.chatImageBackground }}>
        {review ? toolbar : null}
        <View testID="trim-video" style={{ flex: 1, minHeight: review ? 180 : undefined, marginHorizontal: review ? spacing.base : 0, backgroundColor: colors.chatImageBackground }}>
          {permission === 'granted' ? review ? (
            <Video
              source={{ uri: review }}
              ref={player}
              repeat={!trimReady}
              paused={!playing || using}
              resizeMode="contain"
              style={StyleSheet.absoluteFill}
              onLoad={onLoad}
              progressUpdateInterval={50}
              onSeek={onSeek}
              onProgress={onProgress}
              onEnd={onEnd}
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
          ) : null}
          {!review ? toolbar : null}
          {review ? <View pointerEvents="box-none" style={{ position: 'absolute', bottom: spacing.base, left: spacing.base, right: spacing.base, alignItems: 'center', gap: spacing.space2 }}>
            <TrimPlayButton playing={playing} disabled={using} onPress={() => { if (!usingRef.current) toggle(); }} />
            {trimHintVisible && !hintClosed && !dragging && status === 'ready' ? <View style={{ alignSelf: 'stretch', borderRadius: radius.sm, backgroundColor: colors.surfaceRaised, padding: spacing.space2 }}>
              <IconButton accessibilityLabel={t('student.cameraRecorderView.copy005')} onPress={() => setHintClosed(true)}
                style={{ position: 'absolute', top: 0, right: 0, backgroundColor: 'transparent', zIndex: 1 }}
                icon={({ size }) => <MaterialCommunityIcons name="close" size={size} color={colors.textSecondary} />} />
              <Text numberOfLines={3} adjustsFontSizeToFit ellipsizeMode="clip" style={{ paddingRight: spacing.minimumHitTarget, color: colors.textSecondary, ...font.body(12) }}>{t('student.cameraRecorderComponents.copy007')}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={t('student.cameraRecorderComponents.copy008')} onPress={dismissTrimHint}
                style={{ alignSelf: 'flex-end', minHeight: spacing.minimumHitTarget, justifyContent: 'center' }}>
                <Text style={{ color: colors.textSecondary, ...font.body(11, 'semibold') }}>{t('student.cameraRecorderComponents.copy008')}</Text>
              </Pressable>
              <View pointerEvents="none" style={{ position: 'absolute', bottom: -8, alignSelf: 'center', borderLeftWidth: 8, borderRightWidth: 8, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: colors.surfaceRaised }} />
            </View> : null}
          </View> : null}
          {permission === 'denied' ? (
            <View style={{ padding: spacing.xl, gap: spacing.base }}>
              <Text style={{ color: colors.inkOnCTAFill }}>{t('student.cameraRecorderView.copy002')}</Text>
              <Text style={{ color: colors.inkOnCTAFill }}>{t('student.cameraRecorderView.copy003')}</Text>
              <AppButton haptic="none" label={t('student.cameraRecorderView.copy004')} onPress={() => void Linking.openSettings()} />
            </View>
          ) : permission === 'loading' ? (
            <Text style={{ color: colors.inkOnCTAFill }}>{t('student.cameraRecorderView.copy001')}</Text>
          ) : !review ? (
            <View pointerEvents="box-none" style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: spacing.xxl, gap: spacing.md }}>
              {error ? <Text style={{ color: colors.danger }}>{t('student.cameraRecorderView.copy008')}</Text> : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(recording ? 'student.cameraRecorderComponents.copy003' : 'student.cameraRecorderComponents.copy004')}
                disabled={!ready}
                onPress={() => void record()}
                style={{ width: 82, height: 82, borderRadius: radius.pill, borderWidth: spacing.xs, borderColor: colors.gold500, alignItems: 'center', justifyContent: 'center' }}
              >
                <View style={{ width: recording ? 32 : 66, height: recording ? 32 : 66, borderRadius: recording ? spacing.point6 : radius.pill, backgroundColor: colors.gold500 }} />
              </Pressable>
            </View>
          ) : null}
        </View>
        {permission === 'granted' && review ? (
          <View style={{ padding: spacing.base, gap: spacing.md }}>
            {status !== 'failed' ? <TrimTimeline selection={selection} thumbnails={thumbnails} enabled={status === 'ready' && trimReady && !using} position={playback.position} onDraggingChange={setDragging}
              onScrub={(seconds, exact) => { if (status === 'ready' && trimReady && !usingRef.current) playback.scrub(seconds, exact); }}
              onMove={(edge, seconds) => {
              if (status === 'ready' && trimReady && !usingRef.current) { trimTouched.current = true; move(edge, seconds); }
            }} /> : null}
            {error ? <Text style={{ color: colors.danger }}>{t('student.cameraRecorderView.copy008')}</Text> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
              <Text style={{ color: colors.textPrimary, ...font.body(16), flexShrink: 1 }}>{t('student.cameraRecorderComponents.copy006')}</Text>
              <BrandSwitch
                accessibilityLabel={t('student.cameraRecorderComponents.copy006')}
                disabled={!preferenceLoaded || using}
                value={saveToPhotos}
                onValueChange={value => {
                  if (usingRef.current) return;
                  setSaveToPhotos(value);
                  void AsyncStorage.setItem(SAVE_TO_PHOTOS_KEY, String(value)).catch(() => undefined);
                }}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.base }}>
              <AppButton
                style={{ flex: 1 }}
                loading={using}
                disabled={using || !preferenceLoaded || error}
                label={t('student.cameraRecorderComponents.copy010')}
                onPress={() => void use()}
              />
            </View>
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}
