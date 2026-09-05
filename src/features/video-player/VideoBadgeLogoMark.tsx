import Svg, { Circle, Path } from 'react-native-svg';
import { VideoBadgePalette as palette } from './badge-palette';

export function VideoBadgeLogoMark({ size }: { size: number }) {
  return <Svg width={size} height={size} viewBox="0 0 100 100" accessible={false}>
    <Circle cx={50} cy={50} r={39} fill={palette.amber} />
    <Path d="M 22.8108 37.3215 A 30 30 0 0 1 60.3098 21.8272" fill="none" stroke={palette.ink} strokeWidth={2.6} strokeLinecap="round" />
    <Path d="M 31 60 L 45 60 L 64 39" fill="none" stroke={palette.ink} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M 46 60 L 62 60" stroke={palette.ink} strokeOpacity={0.42} strokeWidth={6.4} strokeLinecap="round" />
    <Circle cx={66} cy={37} r={6.4} fill={palette.ink} />
  </Svg>;
}
