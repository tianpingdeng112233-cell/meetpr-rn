import Svg, { Text as SvgText } from 'react-native-svg';
import { font, useColors } from '@/design';

/** iOS-reference header wordmark; keep the 97×24 slot and natural glyph spacing. */
export function MeetPRMark({ testID }: { testID?: string }) {
  const colors = useColors();
  return (
    <Svg testID={testID} width={97} height={24} viewBox="0 0 97 24" accessible={false}>
      <SvgText
        x={3}
        y={18}
        fontFamily={font.display(16, 'black').fontFamily}
        fontSize={16}
        fontWeight="900"
        letterSpacing={0}
        stroke={colors.textPrimary}
        strokeWidth={5.12}
        strokeLinejoin="round"
        fill={colors.textPrimary}
      >
        MEETPR
      </SvgText>
      <SvgText
        x={3}
        y={18}
        fontFamily={font.display(16, 'black').fontFamily}
        fontSize={16}
        fontWeight="900"
        letterSpacing={0}
        fill={colors.bgBase}
      >
        MEETPR
      </SvgText>
    </Svg>
  );
}
