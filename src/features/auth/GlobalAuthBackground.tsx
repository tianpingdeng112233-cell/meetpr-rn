import { useId } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useColors } from '@/design';

export function GlobalAuthBackground() {
  const colors = useColors();
  const { width, height } = useWindowDimensions();
  const gradientId = useId();
  return <View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill, { backgroundColor: colors.bgBase }]}>
    <Svg width="100%" height="100%" accessible={false}>
      <Defs>
        <RadialGradient id={gradientId} gradientUnits="userSpaceOnUse" cx={width / 2} cy={0} rx={width * 0.9} ry={height * 0.44}>
          <Stop offset={0} stopColor={colors.gold500} stopOpacity={0.08} />
          <Stop offset={0.7} stopColor={colors.gold500} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
    </Svg>
  </View>;
}
