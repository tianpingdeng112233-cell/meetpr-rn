import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import Video, { type VideoRef } from 'react-native-video';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { font, radius, spacing, useColors } from '@/design';
import { t } from '@/i18n';
import { FeedbackVideoAnnotationSelection, type AnnotationFrame } from './annotation-select';
import { FeedbackVideoAnnotationOverlay } from './FeedbackVideoAnnotationOverlay';
import { FeedbackVideoMarkerCue } from './FeedbackVideoMarkerCue';
import { markerAtTime } from './marker-window';
import { presentBadge } from './badge-presentation';
import { cueGapUnits, cueLineUnits, cuePaddingUnits, cuePreviewLines, videoBadgeLayout } from './video-badge-layout';
import { FeedbackVideoFailureCard, FeedbackVideoWorkbenchPlayer } from './FeedbackVideoWorkbenchPlayer';
import { FeedbackVideoScrubber } from './FeedbackVideoScrubber';
import { VideoBadgeOverlay } from './VideoBadgeOverlay';
import { cycleRate, rateText } from './rate';
import { FeedbackVideoScrubState } from './scrub-state';
import { seekTime } from './time';
import type { FeedbackVideoMarker, VideoBadgeInfo } from './types';

export type FeedbackVideoPlayerProps = {
  layout?: 'fullScreen' | 'workbench';
  videoId: string;
  url: string;
  markers?: FeedbackVideoMarker[] | null;
  markersFailed?: boolean;
  badge?: VideoBadgeInfo | null;
  allowsExpansion?: boolean;
  onProgress?: (seconds: number) => void;
  onSeek?: (milliseconds: number) => void;
  refreshURL: (videoId: string) => Promise<string>;
  onMarkersRefresh?: () => void | Promise<void>;
  selectedAnnotationMarker?: FeedbackVideoMarker | null;
  onAnnotationClose?: () => void;
  onAddMarker?: () => void;
  onClose?: () => void;
};

/** Shared playback session with full-screen and embedded coach surfaces. */
export function FeedbackVideoPlayer(props: FeedbackVideoPlayerProps) {
  // Identity changes start a fresh session, including the non-persistent rate.
  return <PlayerSession key={`${props.videoId}:${props.url}`} {...props} />;
}

