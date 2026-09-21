import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing, StyleSheet, Vibration, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Card } from './Card';
import { GradientFill } from './GradientFill';
import { useColors } from './theme';
import { rewardTiming, rollUpFrames, sparkGeometry } from './training-reward-spec';

export function useReducedRewardMotion(): boolean | null {
  const [reduced, setReduced] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduced(value); });
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { active = false; listener.remove(); };
  }, []);
  return reduced;
}

/** Only the celebration screen uses staged entrances. Reduce Motion latches the final frame. */
export function RewardEntrance({ children, delay, slide = false, style }: { children: ReactNode; delay: number; slide?: boolean; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedRewardMotion();
  const [progress] = useState(() => new Animated.Value(0));
  const finished = useRef(false);
  useEffect(() => {
    if (reduced === null) return;
    if (reduced || finished.current) { finished.current = true; progress.setValue(1); return; }
    const animation = Animated.sequence([Animated.delay(delay), Animated.timing(progress, { toValue: 1, duration: slide ? 460 : 450, easing: Easing.out(Easing.cubic), useNativeDriver: true })]);
    animation.start(({ finished: done }) => { if (done) finished.current = true; });
    return () => animation.stop();
  }, [delay, progress, reduced, slide]);
  return <Animated.View style={[style, { opacity: reduced === true ? 1 : progress, transform: [{ translateY: reduced === true || !slide ? 0 : progress.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) }] }]}>{children}</Animated.View>;
}

/** The two reward-only shimmer surfaces; never used by an idle training CTA. */
export function RewardShimmer() {
  const colors = useColors();
  const reduced = useReducedRewardMotion();
  const [progress] = useState(() => new Animated.Value(0));
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => { const listener = AppState.addEventListener('change', state => setActive(state === 'active')); return () => listener.remove(); }, []);
  useEffect(() => {
    if (reduced !== false || !active) return;
    progress.setValue(0);
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(progress, { toValue: 1, duration: rewardTiming.shimmer * 0.3, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.delay(rewardTiming.shimmer * 0.7),
    ]));
    loop.start(); return () => loop.stop();
  }, [active, progress, reduced]);
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" onLayout={event => setWidth(event.nativeEvent.layout.width)} style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
    {reduced === false ? <Animated.View style={{ position: 'absolute', top: -30, bottom: -30, width: width * 0.55, transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-1.6 * width, 3.4 * width] }) }, { rotate: '-12deg' }] }}><GradientFill direction="horizontal" stops={[{ color: colors.gold200, offset: 0, opacity: 0 }, { color: colors.gold200, offset: 0.5, opacity: 0.42 }, { color: colors.gold200, offset: 1, opacity: 0 }]} /></Animated.View> : null}
  </View>;
}

export function RewardMedalMotion({ children }: { children: ReactNode }) {
  const colors = useColors();
  const reduced = useReducedRewardMotion();
  const [clock] = useState(() => new Animated.Value(0));
  const appeared = useRef(false);
  const stamped = useRef(false);
  const finished = useRef(false);
  const id = useId();
  useEffect(() => {
    if (!appeared.current) { appeared.current = true; Vibration.vibrate([0, 15, 30, 25]); }
    if (reduced === null) return;
    const stamp = () => { if (!stamped.current) { stamped.current = true; Vibration.vibrate(40); } };
    if (reduced || finished.current) { clock.setValue(1000); finished.current = true; stamp(); return; }
    const timer = setTimeout(stamp, rewardTiming.stamp);
    const animation = Animated.timing(clock, { toValue: 1000, duration: 1000, easing: Easing.linear, useNativeDriver: true, isInteraction: false });
    animation.start(({ finished: done }) => { if (done) finished.current = true; });
    return () => { clearTimeout(timer); animation.stop(); };
  }, [clock, reduced]);
  const bloomTimes = Array.from({ length: 21 }, (_, index) => index * rewardTiming.bloom / 20);
  return <View pointerEvents="none" accessible={false} style={{ width: 110, height: 110, alignItems: 'center', justifyContent: 'center' }}>
    {reduced === false ? <>
      <Animated.View style={{ position: 'absolute', width: 130, height: 130, opacity: clock.interpolate({ inputRange: [0, 150, 750], outputRange: [0, 0.9, 0], extrapolate: 'clamp' }), transform: [{ scale: clock.interpolate({ inputRange: bloomTimes, outputRange: bloomTimes.map(time => 0.2 + 8.5 * (1 - Math.pow(1 - time / 750, 3))), extrapolate: 'clamp' }) }] }}><Svg width={130} height={130}><Defs><RadialGradient id={id}><Stop offset={0} stopColor={colors.gold300} stopOpacity={0.55} /><Stop offset={0.55} stopColor={colors.gold500} stopOpacity={0.16} /><Stop offset={0.74} stopColor={colors.gold500} stopOpacity={0} /></RadialGradient></Defs><Circle cx={65} cy={65} r={65} fill={`url(#${id})`} /></Svg></Animated.View>
      {Array.from({ length: 18 }, (_, index) => {
        const spark = sparkGeometry(index);
        const times = Array.from({ length: 21 }, (_, i) => spark.delay + i * rewardTiming.spark / 20);
        const eased = times.map(time => 1 - Math.pow(1 - (time - spark.delay) / rewardTiming.spark, 3));
        return <Animated.View key={index} style={{ position: 'absolute', width: spark.size, height: spark.size, borderRadius: spark.size, backgroundColor: index % 3 === 0 ? colors.gold200 : colors.gold500, opacity: clock.interpolate({ inputRange: [Math.max(0, spark.delay - 0.01), spark.delay + 0.01, spark.delay + 560, spark.delay + 800], outputRange: [0, 1, 1, 0], extrapolate: 'clamp' }), transform: [{ translateX: clock.interpolate({ inputRange: times, outputRange: eased.map(value => Math.cos(spark.angle) * spark.radius * value), extrapolate: 'clamp' }) }, { translateY: clock.interpolate({ inputRange: times, outputRange: eased.map(value => Math.sin(spark.angle) * spark.radius * value), extrapolate: 'clamp' }) }, { scale: clock.interpolate({ inputRange: times, outputRange: eased.map(value => 1 - 0.8 * value), extrapolate: 'clamp' }) }] }} />;
      })}
    </> : null}
    <Animated.View style={{ opacity: reduced === true ? 1 : clock.interpolate({ inputRange: [0, 208], outputRange: [0, 1], extrapolate: 'clamp' }), transform: [{ scale: reduced === true ? 1 : clock.interpolate({ inputRange: [0, 286, 405.6, 520], outputRange: [1.5, 0.9, 1.05, 1], extrapolate: 'clamp' }) }] }}>{children}</Animated.View>
  </View>;
}

