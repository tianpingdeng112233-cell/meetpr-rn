import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, Text, Vibration, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { font, useColors } from '@/design';
import { t } from '@/i18n';
import {
  HOLD_CANCEL_MS,
  HOLD_DURATION_MS,
  holdTransition,
  holdFeedback,
  type HoldState,
} from './hold-to-complete';

export function HoldToCompleteButton({
  onComplete,
  disabled = false,
  label,
}: {
  onComplete: () => void;
  disabled?: boolean;
  label?: string;
}) {
  const colors = useColors();
  const [progress] = useState(() => new Animated.Value(0));
  const [bounce] = useState(() => new Animated.Value(1));
  const [reduceMotion, setReduceMotion] = useState(false);
  const feedbackTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(value); });
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; listener.remove(); };
  }, []);
  const state = useRef<HoldState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [bounds, setBounds] = useState({ width: 0, height: 0 });
  const [holding, setHolding] = useState(false);
  const latest = useRef({ onComplete, disabled });
  useEffect(() => {
    latest.current = { onComplete, disabled };
  }, [onComplete, disabled]);
  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    feedbackTimers.current.forEach(clearTimeout);
    feedbackTimers.current = [];
  };
  const cancel = () => {
    if (state.current !== 'holding') return;
    state.current = holdTransition(state.current, 'cancel');
    clearTimer();
    setHolding(false);
    Vibration.vibrate([0, 20, 25, 20]);
    Animated.timing(progress, {
      toValue: 0,
      duration: HOLD_CANCEL_MS,
      useNativeDriver: false,
    }).start();
  };
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      feedbackTimers.current.forEach(clearTimeout);
      progress.stopAnimation();
      bounce.stopAnimation();
    },
    [progress, bounce],
  );
  useEffect(() => {
    if (disabled && state.current === 'holding') {
      state.current = 'cancelledUntilEnded';
      clearTimer();
      setHolding(false);
      Animated.timing(progress, {
        toValue: 0,
        duration: HOLD_CANCEL_MS,
        useNativeDriver: false,
      }).start();
    }
  }, [disabled, progress]);
  return (
    <Animated.View style={{ transform: [{ scale: bounce }] }}>
    <View
      accessible
      onStartShouldSetResponder={() => !latest.current.disabled}
      onResponderTerminationRequest={() => false}
      accessibilityRole="button"
      accessibilityLabel={label ?? t('student.todayWorkoutScreen.copy022')}
      accessibilityState={{ disabled }}
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={() => {
        if (!latest.current.disabled) latest.current.onComplete();
      }}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setBounds({ width, height });
      }}
      onResponderGrant={() => {
        if (state.current !== 'idle' || latest.current.disabled) return;
        state.current = holdTransition(state.current, 'begin');
        setHolding(true);
        Animated.timing(progress, {
          toValue: 1,
          duration: HOLD_DURATION_MS,
          useNativeDriver: false,
        }).start();
        feedbackTimers.current = Array.from({ length: 7 }, (_, index) => setTimeout(() => {
          if (state.current === 'holding' && !latest.current.disabled) Vibration.vibrate(holdFeedback(index + 1).pulseMs);
        }, HOLD_DURATION_MS * (index + 1) / 8));
        timer.current = setTimeout(() => {
          if (state.current !== 'holding' || latest.current.disabled) return;
          state.current = holdTransition(state.current, 'complete');
          setHolding(false);
          Vibration.vibrate([0, 15, 30, 25]);
          if (!reduceMotion) Animated.sequence([
            Animated.timing(bounce, { toValue: 1.04, duration: 100, useNativeDriver: true }),
            Animated.timing(bounce, { toValue: 1, duration: 100, useNativeDriver: true }),
          ]).start();
          latest.current.onComplete();
        }, HOLD_DURATION_MS);
        // Block Android's native ScrollView from intercepting an in-bounds hold.
        return true;
      }}
      onResponderMove={(event) => {
        const { locationX, locationY } = event.nativeEvent;
        if (
          locationX < 0 ||
          locationY < 0 ||
          locationX > bounds.width ||
          locationY > bounds.height
        )
          cancel();
      }}
      onResponderTerminate={() => {
        cancel();
        state.current = holdTransition(state.current, 'reset');
      }}
      onResponderRelease={() => {
        cancel();
        clearTimer();
        state.current = holdTransition(state.current, 'reset');
        setHolding(false);
        Animated.timing(progress, {
          toValue: 0,
          duration: HOLD_CANCEL_MS,
          useNativeDriver: false,
        }).start();
      }}
      style={{
        minHeight: 58,
        overflow: 'hidden',
        justifyContent: 'center',
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.gold500,
        backgroundColor: colors.holdTrack,
        opacity: disabled ? 0.35 : 1,
        transform: [{ scale: holding && !disabled && !reduceMotion ? 0.96 : 1 }],
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            width: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, bounds.width],
            }),
            overflow: 'hidden',
          },
        ]}
      >
        <Svg width={bounds.width} height={bounds.height}>
          <Defs>
            <LinearGradient id="hold" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={colors.goldGradientStart} />
              <Stop offset="1" stopColor={colors.gold400} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#hold)" />
        </Svg>
      </Animated.View>
      <View pointerEvents="none" style={{ paddingHorizontal: 16 }}>
        <Text
          style={{
            color: colors.inkOnCTAFill,
            ...font.body(16, 'bold'),
            textAlign: 'center',
          }}
        >
          {label ?? t('student.todayWorkoutScreen.copy021')}
        </Text>
      </View>
    </View>
    </Animated.View>
  );
}
