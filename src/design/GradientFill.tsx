import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

/** Decorative fill; the containing view owns clipping and geometry. */
export function GradientFill({
  stops,
  direction = 'horizontal',
}: {
  stops: readonly { color: string; offset: number; opacity?: number }[];
  direction?: 'horizontal' | 'vertical' | 'diagonal';
}) {
  const id = `fill-${useId().replace(/:/g, '')}`;
  return (
    <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient
            id={id}
            x1="0%"
            y1="0%"
            x2={direction === 'vertical' ? '0%' : '100%'}
            y2={direction === 'horizontal' ? '0%' : '100%'}
          >
            {stops.map(({ color, offset, opacity }) => (
              <Stop key={offset} offset={offset} stopColor={color} stopOpacity={opacity ?? 1} />
            ))}
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
