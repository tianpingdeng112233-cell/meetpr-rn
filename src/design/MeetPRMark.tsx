import Svg, { Text as SvgText } from 'react-native-svg';

import { useColors } from './theme';
import { font } from './tokens';

type MeetPRMarkProps = {
  testID?: string;
  fontSize?: number;
  strokeColor?: string;
  fillColor?: string;
  accessibilityLabel?: string;
};

/** Canonical header wordmark, scaled proportionally from the 16pt, 97×24 slot. */
export function MeetPRMark({ testID, fontSize = 16, strokeColor, fillColor, accessibilityLabel }: MeetPRMarkProps) {
  const colors = useColors();
  const scale = fontSize / 16;
  const stroke = strokeColor ?? colors.textPrimary;
  const textProps = {
    x: 3, y: 18,
    fontFamily: font.display(16, 'black').fontFamily,
    fontSize: 16, fontWeight: '900' as const, letterSpacing: 0,
  };
  return <Svg testID={testID} width={97 * scale} height={24 * scale} viewBox="0 0 97 24"
    accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel}>
    <SvgText {...textProps} stroke={stroke} strokeWidth={5.12} strokeLinejoin="round" fill={stroke}>
      MEETPR
    </SvgText>
    <SvgText {...textProps} fill={fillColor ?? colors.bgBase}>
      MEETPR
    </SvgText>
  </Svg>;
}