export function RollUpBody({ collapsed, children }: { collapsed: boolean; children: ReactNode }) {
  const reduced = useReducedRewardMotion();
  const [progress] = useState(() => new Animated.Value(collapsed ? 1 : 0));
  const previous = useRef(collapsed);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (reduced === null) return;
    if (reduced || !collapsed) { progress.stopAnimation(); progress.setValue(collapsed ? 1 : 0); previous.current = collapsed; return; }
    if (previous.current === collapsed) return;
    previous.current = collapsed;
    Vibration.vibrate([0, 6, 50, 8, 60, 12]);
    const animation = Animated.timing(progress, { toValue: 1, duration: rewardTiming.roll, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: false });
    animation.start(); return () => animation.stop();
  }, [collapsed, progress, reduced]);
  const effective = reduced === true ? collapsed ? 1 : 0 : progress;
  return <Animated.View pointerEvents={collapsed ? 'none' : 'auto'} accessibilityElementsHidden={collapsed} importantForAccessibility={collapsed ? 'no-hide-descendants' : 'auto'} style={{ overflow: 'hidden', height: height ? typeof effective === 'number' ? height * (1 - effective) : effective.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }) : collapsed ? 0 : undefined }}>
    <Animated.View onLayout={event => setHeight(event.nativeEvent.layout.height)} style={{ gap: 10, opacity: typeof effective === 'number' ? 1 - effective : effective.interpolate({ inputRange: rollUpFrames.progress, outputRange: rollUpFrames.opacity }), transformOrigin: 'top', transform: [{ perspective: 760 }, { rotateX: typeof effective === 'number' ? `${-78 * effective}deg` : effective.interpolate({ inputRange: rollUpFrames.progress, outputRange: rollUpFrames.rotation }) }, { scaleY: typeof effective === 'number' ? 1 - 0.94 * effective : effective.interpolate({ inputRange: rollUpFrames.progress, outputRange: rollUpFrames.scale }) }] }}>{children}</Animated.View>
  </Animated.View>;
}

/** Fold the table first, then compact the completed card without moving its title. */
export function RollUpCard({ collapsed, children }: { collapsed: boolean; children: ReactNode }) {
  const reduced = useReducedRewardMotion();
  const [progress] = useState(() => new Animated.Value(collapsed ? 1 : 0));
  useEffect(() => {
    if (reduced === null) return;
    if (reduced) { progress.setValue(collapsed ? 1 : 0); return; }
    const animation = Animated.sequence([Animated.delay(collapsed ? rewardTiming.roll : 0), Animated.timing(progress, { toValue: collapsed ? 1 : 0, duration: 280, easing: Easing.bezier(0.22, 0.61, 0.36, 1), useNativeDriver: false })]);
    animation.start(); return () => animation.stop();
  }, [collapsed, progress, reduced]);
  return <Animated.View style={{ alignSelf: 'center', width: reduced === true ? collapsed ? '92%' : '100%' : progress.interpolate({ inputRange: [0, 1], outputRange: ['100%', '92%'] }) }}><Card style={{ padding: 16, gap: 10, borderRadius: collapsed ? 14 : 16 }}>{children}</Card></Animated.View>;
}


/** Set-count ticker belongs to the celebration, and exposes its final value to assistive tech. */
export function useRewardCount(value: number): number {
  const reduced = useReducedRewardMotion();
  const [progress] = useState(() => new Animated.Value(0));
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (reduced === null) return;
    if (reduced) return;
    const listener = progress.addListener(({ value: fraction }) => setCount(Math.round(value * fraction)));
    const animation = Animated.sequence([Animated.delay(470), Animated.timing(progress, { toValue: 1, duration: 900, easing: Easing.out(Easing.poly(4)), useNativeDriver: false })]);
    animation.start(); return () => { animation.stop(); progress.removeListener(listener); };
  }, [progress, reduced, value]);
  return reduced ? value : count;
}
