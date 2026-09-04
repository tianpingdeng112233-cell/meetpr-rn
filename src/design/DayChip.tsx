import { Pressable, Text, View, type PressableProps } from 'react-native';

import { cardShadow } from './Card';
import { useTheme } from './theme';
import { font, radius } from './tokens';

export type DayChipProps = Omit<PressableProps, 'children'> & { weekday: string; date: string | number; selected?: boolean; variant?: 'filled' | 'outlined'; status?: 'done' | 'missed' | 'today' };
export function DayChip({ weekday, date, selected = false, variant = 'filled', status, style, ...props }: DayChipProps) {
  const { colors, scheme } = useTheme();
  const color = selected && variant === 'filled' ? colors.inkOnCTAFill : colors.textPrimary;
  return <Pressable {...props} accessibilityRole="button" accessibilityState={{ ...props.accessibilityState, selected }} style={(state) => [
    { width: 52, height: 44, borderRadius: radius.control, alignItems: 'center', justifyContent: 'center', gap: 2,
      backgroundColor: selected ? variant === 'filled' ? colors.ctaFill : colors.surfaceElevated : colors.surfaceCard },
    selected ? { borderWidth: 1.5, borderColor: colors.gold500 } : cardShadow(colors, scheme),
    state.pressed && { opacity: 0.7 }, typeof style === 'function' ? style(state) : style,
  ]}>
    <Text style={{ fontSize: 10, fontWeight: '500', color }}>{weekday}</Text>
    <Text style={{ ...font.mono(13, 'bold'), color }}>{date}</Text>
    {status ? <View style={{ position: 'absolute', right: 5, top: 5, width: 5, height: 5, borderRadius: radius.pill, backgroundColor: { done: colors.success, missed: colors.danger, today: colors.gold500 }[status] }} /> : null}
  </Pressable>;
}
