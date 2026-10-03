import { useEffect, useLayoutEffect, useReducer, useRef, useState, type ComponentProps } from 'react';
import { ActivityIndicator, AppState, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Video, { type VideoRef } from 'react-native-video';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { font, fontMetrics, radius, spacing, useColors } from '@/design';
import { t } from '@/i18n';
import type { VideoBadgeInfo } from '@/features/video-player/types';
import { timeText } from '@/features/video-player/time';
import { useSetVideoPlayerHost } from './SetVideoPlayerHost';
import { initialSetPlayback, setPlaybackRates, setPlaybackReducer } from './set-playback';

/** The host keeps the native surface mounted across inline/full-screen layout changes. */
export function SetVideoPlayer({ uri, refreshURL, badge }: { uri: string; refreshURL: () => Promise<string>; badge?: VideoBadgeInfo | null }) {
  const host = useSetVideoPlayerHost();
  const anchor = useRef<View>(null);
  const [inlineWidth, setInlineWidth] = useState(0);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [state, dispatch] = useReducer(setPlaybackReducer, initialSetPlayback);
  const player = useRef<VideoRef>(null);
  const [loaded, setLoaded] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const dragging = useRef(false);
  const trackWidth = useRef(0);
  const [controlsHeight, setControlsHeight] = useState(spacing.minimumHitTarget as number);
  const [inlineControlsHeight, setInlineControlsHeight] = useState(spacing.minimumHitTarget as number);
  const [ratesVisible, setRatesVisible] = useState(false);
  const [renewedSource, setRenewedSource] = useState<{ forURI: string; url: string } | null>(null);
  const source = renewedSource?.forURI === uri ? renewedSource.url : uri;
  const [failed, setFailed] = useState(false);
  const renewed = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    const subscription = AppState.addEventListener('change', value => { if (value !== 'active') dispatch({ type: 'pause' }); });
    return () => { alive.current = false; subscription.remove(); };
  }, []);
  async function retry() {
    dispatch({ type: 'reload' }); setFailed(false); setLoaded(false);
    try { const next = await refreshURL(); if (alive.current) { setRenewedSource({ forURI: uri, url: next }); setAttempt(value => value + 1); } }
    catch { if (alive.current) setFailed(true); }
  }
  const [attempt, setAttempt] = useState(0);
  function resize() {
    setRatesVisible(false);
    dispatch({ type: state.expanded ? 'back' : 'expand' });
  }
  function seek(position: number) {
    const next = Math.max(0, Math.min(state.duration, position));
    player.current?.seek(next);
    dispatch({ type: 'seek', position: next });
  }
  function scrub(x: number) {
    if (trackWidth.current > 0) seek(x / trackWidth.current * state.duration);
  }
  function togglePlayback() {
    if (state.position >= state.duration) seek(0);
    dispatch({ type: 'toggle' });
  }
  const controls = <View onLayout={event => {
    setControlsHeight(event.nativeEvent.layout.height);
    if (!state.expanded) setInlineControlsHeight(event.nativeEvent.layout.height);
  }} style={{ backgroundColor: colors.modalShadow, paddingHorizontal: spacing.xs, paddingBottom: state.expanded ? Math.max(insets.bottom, spacing.sm) : spacing.xs, flexDirection: 'row', alignItems: 'center' }}>
    <PlayerIconButton name={state.paused ? 'play' : 'pause'} label={t(state.paused ? 'chat.playVideo' : 'training.previewPause')} onPress={togglePlayback} disabled={!loaded || failed} />
    <View style={{ flex: 1, minWidth: 0 }}>
      <View accessibilityRole="adjustable" accessibilityLabel={t('training.previewProgress')} accessibilityValue={{ min: 0, max: state.duration, now: state.position }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={event => seek(state.position + (event.nativeEvent.actionName === 'increment' ? 5 : -5))}
        onLayout={event => { trackWidth.current = event.nativeEvent.layout.width; }}
        onStartShouldSetResponder={() => loaded && !failed} onMoveShouldSetResponder={() => loaded && !failed}
        onResponderGrant={event => { dragging.current = true; setScrubbing(true); scrub(event.nativeEvent.locationX); }}
        onResponderMove={event => scrub(event.nativeEvent.locationX)}
        onResponderRelease={event => { scrub(event.nativeEvent.locationX); dragging.current = false; setScrubbing(false); }}
        onResponderTerminate={() => { dragging.current = false; setScrubbing(false); }}
        onResponderTerminationRequest={() => false}
        style={{ height: spacing.minimumHitTarget, justifyContent: 'center' }}>
        <View pointerEvents="none" style={{ height: spacing.xs, borderRadius: radius.pill, backgroundColor: colors.videoStageBorder }}>
          <View style={{ width: `${state.duration ? state.position / state.duration * 100 : 0}%`, height: spacing.xs, borderRadius: radius.pill, backgroundColor: colors.gold500 }} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ ...font.mono(fontMetrics.size11), color: colors.inkOnCTAFill }}>{timeText(state.position)}</Text>
        <Text style={{ ...font.mono(fontMetrics.size11), color: colors.inkOnCTAFill }}>{timeText(state.duration)}</Text>
      </View>
    </View>
    <View>
      <Pressable accessibilityRole="button" accessibilityLabel={t('training.previewSpeed')} accessibilityState={{ expanded: ratesVisible }} onPress={() => setRatesVisible(value => !value)}
        style={{ minWidth: spacing.minimumHitTarget, minHeight: spacing.minimumHitTarget, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ ...font.body(fontMetrics.size13, 'semibold'), color: colors.inkOnCTAFill }}>{state.rate}×</Text>
      </Pressable>
    </View>
    <PlayerIconButton name={state.expanded ? 'fullscreen-exit' : 'fullscreen'} label={t(state.expanded ? 'training.previewCollapse' : 'training.previewExpand')} onPress={resize} />
  </View>;
  const inlineOverlay = Boolean(host) && !state.expanded;
  const centralPlayStyle = { width: spacing.point56, height: spacing.point56, borderRadius: radius.pill, backgroundColor: colors.modalShadow, alignItems: 'center', justifyContent: 'center' } as const;
  const centralPlayIcon = <MaterialCommunityIcons name="play" size={spacing.xl} color={colors.inkOnCTAFill} />;
  const surface = <View pointerEvents={inlineOverlay ? 'box-none' : 'auto'} style={state.expanded ? { flex: 1, backgroundColor: colors.chatImageBackground } : { backgroundColor: colors.videoWorkbenchFill, borderRadius: radius.card, overflow: 'hidden' }}>
    <View pointerEvents={inlineOverlay ? 'none' : 'auto'} style={state.expanded ? StyleSheet.absoluteFill : { width: '100%', aspectRatio: 16 / 9, minHeight: spacing.minimumHitTarget * setPlaybackRates.length + spacing.sm }}>
      {/* Keep the Android texture in the same view while its bounds/scroll transform change. */}
      <Video useTextureView key={attempt} ref={player} source={{ uri: source }} resizeMode="contain" controls={false} paused={state.paused || !loaded || state.restoring || scrubbing || failed} rate={state.rate}
        playInBackground={false} playWhenInactive={false} style={StyleSheet.absoluteFill}
        onLoadStart={() => { dispatch({ type: 'reload' }); setLoaded(false); setFailed(false); }}
        onLoad={({ duration }) => { dispatch({ type: 'loaded', duration }); if (state.position > 0) player.current?.seek(Math.min(state.position, duration)); setLoaded(true); }}
        onSeek={({ seekTime }) => dispatch({ type: 'seeked', position: seekTime })}
        onProgress={({ currentTime }) => { if (!dragging.current) dispatch({ type: 'progress', position: currentTime }); }}
        onEnd={() => dispatch({ type: 'ended' })}
        onError={() => { if (!renewed.current) { renewed.current = true; void retry(); } else setFailed(true); }} />
      {!loaded && !failed ? <ActivityIndicator style={StyleSheet.absoluteFill} color={colors.inkOnCTAFill} /> : null}
    </View>
    {failed ? <View pointerEvents={inlineOverlay ? 'box-none' : 'auto'} style={[StyleSheet.absoluteFill, { bottom: state.expanded ? 0 : inlineControlsHeight, alignItems: 'center', justifyContent: 'center', gap: spacing.sm }]}>
      <Text pointerEvents={inlineOverlay ? 'none' : 'auto'} style={{ ...font.body(fontMetrics.size13), color: colors.inkOnCTAFill }}>{t('student.videoAttachmentSection.copy004')}</Text>
      <PlayerIconButton name="refresh" label={t('student.videoAttachmentSection.copy002')} onPress={() => void retry()} />
    </View> : null}
    {state.expanded ? <>
      <View style={{ padding: spacing.base, paddingTop: insets.top + spacing.sm, backgroundColor: colors.modalShadow }}>
        <Text style={{ ...font.body(fontMetrics.size17, 'semibold'), color: colors.inkOnCTAFill }}>{badge?.exerciseName}</Text>
        <Text style={{ ...font.body(fontMetrics.size13), color: colors.inkOnCTAFill }}>{[
          badge?.setOrdinal != null ? t('chat.setPosition %@', [badge.setOrdinal]) : null,
          [badge?.weightKg != null ? `${badge.weightKg}kg` : null, badge?.reps != null ? `${badge.reps}` : null].filter(Boolean).join(' × '),
          badge?.rpe != null ? `${t('chat.rpeMetric')} ${badge.rpe}` : null,
        ].filter(Boolean).join(' · ')}</Text>
      </View>
      <View style={{ flex: 1 }} />
    </> : null}
    {controls}
    {state.expanded ? <StatusBar style="light" /> : null}
    {state.paused && loaded && !failed ? <View pointerEvents={inlineOverlay ? 'none' : 'box-none'} importantForAccessibility={inlineOverlay ? 'no-hide-descendants' : 'auto'} style={[StyleSheet.absoluteFill, { bottom: state.expanded ? 0 : inlineControlsHeight, alignItems: 'center', justifyContent: 'center' }]}>
      {inlineOverlay ? <View testID="set-video-central-play" style={centralPlayStyle}>{centralPlayIcon}</View> : <Pressable testID="set-video-central-play" accessibilityRole="button" accessibilityLabel={t('chat.playVideo')} onPress={togglePlayback}
        style={centralPlayStyle}>
        {centralPlayIcon}
      </Pressable>}
    </View> : null}
    {ratesVisible ? <View style={{ position: 'absolute', bottom: controlsHeight, right: spacing.minimumHitTarget + spacing.xs, padding: spacing.xs, borderRadius: radius.control, backgroundColor: colors.videoWorkbenchFill }}>
        {setPlaybackRates.map(rate => <Pressable key={rate} accessibilityRole="button" accessibilityState={{ selected: state.rate === rate }} accessibilityLabel={`${rate}×`}
          onPress={() => { dispatch({ type: 'rate', rate }); setRatesVisible(false); }}
          style={{ minHeight: spacing.minimumHitTarget, minWidth: spacing.point56, paddingHorizontal: spacing.sm, justifyContent: 'center', alignItems: 'center', borderRadius: radius.micro, backgroundColor: state.rate === rate ? colors.videoStageBorder : colors.videoWorkbenchFill }}>
          <Text style={{ ...font.body(fontMetrics.size14, 'semibold'), color: state.rate === rate ? colors.gold500 : colors.inkOnCTAFill }}>{rate}×</Text>
        </Pressable>)}
      </View> : null}
  </View>;
  useLayoutEffect(() => {
    host?.update({ node: surface, anchor, expanded: state.expanded, togglePlayback, collapse: () => {
      setRatesVisible(false);
      dispatch({ type: 'back' });
    } });
  });
  useLayoutEffect(() => () => host?.clear(), [host]);
  if (!host) return surface;
  return <View ref={anchor} collapsable={false} onLayout={event => {
    setInlineWidth(event.nativeEvent.layout.width);
    host.measure();
  }} style={{ height: Math.max(inlineWidth * 9 / 16, spacing.minimumHitTarget * setPlaybackRates.length + spacing.sm) + inlineControlsHeight }}>
    <Pressable testID="set-video-inline-picture" feedback="none" accessibilityRole="button" accessibilityLabel={t(state.paused ? 'chat.playVideo' : 'training.previewPause')}
      disabled={state.expanded || !loaded || failed} onPress={host.togglePlayback}
      style={[StyleSheet.absoluteFill, { bottom: inlineControlsHeight }]} />
  </View>;
}

function PlayerIconButton({ name, label, onPress, disabled = false }: { name: ComponentProps<typeof MaterialCommunityIcons>['name']; label: string; onPress: () => void; disabled?: boolean }) {
  const colors = useColors();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
    style={{ minWidth: spacing.minimumHitTarget, minHeight: spacing.minimumHitTarget, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.5 : 1 }}>
    <MaterialCommunityIcons name={name} size={spacing.lg} color={colors.inkOnCTAFill} />
  </Pressable>;
}
