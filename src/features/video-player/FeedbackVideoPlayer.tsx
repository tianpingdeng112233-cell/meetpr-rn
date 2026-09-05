import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Video, { type VideoRef } from 'react-native-video';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { font, radius, spacing, useColors } from '@/design';
import { t } from '@/i18n';
import { FeedbackVideoAnnotationSelection, type AnnotationFrame } from './annotation-select';
import { FeedbackVideoAnnotationOverlay } from './FeedbackVideoAnnotationOverlay';
import { FeedbackVideoMarkerPanel } from './FeedbackVideoMarkerPanel';
import { FeedbackVideoScrubber } from './FeedbackVideoScrubber';
import { cycleRate, rateText } from './rate';
import { FeedbackVideoScrubState } from './scrub-state';
import { seekTime } from './time';
import type { FeedbackVideoMarker, VideoBadgeInfo } from './types';

export type FeedbackVideoPlayerProps = {
  videoId: string;
  url: string;
  markers?: FeedbackVideoMarker[] | null;
  markersFailed?: boolean;
  badge?: VideoBadgeInfo | null;
  onSeek?: (milliseconds: number) => void;
  refreshURL: (videoId: string) => Promise<string>;
  onMarkersRefresh?: () => void | Promise<void>;
  onClose: () => void;
};

/** A full-screen surface, hosted by OverlayHost or one top-level Modal. */
export function FeedbackVideoPlayer(props: FeedbackVideoPlayerProps) {
  // Identity changes start a fresh session, including the non-persistent rate.
  return <PlayerSession key={`${props.videoId}:${props.url}`} {...props} />;
}

