import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useColors } from '@/design';

import { zeroGhostGeometry } from './charts/growth-geometry';

export function GrowthZeroGhostChart() {
  const colors = useColors();
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Svg width={64} height={64} viewBox="0 0 64 64">
      <Circle {...zeroGhostGeometry.circle} fill="none" stroke={colors.borderHairline} strokeWidth={1.5} strokeDasharray={[3, 6]} />
      <Path d={zeroGhostGeometry.curve} fill="none" stroke={colors.borderStrong} strokeWidth={2.5} strokeLinecap="round" strokeDasharray={[1, 8]} />
      <Circle {...zeroGhostGeometry.point} fill={colors.gold500} />
    </Svg>
  </View>;
}
