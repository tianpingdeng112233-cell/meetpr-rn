import Svg, { Text, TSpan } from 'react-native-svg';

import { useColors } from './theme';
import { font } from './tokens';

export function MeetPRMark({ fontSize = 15 }: { fontSize?: number }) {
  const colors = useColors();
  const height = fontSize / 0.34;
  const textProps = {
    x: fontSize * 0.16, y: height / 2 + fontSize * 0.35,
    fontFamily: font.display(fontSize, 'black').fontFamily,
    fontSize, fontWeight: '900' as const, letterSpacing: -fontSize * 0.11,
  };
  return <Svg width={height * 2.05} height={height} accessible={false} accessibilityElementsHidden>
    <Text {...textProps} stroke={colors.textPrimary} strokeWidth={fontSize * 0.32} strokeLinejoin="round" fill={colors.textPrimary}>
      MEETP<TSpan dx={-fontSize * 0.13}>R</TSpan>
    </Text>
    <Text {...textProps} fill={colors.bgBase}>
      MEETP<TSpan dx={-fontSize * 0.13}>R</TSpan>
    </Text>
  </Svg>;
}
