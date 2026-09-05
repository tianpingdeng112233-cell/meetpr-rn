import Svg, { Text as SvgText, TSpan } from 'react-native-svg';
import { font, useColors } from '@/design';

/** Pinned 16pt stroked wordmark, in the dashboard's 97×24 header slot. */
export function MeetPRMark() {
  const colors = useColors();
  return (
    <Svg width={97} height={24} viewBox="0 0 97 24" accessible={false}>
      <SvgText
        x={3}
        y={18}
        fontFamily={font.display(16, 'black').fontFamily}
        fontSize={16}
        fontWeight="900"
        letterSpacing={-1.76}
        stroke={colors.textPrimary}
        strokeWidth={5.12}
        strokeLinejoin="round"
        fill={colors.textPrimary}
      >
        MEETP<TSpan dx={-2.08}>R</TSpan>
      </SvgText>
      <SvgText
        x={3}
        y={18}
        fontFamily={font.display(16, 'black').fontFamily}
        fontSize={16}
        fontWeight="900"
        letterSpacing={-1.76}
        fill={colors.bgBase}
      >
        MEETP<TSpan dx={-2.08}>R</TSpan>
      </SvgText>
    </Svg>
  );
}
