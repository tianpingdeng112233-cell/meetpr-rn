import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { font, useColors } from '@/design';
import { t } from '@/i18n';
import {
  HOLD_CANCEL_MS,
  HOLD_DURATION_MS,
  holdTransition,
  type HoldState,
} from './hold-to-complete';

export function HoldToCompleteButton({
  onComplete,
  disabled = false,
}: {
  onComplete: () => void;
  disabled?: boolean;
}) {
  const colors = useColors();
  const [progress] = useState(() => new Animated.Value(0));
  const state = useRef<HoldState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bounds = useRef({ width: 0, height: 0 });
  const [holding, setHolding] = useState(false);
  const latest = useRef({ onComplete, disabled });
  useEffect(() => {
    latest.current = { onComplete, disabled };
  }, [onComplete, disabled]);
  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const cancel = () => {
    if (state.current !== 'holding') return;
    state.current = holdTransition(state.current, 'cancel');
    clearTimer();
    setHolding(false);
    Animated.timing(progress, {
      toValue: 0,
      duration: HOLD_CANCEL_MS,
      useNativeDriver: false,
    }).start();
  };
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      progress.stopAnimation();
    },
    [progress],
  );
  useEffect(() => {
    if (disabled && state.current === 'holding') {
      state.current = 'cancelledUntilEnded';
      if (timer.current) clearTimeout(timer.current);
      Animated.timing(progress, {
        toValue: 0,
        duration: HOLD_CANCEL_MS,
        useNativeDriver: false,
      }).start();
    }
  }, [disabled, progress]);
  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={t('student.todayWorkoutScreen.copy022')}
      accessibilityState={{ disabled }}
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={() => {
        if (!latest.current.disabled) latest.current.onComplete();
      }}
      onLayout={(event) => {
        bounds.current = event.nativeEvent.layout;
      }}
      onPressIn={() => {
        if (state.current !== 'idle' || latest.current.disabled) return;
        state.current = holdTransition(state.current, 'begin');
        setHolding(true);
        Animated.timing(progress, {
          toValue: 1,
          duration: HOLD_DURATION_MS,
          useNativeDriver: false,
        }).start();
        timer.current = setTimeout(() => {
          if (state.current !== 'holding' || latest.current.disabled) return;
          state.current = holdTransition(state.current, 'complete');
          setHolding(false);
          latest.current.onComplete();
        }, HOLD_DURATION_MS);
      }}
      onTouchMove={(event) => {
        const { locationX, locationY } = event.nativeEvent;
        if (
          locationX < 0 ||
          locationY < 0 ||
          locationX > bounds.current.width ||
          locationY > bounds.current.height
        )
          cancel();
      }}
      onPressOut={cancel}
      onTouchCancel={() => {
        cancel();
        state.current = holdTransition(state.current, 'reset');
      }}
      onTouchEnd={() => {
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
        transform: [{ scale: holding && !disabled ? 0.96 : 1 }],
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            width: progress.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      >
        <Svg width="100%" height="100%">
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
          {t('student.todayWorkoutScreen.copy021')}
        </Text>
      </View>
    </Pressable>
  );
}
