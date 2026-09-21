import type { ReactNode } from 'react';
import { type PressableProps } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';

import { useColors } from './theme';
import { radius } from './tokens';

export function IconButton({ icon, style, ...props }: Omit<PressableProps, 'children'> & { haptic?: 'light' | 'none'; accessibilityLabel: string; icon: (props: { color: string; size: number }) => ReactNode }) {
  const colors = useColors();
  return <Pressable haptic="light" {...props} accessibilityRole="button" style={(state) => [
    { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.surfaceCard, alignItems: 'center', justifyContent: 'center' },
    state.pressed && !props.disabled && { opacity: 0.85, transform: [{ scale: 0.97 }] }, props.disabled && { opacity: 0.35 }, typeof style === 'function' ? style(state) : style,
  ]}>{icon({ color: colors.textPrimary, size: 18 })}</Pressable>;
}
