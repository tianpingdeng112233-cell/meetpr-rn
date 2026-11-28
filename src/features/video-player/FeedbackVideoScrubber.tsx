import { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { font, spacing, useColors } from '@/design';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { t } from '@/i18n';
import { VideoBadgePalette as palette } from './badge-palette';
import { timeText } from './time';
import type { FeedbackVideoMarker } from './types';

export function FeedbackVideoScrubber({ layout = 'fullScreen', seconds, duration, scale, markers = [], select, begin, move, finish }: {
  layout?: 'fullScreen' | 'workbench';
  seconds: number;
  duration: number;
  scale?: number;
  markers?: readonly FeedbackVideoMarker[];
  select?: (marker: FeedbackVideoMarker) => void;
  begin: (seconds: number) => void;
  move: (seconds: number) => void;
  finish: (seconds: number) => void;
}) {
  const colors = useColors();
  const width = useRef(0);
  const lastPosition = useRef(seconds);
  const pendingTap = useRef<number | null>(null);
  const position = (x: number) => {
    lastPosition.current = width.current > 0 ? Math.min(1, Math.max(0, x / width.current)) * duration : 0;
    return lastPosition.current;
  };
  const fraction = (time: number) => duration > 0 ? Math.min(1, Math.max(0, time / duration)) : 0;
  const nearestMarker = (x: number) => {
    let nearest: FeedbackVideoMarker | null = null;
    let distance = spacing.minimumHitTarget / 2;
    for (const marker of markers) {
      const dx = Math.abs(fraction(marker.timeMs / 1000) * width.current - x);
      if (dx <= distance) { nearest = marker; distance = dx; }
    }
    return nearest;
  };
  const ratio = fraction(seconds);
  const workbench = layout === 'workbench';
  const timeStyle = [styles.time, workbench && { color: `${colors.inkOnCTAFill}B3` }, scale ? font.mono(17 * scale) : null];
  const trackHeight = scale ? 6 * scale : spacing.xs;
  const thumbSize = scale ? 24 * scale : spacing.md;
  return <View style={[styles.row, workbench && { paddingHorizontal: 0, paddingVertical: 0, backgroundColor: `${colors.inkOnCTAFill}00` },
    scale ? { paddingHorizontal: 26 * scale, paddingVertical: 0, gap: 14 * scale, backgroundColor: 'transparent' } : null]}>
    <Text style={timeStyle}>{timeText(seconds)}</Text>
    <View style={styles.touchTrack}>
      <View pointerEvents="none" style={[styles.track, { height: trackHeight, backgroundColor: scale ? 'rgba(255,255,255,0.30)' : workbench ? `${colors.inkOnCTAFill}33` : colors.videoStageBorder }]}>
        <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: scale ? palette.amber : workbench ? colors.inkOnCTAFill : colors.gold500 }]} />
      </View>
      {duration > 0 && scale && select ? markers.map(marker => <Pressable key={marker.id} feedback="none"
        testID={`feedback.video.marker.tick.${marker.id}`} accessibilityRole="button"
        accessibilityLabel={`${marker.annotationURL ? '✏️ ' : ''}${t('chat.seekToVideoMarker', [timeText(marker.timeMs / 1000)])}`}
        onPress={() => select(marker)} style={[styles.tickButton, { left: `${fraction(marker.timeMs / 1000) * 100}%` }]}>
        <View style={{ width: 5 * scale, height: 22 * scale, borderRadius: 3 * scale, backgroundColor: palette.gold }} />
      </Pressable>) : null}
      <View pointerEvents="none" style={{ position: 'absolute', left: `${ratio * 100}%`, top: '50%', marginTop: -thumbSize / 2, marginLeft: -thumbSize / 2,
        height: thumbSize, width: thumbSize, borderRadius: thumbSize / 2, backgroundColor: scale ? 'white' : workbench ? colors.inkOnCTAFill : colors.gold500 }} />
      {/* One touch surface resolves overlapping ticks by distance and keeps dragging continuous.
          The individual tick buttons remain separately actionable with TalkBack. */}
      <View testID="feedback.video.scrubber" style={StyleSheet.absoluteFill}
        accessible accessibilityRole="adjustable" accessibilityLabel={t('chat.playbackProgress')}
        accessibilityValue={{ min: 0, max: Math.max(duration, 1), now: seconds, text: `${timeText(seconds)} / ${timeText(duration)}` }}
        accessibilityState={{ disabled: duration <= 0 }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={({ nativeEvent }) => {
          if (duration > 0) finish(seconds + (nativeEvent.actionName === 'increment' ? 5 : -5));
        }}
        onLayout={event => { width.current = event.nativeEvent.layout.width; }}
        onStartShouldSetResponder={() => duration > 0} onMoveShouldSetResponder={() => duration > 0}
        onResponderGrant={({ nativeEvent: { locationX } }) => {
          pendingTap.current = select && nearestMarker(locationX) ? locationX : null;
          if (pendingTap.current === null) begin(position(locationX));
        }}
        onResponderMove={({ nativeEvent: { locationX } }) => {
          if (pendingTap.current !== null) {
            if (Math.abs(locationX - pendingTap.current) <= 4) return;
            begin(position(pendingTap.current));
            pendingTap.current = null;
          }
          move(position(locationX));
        }}
        onResponderRelease={({ nativeEvent: { locationX } }) => {
          const marker = pendingTap.current !== null && Math.abs(locationX - pendingTap.current) <= 4 ? nearestMarker(locationX) : null;
          pendingTap.current = null;
          if (marker && select) select(marker);
          else finish(position(locationX));
        }}
        onResponderTerminate={() => {
          if (pendingTap.current === null) finish(lastPosition.current);
          pendingTap.current = null;
        }}
        onResponderTerminationRequest={() => false}
      />
    </View>
    <Text style={timeStyle}>{timeText(duration)}</Text>
  </View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.space2, paddingHorizontal: spacing.base, paddingVertical: spacing.sm, backgroundColor: 'rgba(0,0,0,0.35)' },
  time: { ...font.mono(11), color: 'rgba(255,255,255,0.82)' },
  touchTrack: { flex: 1, height: spacing.minimumHitTarget, justifyContent: 'center' },
  track: { borderRadius: spacing.point2 },
  fill: { height: '100%', borderRadius: spacing.point2 },
  tickButton: { position: 'absolute', width: 44, height: 44, marginLeft: -22, alignItems: 'center', justifyContent: 'center' },
});
