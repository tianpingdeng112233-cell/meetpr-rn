import { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { font, spacing, useColors } from '@/design';
import { t } from '@/i18n';
import { timeText } from './time';

export function FeedbackVideoScrubber({ seconds, duration, begin, move, finish }: {
  seconds: number;
  duration: number;
  begin: (seconds: number) => void;
  move: (seconds: number) => void;
  finish: (seconds: number) => void;
}) {
  const colors = useColors();
  const width = useRef(0);
  const lastPosition = useRef(seconds);
  const position = (x: number) => {
    lastPosition.current = width.current > 0 ? Math.min(1, Math.max(0, x / width.current)) * duration : 0;
    return lastPosition.current;
  };
  const ratio = duration > 0 ? Math.min(1, Math.max(0, seconds / duration)) : 0;
  return <View style={styles.row}>
    <Text style={styles.time}>{timeText(seconds)}</Text>
    <View
      testID="feedback.video.scrubber"
      accessible accessibilityRole="adjustable"
      accessibilityLabel={t('chat.playbackProgress')}
      accessibilityValue={{ min: 0, max: Math.max(duration, 1), now: seconds, text: `${timeText(seconds)} / ${timeText(duration)}` }}
      accessibilityState={{ disabled: duration <= 0 }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={({ nativeEvent }) => {
        if (duration > 0) finish(seconds + (nativeEvent.actionName === 'increment' ? 5 : -5));
      }}
      style={styles.touchTrack}
      onLayout={event => { width.current = event.nativeEvent.layout.width; }}
      onStartShouldSetResponder={() => duration > 0}
      onMoveShouldSetResponder={() => duration > 0}
      onResponderGrant={event => begin(position(event.nativeEvent.locationX))}
      onResponderMove={event => move(position(event.nativeEvent.locationX))}
      onResponderRelease={event => finish(position(event.nativeEvent.locationX))}
      onResponderTerminate={() => finish(lastPosition.current)}
      onResponderTerminationRequest={() => false}
    >
      <View pointerEvents="none" style={[styles.track, { backgroundColor: colors.videoStageBorder }]}>
        <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: colors.gold500 }]} />
        <View style={[styles.thumb, { left: `${ratio * 100}%`, backgroundColor: colors.gold500 }]} />
      </View>
    </View>
    <Text style={styles.time}>{timeText(duration)}</Text>
  </View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.space2, paddingHorizontal: spacing.base, paddingVertical: spacing.sm, backgroundColor: 'rgba(0,0,0,0.35)' },
  time: { ...font.mono(11), color: 'rgba(255,255,255,0.82)' },
  touchTrack: { flex: 1, height: spacing.minimumHitTarget, justifyContent: 'center' },
  track: { height: spacing.xs, borderRadius: spacing.point2 },
  fill: { height: '100%', borderRadius: spacing.point2 },
  thumb: { position: 'absolute', height: spacing.md, width: spacing.md, borderRadius: spacing.sm, top: -spacing.xs, marginLeft: -spacing.point6 },
});
