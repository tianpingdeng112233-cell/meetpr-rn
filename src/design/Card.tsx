import { View, type ViewProps, type ViewStyle } from 'react-native';

import { useTheme } from './theme';
import { radius, type Colors, type Scheme } from './tokens';

export type CardElevation = 'card' | 'inset' | 'modal';
export type CardProps = ViewProps & { inset?: boolean; accent?: boolean; elevation?: CardElevation; fill?: string };

export function cardShadow(colors: Colors, scheme: Scheme, elevation: CardElevation = 'card'): ViewStyle {
  if (scheme !== 'light' || elevation === 'inset') return {};
  return {
    elevation: elevation === 'modal' ? 12 : 2,
    shadowColor: elevation === 'modal' ? colors.modalShadow : colors.cardShadow,
    shadowOpacity: 1,
    shadowRadius: elevation === 'modal' ? 30 : 9,
    shadowOffset: { width: 0, height: elevation === 'modal' ? 30 : 4 },
  };
}

export function Card({ inset = false, accent = false, elevation = 'card', fill, style, ...props }: CardProps) {
  const { colors, scheme } = useTheme();
  return <View {...props} style={[
    { paddingVertical: inset ? 10 : 14, paddingHorizontal: inset ? 12 : 16,
      backgroundColor: fill ?? (elevation === 'inset' ? colors.bgInset : elevation === 'modal' ? colors.surfaceElevated : colors.surfaceCard),
      borderRadius: elevation === 'inset' ? radius.chip : elevation === 'modal' ? radius.modal : radius.card },
    elevation !== 'card' && { borderWidth: 1, borderColor: elevation === 'inset' ? colors.surfaceKey : colors.borderDefault },
    cardShadow(colors, scheme, elevation),
    accent && { borderLeftWidth: 3, borderLeftColor: colors.gold500 }, style,
  ]} />;
}
