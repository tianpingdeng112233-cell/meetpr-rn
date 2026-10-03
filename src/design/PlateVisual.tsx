import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { t } from '@/i18n';
import { useColors } from './theme';
import { plateGradients, plateMetal } from './tokens';
import { breakdownText, plateBreakdown, seDimensions } from './plate-visual';

export function PlateVisual({ totalKg, hasCollar, height = 148 }: {
  totalKg: number;
  hasCollar: boolean;
  height?: number;
}) {
  const colors = useColors();
  const id = useId().replace(/:/g, '');
  const fill = (name: keyof typeof plateGradients) => `url(#${id}-${name})`;
  const plates = plateBreakdown(totalKg, hasCollar);
  const laidOut = plates.reduce<{ kg: number; x: number; width: number; height: number }[]>((items, kg) => {
    const last = items.at(-1);
    items.push({ kg, x: last ? last.x + last.width + 1.5 : 71, ...seDimensions(kg) });
    return items;
  }, []);
  const last = laidOut.at(-1);
  const plateEnd = last ? last.x + last.width : 71;
  const collarX = plateEnd + 2;
  const sleeveX = hasCollar ? collarX + 26 : plateEnd;
  const width = sleeveX + 92;
  const label = plates.length
    ? hasCollar ? t('designSystem.plate.withCollars %@', [breakdownText(plates)]) : breakdownText(plates)
    : t(hasCollar ? 'designSystem.plate.competitionCollarsOnly' : 'designSystem.plate.emptyBar');

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label}
      style={{ height, width: '100%', alignItems: 'center', justifyContent: 'center', direction: 'ltr' }}>
      <Svg accessible={false} width={width} height={148} viewBox={`0 0 ${width} 148`}
        style={{ transform: [{ scale: height / 148 }] }}>
        <Defs>
          {Object.entries(plateGradients).map(([name, gradient]) => {
            const stops = gradient.colors.map((color, i) => (
              <Stop key={i} offset={gradient.locations[i]}
                stopColor={color === 'bgBase' || color === 'surfaceCard' || color === 'textPrimary' ? colors[color] : color} />
            ));
            return name === 'collarKnob'
              ? <RadialGradient key={name} id={`${id}-${name}`} cx="35%" cy="30%" r="62.5%">{stops}</RadialGradient>
              : <LinearGradient key={name} id={`${id}-${name}`} x1="0%" y1="0%"
                  x2={name === 'collarLever' ? '100%' : '0%'} y2={name === 'collarLever' ? '0%' : '100%'}>{stops}</LinearGradient>;
          })}
          <ClipPath id={`${id}-nut`}><Rect x={12} y={4} width={14} height={27} rx={2} /></ClipPath>
        </Defs>
        <Path d="M58 69.5 H5 Q0 69.5 0 74 Q0 78.5 5 78.5 H58 Z" fill={fill('barShaft')} />
        <Rect x={58} y={55.5} width={11} height={37} rx={3} fill={fill('barShoulder')} />
        <Line x1={58.5} x2={58.5} y1={58.5} y2={89.5} stroke={plateMetal.steelLightEdge} strokeWidth={1} />
        <Line x1={68.5} x2={68.5} y1={58.5} y2={89.5} stroke={plateMetal.steelDarkEdge} strokeWidth={1} />
        {laidOut.map((plate, i) => (
          <G key={i} transform={`translate(${plate.x} ${(148 - plate.height) / 2})`}>
            <Rect width={plate.width} height={plate.height} rx={2} fill={fill(`plate${plate.kg}` as keyof typeof plateGradients)} />
            <Line x1={0.5} x2={0.5} y1={2} y2={plate.height - 2} stroke={plateMetal.plateHighlight} strokeWidth={1} />
            <Line x1={plate.width - 0.75} x2={plate.width - 0.75} y1={2} y2={plate.height - 2} stroke={plateMetal.plateShade} strokeWidth={1.5} />
          </G>
        ))}
        <Path d={`M${sleeveX} 65.5 H${width - 2} Q${width} 65.5 ${width} 67.5 V80.5 Q${width} 82.5 ${width - 2} 82.5 H${sleeveX} Z`} fill={fill('barSleeve')} />
        {hasCollar ? (
          <G transform={`translate(${collarX} 56.5)`}>
            <Path d="M2.75 0 H8.25 L11 4.9 V30.1 L8.25 35 H2.75 L0 30.1 V4.9 Z" fill={fill('collarBody')} />
            <Rect x={12} y={4} width={14} height={27} rx={2} fill={fill('collarNut')} />
            <G clipPath={`url(#${id}-nut)`}>
              {Array.from({ length: 7 }, (_, i) => (
                <G key={i}>
                  <Rect x={12 + i * 2} y={4} width={1} height={27} fill={plateMetal.knurlDark} />
                  <Rect x={13 + i * 2} y={4} width={1} height={27} fill={plateMetal.knurlLight} />
                </G>
              ))}
            </G>
            <G transform="translate(8 17) rotate(-34 1.5 0)">
              <Rect width={3} height={27} rx={1.5} fill={fill('collarLever')} />
              <Circle cx={1.5} cy={26} r={4} fill={fill('collarKnob')} />
            </G>
          </G>
        ) : null}
      </Svg>
    </View>
  );
}
