import { forwardRef } from 'react';
import { Pressable, StyleSheet, Vibration, type PressableProps, type View } from 'react-native';
import { useReducedMotion } from './useReducedMotion';

type Props = PressableProps & {
  /** Backdrops, gesture surfaces and chart hit targets carry no button visuals. */
  feedback?: 'standard' | 'none';
  /** Navigation is silent. Classify action controls explicitly at their shared component. */
  haptic?: 'light' | 'warning' | 'selection' | 'none';
};
export const FeedbackPressable = forwardRef<View, Props>(function FeedbackPressable({ children, style, disabled, onPress, feedback = 'standard', haptic, ...props }, ref) {
  const reduced = useReducedMotion();
  return <Pressable {...props} ref={ref} disabled={disabled} onPress={event => {
    if (disabled) return;
    if (haptic && haptic !== 'none') Vibration.vibrate(haptic === 'warning' ? [0, 20, 25, 20] : haptic === 'selection' ? 5 : 10);
    onPress?.(event);
  }} style={state => {
    const resolved = typeof style === 'function' ? style(state) : style;
    if (feedback === 'none') return resolved;
    // Preserve the unpressed geometry, replacing former per-screen press scales.
    const idle = StyleSheet.flatten(typeof style === 'function' ? style({ ...state, pressed: false }) : style);
    return [resolved, disabled ? { opacity: 0.35 } : state.pressed ? {
      opacity: 0.85,
      transform: [...(Array.isArray(idle?.transform) ? idle.transform : []), ...(!reduced ? [{ scale: 0.97 }] : [])],
    } : null];
  }}>{children}</Pressable>;
});
