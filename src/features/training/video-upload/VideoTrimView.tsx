import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, StyleSheet, Text, View } from 'react-native';
import Video, { type VideoRef } from 'react-native-video';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { font, radius, spacing, useColors } from '@/design';
import { t } from '@/i18n';
import { VIDEO_MAX_DURATION_SECONDS } from './model';
import { deleteLocalVideo } from './native';
import { copyTrimSource, trainingVideoTrim } from './trim-native';
import { TrimSession, type TrimOutcome } from './trim-session';
import { trimSecondsAtTouch, type TrimDrag } from './trim-gesture';
import { createTrimSelection, isTrimSelectionValid, moveTrimEnd, moveTrimStart, type TrimSelection } from './trim-selection';

const timeText = (seconds: number) => {
  const rounded = Math.round(Math.max(0, seconds));
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`;
};

function warnTrimPreparation(step: string, error: unknown) {
  const detail = error && typeof error === 'object' ? error as { name?: unknown; message?: unknown } : {};
  const safeText = (value: unknown, fallback: string) => {
    if (typeof value !== 'string') return fallback;
    // Native errors can embed source paths, including filenames with spaces.
    // Omit the whole field in that case; never log the error object or stack.
    return /[/\\]|\b[a-z][a-z0-9+.-]*:/i.test(value) ? '[redacted]' : value;
  };
  console.warn(`[VideoTrim] ${step}`, {
    name: safeText(detail.name, 'Error'),
    message: safeText(detail.message ?? error, 'Unknown error'),
  });
}

export function VideoTrimView({ uri, onOutcome }: { uri: string; onOutcome: (outcome: TrimOutcome) => void }) {
  const colors = useColors();
  const player = useRef<VideoRef>(null);
  const session = useRef<TrimSession | null>(null);
  const callback = useRef(onOutcome);
  useEffect(() => { callback.current = onOutcome; }, [onOutcome]);
  const [workingUri, setWorkingUri] = useState<string | null>(null);
  const [selection, setSelection] = useState(() => createTrimSelection(0, VIDEO_MAX_DURATION_SECONDS));
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportingRef = useRef(false);
  const position = useRef(0);
  const pendingSeek = useRef<number | null>(null);
  const ready = loaded && isTrimSelectionValid(selection);

  useEffect(() => {
    let source: string | null = null;
    let step = 'copyTrimSource';
    const current = new TrimSession({
      remove: deleteLocalVideo,
      cancelExport: () => {
        const pendingSource = source;
        if (pendingSource) void Promise.resolve().then(() => trainingVideoTrim().cancelTrim(pendingSource)).catch(() => undefined);
      },
      onOutcome: outcome => callback.current(outcome),
    });
    session.current = current;
    void (async () => {
      source = await copyTrimSource(uri);
      current.own(source);
      if (!current.active) return;
      step = 'trimInfo';
      const info = await trainingVideoTrim().trimInfo(source);
      if (!current.active) return;
      if (info.videoTrackCount !== 1 || !Number.isFinite(info.durationMs) || info.durationMs <= 0) {
        throw new Error('Invalid trim source');
      }
      setSelection(createTrimSelection(info.durationMs / 1000, VIDEO_MAX_DURATION_SECONDS));
      setWorkingUri(source);
      // Thumbnails are decorative: decoding one bad frame must not block an otherwise playable clip.
      step = 'thumbnails';
      const images = await trainingVideoTrim().thumbnails(source, 10).catch(error => {
        warnTrimPreparation('thumbnails', error);
        return [];
      });
      images.forEach(image => current.own(image));
      if (current.active) setThumbnails(images);
    })().catch(error => {
      warnTrimPreparation(step, error);
      current.failed();
    });
    return () => current.dispose();
  }, [uri]);

  const seek = (seconds: number) => {
    pendingSeek.current = seconds;
    position.current = seconds;
    player.current?.seek(seconds, 0);
  };
  const rewind = () => { setPlaying(false); seek(selection.startSeconds); };
  const move = (edge: 'start' | 'end', seconds: number) => {
    if (!ready || exportingRef.current) return;
    setPlaying(false);
    const next = edge === 'start' ? moveTrimStart(selection, seconds) : moveTrimEnd(selection, seconds);
    setSelection(next);
    seek(edge === 'start' ? next.startSeconds : next.endSeconds);
  };
  const close = () => {
    if (!exportingRef.current) session.current?.cancelled();
  };
  const save = async () => {
    const current = session.current;
    if (!ready || !workingUri || !current?.active || exportingRef.current) return;
    exportingRef.current = true;
    setExporting(true);
    setPlaying(false);
    try {
      const result = await trainingVideoTrim().trim(workingUri, Math.round(selection.startSeconds * 1000), Math.round(selection.endSeconds * 1000));
      current.saved(result);
    } catch (error) {
      warnTrimPreparation('export', error);
      current.failed();
    }
  };
  return (
    <Modal visible presentationStyle="fullScreen" statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceCard }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.space2, backgroundColor: colors.surfaceCard }}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('student.cameraRecorderView.copy005')} disabled={exporting} onPress={close} style={styles.toolbarButton}>
            <MaterialCommunityIcons name="close" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ flex: 1, textAlign: 'center', color: colors.textPrimary, ...font.body(17, 'semibold') }}>{t('student.videoTrimView.copy002')}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={t('student.videoTrimView.copy003')} disabled={!ready || exporting} onPress={() => void save()} style={styles.toolbarButton}>
            {exporting ? <ActivityIndicator color={colors.gold500} /> : <Text style={{ color: colors.gold500, opacity: ready ? 1 : 0.4, ...font.body(16, 'semibold') }}>{t('student.videoTrimView.copy003')}</Text>}
          </Pressable>
        </View>
        <TrimTimeline selection={selection} thumbnails={thumbnails} enabled={ready && !exporting} onMove={move} />
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          {workingUri ? <Video ref={player} source={{ uri: workingUri }} paused={!playing} resizeMode="contain" style={StyleSheet.absoluteFill}
            progressUpdateInterval={50} onLoad={() => setLoaded(true)} onError={event => {
              warnTrimPreparation('player.onError', event.error ? {
                name: event.error.errorException ?? 'VideoError',
                message: event.error.errorString ?? event.error.localizedDescription,
              } : event);
              session.current?.failed();
            }}
            onSeek={({ seekTime }) => {
              // Native seeks resolve asynchronously; older handle seeks may finish late.
              if (pendingSeek.current !== null && Math.abs(seekTime - pendingSeek.current) < 0.002) {
                position.current = pendingSeek.current;
                pendingSeek.current = null;
              }
            }}
            onProgress={({ currentTime }) => {
              if (pendingSeek.current !== null || !Number.isFinite(currentTime)) return;
              position.current = currentTime;
              if (playing && currentTime >= selection.endSeconds - 0.03) rewind();
            }}
            onEnd={() => { if (playing && pendingSeek.current === null) rewind(); }} /> : null}
          {!ready ? <View style={styles.loading}><ActivityIndicator color="#fff" /><Text style={{ color: '#fff', ...font.body(14) }}>{t('student.videoTrimView.copy001')}</Text></View> : null}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={t(playing ? 'student.videoTrimView.copy004' : 'student.videoTrimView.copy005')}
          disabled={!ready || exporting} style={styles.playback} onPress={() => {
            if (playing) { setPlaying(false); return; }
            if (!Number.isFinite(position.current) || position.current < selection.startSeconds || position.current >= selection.endSeconds) seek(selection.startSeconds);
            setPlaying(true);
          }}>
          <MaterialCommunityIcons name={playing ? 'pause' : 'play'} size={22} color={colors.gold500} />
          <Text style={{ color: colors.gold500, ...font.body(16, 'semibold') }}>{t(playing ? 'student.videoTrimView.copy004' : 'student.videoTrimView.copy005')}</Text>
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
}

function TrimTimeline({ selection, thumbnails, enabled, onMove }: {
  selection: TrimSelection; thumbnails: string[]; enabled: boolean; onMove: (edge: 'start' | 'end', seconds: number) => void;
}) {
  const colors = useColors();
  const [width, setWidth] = useState(1);
  const trackWidth = Math.max(1, width - spacing.minimumHitTarget);
  const origin = spacing.minimumHitTarget / 2;
  const x = (seconds: number) => origin + trackWidth * (selection.sourceDurationSeconds > 0 ? seconds / selection.sourceDurationSeconds : 0);
  const startX = x(selection.startSeconds);
  const endX = x(selection.endSeconds);
  return <View accessibilityLabel={t('student.videoTrimTimeline.copy002')} style={{ paddingHorizontal: 16, paddingVertical: 12, gap: spacing.space2 }}>
    <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ height: 64 }}>
      <View style={{ position: 'absolute', left: origin, width: trackWidth, height: 64, flexDirection: 'row', overflow: 'hidden', borderRadius: radius.sm, backgroundColor: colors.surfaceRaised }}>
        {Array.from({ length: 10 }, (_, i) => <View key={i} style={{ flex: 1 }}>{thumbnails[i] ? <Image source={{ uri: thumbnails[i] }} resizeMode="cover" style={{ width: '100%', height: '100%' }} /> : null}</View>)}
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', left: origin, width: startX - origin, height: 64, backgroundColor: '#0000009E' }} />
      <View pointerEvents="none" style={{ position: 'absolute', left: endX, width: origin + trackWidth - endX, height: 64, backgroundColor: '#0000009E' }} />
      <View pointerEvents="none" style={{ position: 'absolute', left: startX, width: Math.max(0, endX - startX), height: 64, borderColor: colors.gold500, borderWidth: 3, borderRadius: radius.sm }} />
      {(['start', 'end'] as const).map(edge => <TrimHandle key={edge} edge={edge} x={edge === 'start' ? startX : endX}
        seconds={edge === 'start' ? selection.startSeconds : selection.endSeconds} secondsPerPoint={selection.sourceDurationSeconds / trackWidth}
        enabled={enabled} onMove={seconds => onMove(edge, seconds)} />)}
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={{ color: colors.textTertiary, ...font.mono(11) }}>{timeText(selection.startSeconds)}</Text>
      <Text style={{ color: colors.gold500, ...font.mono(12, 'semibold') }}>{t('student.videoTrimTimeline.copy001', [timeText(selection.endSeconds - selection.startSeconds)])}</Text>
      <Text style={{ color: colors.textTertiary, ...font.mono(11) }}>{timeText(selection.endSeconds)}</Text>
    </View>
  </View>;
}

function TrimHandle({ edge, x, seconds, secondsPerPoint, enabled, onMove }: {
  edge: 'start' | 'end'; x: number; seconds: number; secondsPerPoint: number; enabled: boolean; onMove: (seconds: number) => void;
}) {
  const colors = useColors();
  const drag = useRef<TrimDrag | null>(null);
  return <View accessible accessibilityRole="adjustable" accessibilityLabel={t(edge === 'start' ? 'student.videoTrimTimeline.copy003' : 'student.videoTrimTimeline.copy004')}
    accessibilityValue={{ text: timeText(seconds) }} accessibilityState={{ disabled: !enabled }}
    accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
    onAccessibilityAction={event => { if (enabled) onMove(seconds + (event.nativeEvent.actionName === 'increment' ? 1 : -1)); }}
    onStartShouldSetResponder={event => {
      if (!enabled) return false;
      drag.current = { touchStartPageX: event.nativeEvent.pageX, handleStartSeconds: seconds, secondsPerPoint };
      return true;
    }} onResponderTerminationRequest={() => false}
    onResponderGrant={event => { if (drag.current) onMove(trimSecondsAtTouch(event.nativeEvent.pageX, drag.current)); }}
    onResponderMove={event => { if (drag.current) onMove(trimSecondsAtTouch(event.nativeEvent.pageX, drag.current)); }}
    onResponderRelease={event => {
      if (drag.current) onMove(trimSecondsAtTouch(event.nativeEvent.pageX, drag.current));
      drag.current = null;
    }}
    onResponderTerminate={() => { drag.current = null; }}
    style={{ position: 'absolute', left: x - spacing.minimumHitTarget / 2, width: spacing.minimumHitTarget, height: 64, alignItems: 'center' }}>
    <View style={{ width: 22, height: 64, borderRadius: radius.sm, backgroundColor: colors.gold500, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 2, height: 26, backgroundColor: colors.inkOnGold }} />
    </View>
  </View>;
}

const styles = StyleSheet.create({
  toolbarButton: { minWidth: spacing.minimumHitTarget, minHeight: spacing.minimumHitTarget, alignItems: 'center', justifyContent: 'center' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.space2 },
  playback: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.space2 },
});
