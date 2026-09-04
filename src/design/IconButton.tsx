import type { ReactNode } from 'react';
import { Pressable, type PressableProps } from 'react-native';

import { useColors } from './theme';
import { radius } from './tokens';

export function IconButton({ icon, style, ...props }: Omit<PressableProps, 'children'> & { accessibilityLabel: string; icon: (props: { color: string; size: number }) => ReactNode }) {
  const colors = useColors();
  return <Pressable {...props} accessibilityRole="button" style={(state) => [
    { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.surfaceCard, alignItems: 'center', justifyContent: 'center' },
    state.pressed && !props.disabled && { opacity: 0.7 }, props.disabled && { opacity: 0.35 }, typeof style === 'function' ? style(state) : style,
  ]}>{icon({ color: colors.textPrimary, size: 18 })}</Pressable>;
}