function PlayerSession({ layout = 'fullScreen', videoId, url, markers = null, markersFailed = false, badge = null, allowsExpansion = true, onProgress, onSeek, refreshURL, onMarkersRefresh, onAddMarker, selectedAnnotationMarker, onAnnotationClose, onClose }: FeedbackVideoPlayerProps) {
  const colors = useColors();
  const player = useRef<VideoRef>(null);
  const live = useRef(true);
  const callbacks = useRef({ onSeek, onMarkersRefresh, onProgress });
  useEffect(() => { callbacks.current = { onSeek, onMarkersRefresh, onProgress }; }, [onSeek, onMarkersRefresh, onProgress]);
  const durationRef = useRef(0);
  const seekGeneration = useRef(0);
  const pendingSeek = useRef<{ seconds: number; deadline: number } | null>(null);
  const [item, setItem] = useState({ uri: url, revision: 0 });
  const windowBounds = useWindowDimensions();
  const [bounds, setBounds] = useState<{ width: number; height: number } | null>(null);
  const [tallestCueUnits, setTallestCueUnits] = useState(0);
  const [selectedCueID, setSelectedCueID] = useState<string | null>(null);
  const [badgeExpanded, setBadgeExpanded] = useState(true);
  const [rate, setRate] = useState(1);
  const selectedRate = useRef(rate);
  useEffect(() => { selectedRate.current = rate; }, [rate]);
  const [workbenchRate, setWorkbenchRate] = useState(1);
  const [paused, setPaused] = useState(layout === 'workbench');
  const [duration, setDuration] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [dragSeconds, setDragSeconds] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const retryPending = useRef(false);
  const [annotation, setAnnotation] = useState<AnnotationFrame | null>(null);
  const activeAnnotation = useRef(annotation);
  useEffect(() => { activeAnnotation.current = annotation; }, [annotation]);
  const seek = useCallback((position: number, commitsPosition: boolean) => {
    const target = seekTime({ seconds: position }, durationRef.current);
    seekGeneration.current += 1;
    pendingSeek.current = { seconds: target, deadline: Date.now() + 1000 };
    player.current?.seek(target, 0.05);
    callbacks.current.onSeek?.(Math.round(target * 1000));
    if (commitsPosition) { setSeconds(target); callbacks.current.onProgress?.(target); }
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

  const externalSelection = useRef(selectedAnnotationMarker);
  const selectedID = useRef<string | null>(null);
  useEffect(() => {
    externalSelection.current = selectedAnnotationMarker;
    const id = selectedAnnotationMarker?.id ?? null;
    if (selectedID.current === id) return;
    selectedID.current = id;
    if (selectedAnnotationMarker) selection.select(selectedAnnotationMarker);
    else selection.close();
  }, [selectedAnnotationMarker, selection]);
  const closeAnnotation = () => { selection.close(); onAnnotationClose?.(); };

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
    // Android can leave a position promise pending before its native view exists.
    // Wait for onLoad so that one early read cannot stall all subsequent polls.
    if (duration <= 0) return;
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
          const current = seekTime({ seconds: position }, durationRef.current);
          setSeconds(current);
          callbacks.current.onProgress?.(current);
        }
      } catch { /* Native item errors are reported by onError. */ }
      finally { reading = false; }
    };
    void update();
    const timer = setInterval(() => void update(), 250);
    return () => { active = false; clearInterval(timer); };
  }, [scrub, item.revision, failed, duration]);

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
      closeAnnotation();
      durationRef.current = 0;
      setDuration(0);
      setSeconds(0);
      callbacks.current.onProgress?.(0);
      setItem(previous => ({ uri, revision: previous.revision + 1 }));
      setFailed(false);
      setWorkbenchRate(selectedRate.current);
      setPaused(false);
    } catch { /* Keep the same failure card, silently. */ }
    finally {
      retryPending.current = false;
      if (live.current) setRetrying(false);
    }
  };
  const displayed = dragSeconds ?? seconds;
  const video = <Video key={item.revision} ref={player} source={{ uri: item.uri }}
      controls={false} paused={paused || failed} rate={layout === 'workbench' ? workbenchRate : rate} resizeMode="contain"
      playInBackground={false} playWhenInactive={false} progressUpdateInterval={250}
      style={StyleSheet.absoluteFill} pointerEvents={layout === 'workbench' ? 'none' : undefined}
      onLoad={event => {
        durationRef.current = Number.isFinite(event.duration) ? Math.max(0, event.duration) : 0;
        setDuration(durationRef.current);
      }}
      onSeek={event => {
        if (pendingSeek.current !== null && Math.abs(event.seekTime - pendingSeek.current.seconds) < 0.3) pendingSeek.current = null;
      }}
      onEnd={() => { scrub.cancel(); setDragSeconds(null); pendingSeek.current = null; setSeconds(durationRef.current); callbacks.current.onProgress?.(durationRef.current); setPaused(true); }}
      onError={() => { scrub.cancel(); setDragSeconds(null); setFailed(true); }}
    />;
  const playbackControl = failed ? <FeedbackVideoFailureCard retrying={retrying} retry={() => void retry()} workbench={layout === 'workbench'} /> : <Pressable accessibilityRole="button" testID="feedback.video.playbackToggle"
          accessibilityLabel={t(paused ? 'chat.playPlayback' : 'chat.pausePlayback')}
          onPress={() => {
            if (paused && duration > 0 && seconds >= duration) seek(0, true);
            if (paused) setWorkbenchRate(rate);
            setPaused(value => !value);
          }} style={[styles.toggle, { backgroundColor: `${colors.inkOnCTAFill}24` }]}>
          <MaterialCommunityIcons name={paused ? 'play' : 'pause'} size={paused ? 22 : 20} color={colors.inkOnCTAFill} />
        </Pressable>;
  const { width, height } = bounds ?? windowBounds;
  const geometry = videoBadgeLayout(width, height, 'playback', windowBounds.fontScale);
  const hasBadge = badge && presentBadge(badge, 'playback') !== null;
  const decorated = layout === 'fullScreen' && (hasBadge || markers?.length || markersFailed);
  const s = geometry.scale;
  // Preserve the prototype's rail position until a wrapped cue needs the lower margin.
  // Remember the largest measured cue so shorter comments don't bounce the rail back.
  const cueLineHeight = cueLineUnits * windowBounds.fontScale * s;
  const cuePadding = 2 * cuePaddingUnits * s;
  const cueHeight = Math.min(cuePadding + cuePreviewLines * cueLineHeight, Math.max(tallestCueUnits * s, cuePadding + cueLineHeight));
  const cueTopFromBottom = geometry.bottom - cueGapUnits * s;
  const trackPadding = Math.max(0, Math.min(72 * s - spacing.minimumHitTarget / 2,
    cueTopFromBottom - cueHeight - spacing.minimumHitTarget));
  const selectMarker = (marker: FeedbackVideoMarker) => {
    setSelectedCueID(marker.id);
    selection.select(marker);
  };
  const scrubber = <FeedbackVideoScrubber layout={layout} seconds={displayed} duration={duration}
        scale={decorated ? s : undefined} markers={decorated && !markersFailed ? markers ?? [] : undefined}
        select={decorated ? selectMarker : undefined}
        begin={position => { scrub.begin(position, duration); setDragSeconds(scrub.displayedSeconds(seconds)); }}
        move={position => { scrub.move(position, duration); setDragSeconds(scrub.displayedSeconds(seconds)); }}
        finish={position => { scrub.finish(position, duration); setDragSeconds(null); }} />;
  const annotationMarker = selectedAnnotationMarker === undefined ? annotation : selectedAnnotationMarker;
  const annotationOverlay = annotationMarker?.annotationURL ? <FeedbackVideoAnnotationOverlay
    key={`${annotation?.generation ?? 0}:${annotationMarker.annotationURL}`}
    url={annotationMarker.annotationURL} close={closeAnnotation} loadFailed={() => {
      // A refreshed signed URL may outlive the old Image's queued failure event.
      if (selectedAnnotationMarker !== undefined && externalSelection.current !== selectedAnnotationMarker) return;
      if (!live.current || !annotation || activeAnnotation.current !== annotation) return;
      selection.loadFailed(annotation);
      onAnnotationClose?.();
    }} /> : null;
  if (layout === 'workbench') return <FeedbackVideoWorkbenchPlayer video={video} playbackControl={playbackControl}
    annotation={annotationOverlay} scrubber={scrubber} rate={rate} selectRate={option => {
      setRate(option);
      // Playing and waiting/buffering both apply immediately; paused stores the next default.
      if (!paused && !failed) setWorkbenchRate(option);
    }} badge={badge} onAddMarker={onAddMarker} />;
  const cueMarker = annotation ?? markerAtTime(markers ?? [], displayed * 1000);
  if (selectedCueID !== null && selectedCueID !== cueMarker?.id) setSelectedCueID(null);
  const cueSelected = cueMarker !== null && cueMarker.id === selectedCueID;
  const openCueAboveTrack = cueSelected && (!!annotationOverlay || !hasBadge);
  const cue = <FeedbackVideoMarkerCue marker={cueMarker} selected={cueSelected}
    select={selectMarker} failed={markersFailed} retry={onMarkersRefresh} scale={s}
    anchor={openCueAboveTrack ? { bottom: trackPadding + spacing.minimumHitTarget } : { top: '100%', marginTop: -cueTopFromBottom }}
    maxTextHeight={openCueAboveTrack ? Math.max(cuePreviewLines * cueLineHeight, height - cueTopFromBottom - 80) : cuePreviewLines * cueLineHeight}
    onHeight={height => { if (!openCueAboveTrack && s > 0) setTallestCueUnits(previous => Math.max(previous, height / s)); }} />;
  return <View style={styles.root} onLayout={({ nativeEvent: { layout: { width, height } } }) => {
    if (width > 0 && height > 0) setBounds({ width, height });
  }}>
    <StatusBar style="light" />
    {video}
    <SafeAreaView style={styles.controls} pointerEvents={annotation ? 'none' : 'box-none'} accessibilityElementsHidden={Boolean(annotation)} importantForAccessibility={annotation ? 'no-hide-descendants' : 'auto'}>
      <View style={styles.controls} pointerEvents="box-none">
        <View style={styles.chrome}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('chat.closePlayback')} onPress={() => { scrub.cancel(); player.current?.pause(); onClose?.(); }} style={styles.close}>
            <MaterialCommunityIcons name="close" size={20} color="white" />
          </Pressable>
          <Text style={styles.eyebrow}>{t('chat.videoPlayback')}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`${t('chat.playbackSpeed')} ${rateText(rate)}`}
            testID={`feedback.video.speed.${rateText(rate)}`} onPress={() => setRate(cycleRate)} style={styles.speed}>
            <Text style={styles.rate}>{rateText(rate)}</Text>
          </Pressable>
        </View>
        <View style={[styles.center, hasBadge ? StyleSheet.absoluteFill : null]} pointerEvents="box-none">
          {playbackControl}
        </View>
        {hasBadge ? <VideoBadgeOverlay geometry={geometry}
            allowsExpansion={allowsExpansion} info={badge} expanded={badgeExpanded} onToggle={() => setBadgeExpanded(value => !value)} /> : null}
        <View pointerEvents="box-none" style={[hasBadge && styles.footer, decorated ? { paddingBottom: trackPadding } : null]}>{scrubber}</View>
        {!annotationOverlay ? cue : null}
      </View>
    </SafeAreaView>
    {annotationOverlay}
    {annotationOverlay ? <SafeAreaView pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View pointerEvents="box-none" style={styles.controls}>{cue}</View>
    </SafeAreaView> : null}
  </View>;
}
const material = { backgroundColor: 'rgba(0,0,0,0.35)', borderColor: 'rgba(255,255,255,0.18)', borderWidth: 1 };
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'black' },
  controls: { flex: 1 },
  footer: { marginTop: 'auto' },
  chrome: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.base, paddingTop: spacing.sm },
  close: { ...material, width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { ...font.mono(11, 'semibold'), color: 'rgba(255,255,255,0.85)', paddingLeft: spacing.xs, flex: 1 },
  speed: { ...material, height: 36, paddingHorizontal: spacing.md, borderRadius: radius.pill, justifyContent: 'center' },
  rate: { ...font.mono(14, 'semibold'), color: 'white' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  toggle: { width: spacing.point56, height: spacing.point56, borderRadius: radius.pill, justifyContent: 'center', alignItems: 'center' },
});
