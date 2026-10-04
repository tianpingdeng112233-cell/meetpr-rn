import { useRef, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { font, radius, spacing, useColors } from '@/design';
import { t } from '@/i18n';
import { trimSecondsAtTouch, type TrimDrag } from './trim-gesture';
import { type TrimSelection } from './trim-selection';

const timeText = (seconds: number) => {
  const rounded = Math.round(Math.max(0, seconds));
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`;
};

export function TrimTimeline({ selection, thumbnails, enabled, onMove }: {
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

