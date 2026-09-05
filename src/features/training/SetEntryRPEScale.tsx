import { useCallback, useMemo, useRef, useState } from 'react';
import { PanResponder, Text, View, type GestureResponderEvent, type PanResponderGestureState } from 'react-native';

import { font, radius, spacing, useColors } from '@/design';
import { t } from '@/i18n';
import { formatWeight, rirCopy } from './policy';
import { barHeight, centerX, commitsOnRelease, index, isLit, lockedIntent, snap, valueAtX, type ScrubIntent } from './set-entry-rpe';

export function SetEntryRPEScale({ value, placeholder, onChange }: {
  value: number;
  placeholder?: string;
  onChange: (value: number) => void;
}) {
  const colors = useColors();
  const [width, setWidth] = useState(0);
  const [bubbleWidth, setBubbleWidth] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const selected = snap(value);
  const gestureIntent = useRef<ScrubIntent>('idle');
  const startX = useRef(0);
  const grant = useCallback((event: GestureResponderEvent) => {
    gestureIntent.current = 'idle';
    startX.current = event.nativeEvent.locationX;
  }, []);
  const move = useCallback((_: GestureResponderEvent, gesture: PanResponderGestureState) => {
    gestureIntent.current = lockedIntent(gestureIntent.current, gesture.dx, gesture.dy);
    if (gestureIntent.current === 'scrub') {
      setScrubbing(true);
      onChange(valueAtX(startX.current + gesture.dx, width, 3));
    }
  }, [onChange, width]);
  const release = useCallback((_: GestureResponderEvent, gesture: PanResponderGestureState) => {
    if (commitsOnRelease(gestureIntent.current)) {
      // Reject a vertical final frame even if native scrolling took the other moves.
      const finalIntent = lockedIntent(gestureIntent.current, gesture.dx, gesture.dy);
      if (finalIntent !== 'scroll') onChange(valueAtX(startX.current + gesture.dx, width, 3));
    }
    setScrubbing(false);
  }, [onChange, width]);
  const allowTermination = useCallback(() => gestureIntent.current !== 'scrub', []);
  const pan = useMemo(() => {
    // PanResponder.create only stores callbacks; native events own all ref reads/writes.
    // eslint-disable-next-line react-hooks/refs
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => false,
      // Android's native ScrollView must be allowed to take a vertical drag.
      onShouldBlockNativeResponder: () => false,
      onPanResponderGrant: grant,
      onPanResponderMove: move,
      onPanResponderRelease: release,
      onPanResponderTerminationRequest: allowTermination,
      onPanResponderTerminate: () => setScrubbing(false),
    });
  }, [grant, move, release, allowTermination]);

  return (
    <View accessible accessibilityRole="adjustable" accessibilityLabel={t('chat.rpeMetric')}
      accessibilityValue={{ min: 5, max: 10, now: selected, text: placeholder ?? `${formatWeight(selected)} · ${rirCopy(selected)}` }}
      accessibilityHint={t('student.setEntryRpescale.copy001')}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={event => {
        if (event.nativeEvent.actionName === 'increment') onChange(snap(selected + 0.5));
        if (event.nativeEvent.actionName === 'decrement') onChange(snap(selected - 0.5));
      }}
      style={{ backgroundColor: colors.surfaceCard, borderRadius: radius.card, paddingHorizontal: 14, paddingVertical: 13, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.space2 }}>
        <Text style={{ ...font.mono(32, 'bold'), color: placeholder ? colors.textGhost : colors.textPrimary }}>
          {placeholder ? t('coach.videoFeedback.missingValue') : formatWeight(selected)}
        </Text>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}
          style={{ ...font.body(13, 'medium'), color: colors.textMuted, flex: 1, textAlign: 'right', opacity: scrubbing ? 0 : 1 }}>
          {placeholder ?? rirCopy(selected)}
        </Text>
      </View>
      <View {...pan.panHandlers} onLayout={event => setWidth(event.nativeEvent.layout.width)}
        style={{ height: 48, flexDirection: 'row', gap: 3 }}>
        {Array.from({ length: 11 }, (_, i) => {
          const tick = 5 + i * 0.5;
          const active = tick === selected;
          return (
            <View key={tick} pointerEvents="none" style={{ flex: 1, alignItems: 'center', alignSelf: 'flex-end' }}>
              <View style={{ height: 32, justifyContent: 'flex-end' }}>
                <View style={{ width: 6, height: barHeight(tick, selected), borderRadius: 3,
                  backgroundColor: active ? colors.gold500 : isLit(tick, selected) ? colors.rpeLit : colors.rpeUnlit }} />
              </View>
              <Text style={{ height: 14, marginTop: 6, ...font.mono(12, 'semibold'),
                color: active || (Number.isInteger(tick) && Math.abs(tick - selected) < 0.3) ? colors.textPrimary : colors.rpeTickLabel }}>
                {Number.isInteger(tick) ? tick : ''}
              </Text>
            </View>
          );
        })}
        {scrubbing ? (
          <View pointerEvents="none" onLayout={event => setBubbleWidth(event.nativeEvent.layout.width)}
            style={{ position: 'absolute', top: -36, left: Math.max(0, Math.min(width - bubbleWidth, centerX(index(selected), width, 3) - bubbleWidth / 2)),
              maxWidth: width || undefined, flexDirection: 'row', alignItems: 'baseline', gap: 8,
              backgroundColor: colors.gold500, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 }}>
            <Text style={{ ...font.mono(18, 'bold'), color: colors.inkOnGold }}>{formatWeight(selected)}</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit style={{ ...font.body(12, 'medium'), flexShrink: 1, color: colors.inkOnGold }}>{rirCopy(selected)}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
