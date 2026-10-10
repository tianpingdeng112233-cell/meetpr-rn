import { useLayoutEffect, useRef, useState } from 'react';
import { Animated, LayoutAnimation, View } from 'react-native';
import { GradientFill, motion, radius, spacing, useColors } from '@/design';
import { useReducedMotion } from '@/design/useReducedMotion';
import { setProgressSegments, type SetProgressSegment } from './exercise-progress';
import type { WorkoutSetDraft } from './model';

function Segment({ state }: { state: SetProgressSegment }) {
  const colors = useColors();
  const [size, setSize] = useState({ width: 0, height: 0 });
  return <View style={{ flex: state === 'current' ? 1.5 : 1, height: spacing.point6, borderRadius: radius.micro,
    backgroundColor: state === 'complete' ? colors.gold500 : state === 'failed' ? colors.textDisabled : colors.borderStrong,
    ...(state === 'current' ? { outlineColor: colors.goldSoft, outlineWidth: spacing.point2, outlineStyle: 'solid' as const } : {}),
  }}>
    {state === 'current' ? <View onLayout={({ nativeEvent: { layout } }) => setSize(current => current.width === layout.width && current.height === layout.height ? current : { width: layout.width, height: layout.height })}
      style={{ flex: 1, borderRadius: radius.micro, overflow: 'hidden' }}>
      {size.width > 0 ? <GradientFill key={`${size.width}:${size.height}`} size={size} stops={[{ color: colors.goldGradientStart, offset: 0 }, { color: colors.goldGradientEnd, offset: 1 }]} /> : null}
    </View> : null}
  </View>;
}

export function SetProgressBar({ drafts }: { drafts: readonly WorkoutSetDraft[] }) {
  const segments = setProgressSegments(drafts);
  const key = segments.join('|');
  const previous = useRef(key);
  const reduced = useReducedMotion();
  const [opacity] = useState(() => new Animated.Value(1));
  useLayoutEffect(() => {
    const changed = previous.current !== key;
    previous.current = key;
    if (reduced || !changed) { opacity.setValue(1); return; }
    LayoutAnimation.configureNext({ duration: motion.fast, update: { type: LayoutAnimation.Types.easeInEaseOut } });
    opacity.setValue(0.6);
    const animation = Animated.timing(opacity, { toValue: 1, duration: motion.fast, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [key, opacity, reduced]);
  return <Animated.View testID="set-progress" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none"
    style={{ flexDirection: 'row', gap: spacing.point5, opacity }}>
    {segments.map((state, index) => <Segment key={drafts[index].stableSetId} state={state} />)}
  </Animated.View>;
}