function PlayerSession({ videoId, url, markers = null, markersFailed = false, onSeek, refreshURL, onMarkersRefresh, onClose }: FeedbackVideoPlayerProps) {
  const colors = useColors();
  const player = useRef<VideoRef>(null);
  const live = useRef(true);
  const callbacks = useRef({ onSeek, onMarkersRefresh });
  useEffect(() => { callbacks.current = { onSeek, onMarkersRefresh }; }, [onSeek, onMarkersRefresh]);
  const durationRef = useRef(0);
  const seekGeneration = useRef(0);
  const pendingSeek = useRef<{ seconds: number; deadline: number } | null>(null);
  const [item, setItem] = useState({ uri: url, revision: 0 });
  const [rate, setRate] = useState(1);
  const [paused, setPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [dragSeconds, setDragSeconds] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const retryPending = useRef(false);
  const [annotation, setAnnotation] = useState<AnnotationFrame | null>(null);
  const seek = useCallback((position: number, commitsPosition: boolean) => {
    const target = seekTime({ seconds: position }, durationRef.current);
    seekGeneration.current += 1;
    pendingSeek.current = { seconds: target, deadline: Date.now() + 1000 };
    player.current?.seek(target, 0.05);
    callbacks.current.onSeek?.(Math.round(target * 1000));
    if (commitsPosition) setSeconds(target);
  }, []);
  // Constructors retain event callbacks and never invoke them during render.
  // eslint-disable-next-line react-hooks/refs
  const scrub = useMemo(() => new FeedbackVideoScrubState(seek), [seek]);
  // eslint-disable-next-line react-hooks/refs
  const selection = useMemo(() => new FeedbackVideoAnnotationSelection({
    pause: () => setPaused(true),
    seek: milliseconds => { scrub.cancel(); setDragSeconds(null); seek(milliseconds / 1000, true); },
    changed: setAnnotation,
    refresh: () => callbacks.current.onMarkersRefresh?.(),
  }), [scrub, seek]);

  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      seekGeneration.current += 1;
      scrub.cancel();
      // Video releases its native player on unmount, including a replaced retry item.
    };
  }, [scrub]);

  useEffect(() => {
    let active = true;
    let reading = false;
    const update = async () => {
      if (reading || scrub.isDragging || failed) return;
      // ExoPlayer may omit onSeek when seeking to its existing position.
      // Allow a fresh native poll after the acknowledgement window in that case.
      if (pendingSeek.current && Date.now() < pendingSeek.current.deadline) return;
      pendingSeek.current = null;
      const generation = seekGeneration.current;
      reading = true;
      try {
        const position = await player.current?.getCurrentPosition();
        if (active && generation === seekGeneration.current && !scrub.isDragging && position !== undefined) {
          setSeconds(seekTime({ seconds: position }, durationRef.current));
        }
      } catch { /* Native item errors are reported by onError. */ }
      finally { reading = false; }
    };
    void update();
    const timer = setInterval(() => void update(), 250);
    return () => { active = false; clearInterval(timer); };
  }, [scrub, item.revision, failed]);

  const retry = async () => {
    if (retryPending.current) return;
    retryPending.current = true;
    setRetrying(true);
    try {
      const uri = await refreshURL(videoId);
      if (!live.current || !uri) return;
      scrub.cancel();
      setDragSeconds(null);
      seekGeneration.current += 1;
      pendingSeek.current = null;
      selection.close();
      durationRef.current = 0;
      setDuration(0);
      setSeconds(0);
      setItem(previous => ({ uri, revision: previous.revision + 1 }));
      setFailed(false);
      setPaused(false);
    } catch { /* Keep the same failure card, silently. */ }
    finally {
      retryPending.current = false;
      if (live.current) setRetrying(false);
    }
  };
  const displayed = dragSeconds ?? seconds;
  return <View style={styles.root}>
    <StatusBar style="light" />
    <Video key={item.revision} ref={player} source={{ uri: item.uri }}
      controls={false} paused={paused || failed} rate={rate} resizeMode="contain"
      playInBackground={false} playWhenInactive={false} progressUpdateInterval={250}
      style={StyleSheet.absoluteFill}
      onLoad={event => {
        durationRef.current = Number.isFinite(event.duration) ? Math.max(0, event.duration) : 0;
        setDuration(durationRef.current);
      }}
      onSeek={event => {
        if (pendingSeek.current !== null && Math.abs(event.seekTime - pendingSeek.current.seconds) < 0.3) pendingSeek.current = null;
      }}
      onEnd={() => { scrub.cancel(); setDragSeconds(null); pendingSeek.current = null; setSeconds(durationRef.current); setPaused(true); }}
      onError={() => { scrub.cancel(); setDragSeconds(null); setFailed(true); }}
    />
    <SafeAreaView style={styles.controls} pointerEvents={annotation ? 'none' : 'box-none'} accessibilityElementsHidden={Boolean(annotation)} importantForAccessibility={annotation ? 'no-hide-descendants' : 'auto'}>
      <View style={styles.chrome}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('chat.closePlayback')} onPress={() => { scrub.cancel(); player.current?.pause(); onClose(); }} style={styles.close}>
          <MaterialCommunityIcons name="close" size={20} color="white" />
        </Pressable>
        <Text style={styles.eyebrow}>{t('chat.videoPlayback')}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`${t('chat.playbackSpeed')} ${rateText(rate)}`}
          testID={`feedback.video.speed.${rateText(rate)}`} onPress={() => setRate(cycleRate)} style={styles.speed}>
          <Text style={styles.rate}>{rateText(rate)}</Text>
        </Pressable>
      </View>
      <View style={styles.center} pointerEvents="box-none">
        {failed ? <View style={[styles.failure, { backgroundColor: colors.surfaceCard, borderColor: colors.borderDefault }]}>
          <MaterialCommunityIcons name="alert" size={26} color={colors.gold500} />
          <Text style={[styles.failureText, { color: colors.textPrimary }]}>{t('chat.playbackFailed')}</Text>
          <Pressable accessibilityRole="button" disabled={retrying} accessibilityState={{ disabled: retrying }} onPress={() => void retry()}
            style={[styles.retry, { backgroundColor: colors.goldCTA }]}>
            <Text style={[styles.retryText, { color: colors.inkOnGold }]}>{t(retrying ? 'chat.refreshing' : 'chat.retry')}</Text>
          </Pressable>
        </View> : <Pressable accessibilityRole="button" testID="feedback.video.playbackToggle"
          accessibilityLabel={t(paused ? 'chat.playPlayback' : 'chat.pausePlayback')}
          onPress={() => {
            if (paused && duration > 0 && seconds >= duration) seek(0, true);
            setPaused(value => !value);
          }} style={styles.toggle}>
          <MaterialCommunityIcons name={paused ? 'play' : 'pause'} size={paused ? 22 : 20} color="white" />
        </Pressable>}
      </View>
      <FeedbackVideoMarkerPanel markers={markers} failed={markersFailed} seconds={displayed} duration={duration} select={marker => selection.select(marker)} />
      <FeedbackVideoScrubber seconds={displayed} duration={duration}
        begin={position => { scrub.begin(position, duration); setDragSeconds(scrub.displayedSeconds(seconds)); }}
        move={position => { scrub.move(position, duration); setDragSeconds(scrub.displayedSeconds(seconds)); }}
        finish={position => { scrub.finish(position, duration); setDragSeconds(null); }} />
    </SafeAreaView>
    {annotation ? <FeedbackVideoAnnotationOverlay key={annotation.generation}
      url={annotation.annotationURL!} close={() => selection.close()} loadFailed={() => selection.loadFailed(annotation)} /> : null}
  </View>;
}
const material = { backgroundColor: 'rgba(0,0,0,0.35)', borderColor: 'rgba(255,255,255,0.18)', borderWidth: 1 };
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'black' },
  controls: { flex: 1 },
  chrome: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.base, paddingTop: spacing.sm },
  close: { ...material, width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { ...font.mono(11, 'semibold'), color: 'rgba(255,255,255,0.85)', paddingLeft: spacing.xs, flex: 1 },
  speed: { ...material, height: 36, paddingHorizontal: spacing.md, borderRadius: radius.pill, justifyContent: 'center' },
  rate: { ...font.mono(14, 'semibold'), color: 'white' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  toggle: { width: spacing.point56, height: spacing.point56, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.14)', justifyContent: 'center', alignItems: 'center' },
  failure: { width: '100%', maxWidth: 280, padding: spacing.lg, borderWidth: 1, borderRadius: radius.lg, gap: spacing.base, alignItems: 'center' },
  failureText: { ...font.body(14), textAlign: 'center' },
  retry: { height: spacing.minimumHitTarget, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center', alignSelf: 'stretch' },
  retryText: { ...font.body(14, 'semibold') },
});
