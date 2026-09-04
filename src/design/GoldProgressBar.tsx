import { useId } from 'react';
import { View, type ViewProps } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useColors } from './theme';
import { radius } from './tokens';

/** Progress is a fraction in [0, 1]. */
export function GoldProgressBar({ progress, style, ...props }: ViewProps & { progress: number }) {
  const colors = useColors();
  const id = `gold-${useId().replace(/:/g, '')}`;
  const value = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  return <View {...props} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }} style={[{ height: 4, borderRadius: radius.pill, backgroundColor: colors.bgStack, overflow: 'hidden' }, style]}>
    <Svg width={`${value * 100}%`} height="100%">
      <Defs><LinearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%"><Stop offset="0" stopColor={colors.goldGradientStart} /><Stop offset="1" stopColor={colors.goldGradientEnd} /></LinearGradient></Defs>
      <Rect width="100%" height="100%" rx={2} fill={`url(#${id})`} />
    </Svg>
  </View>;
}
