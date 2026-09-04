import { Text, View, type ViewProps } from 'react-native';

import { useColors } from './theme';
import { font, radius } from './tokens';

export function StatusBadge({ label, tone = 'neutral', style, ...props }: ViewProps & { label: string; tone?: 'gold' | 'success' | 'danger' | 'neutral' }) {
  const colors = useColors();
  const [color, backgroundColor] = { gold: [colors.gold500, colors.goldSoft], success: [colors.success, colors.successTint], danger: [colors.danger, colors.dangerSoft], neutral: [colors.textTertiary, colors.surfaceElevated] }[tone];
  const borderColor = `rgba(${parseInt(color.slice(1, 3), 16)},${parseInt(color.slice(3, 5), 16)},${parseInt(color.slice(5, 7), 16)},0.32)`;
  return <View {...props} style={[{ alignSelf: 'flex-start', backgroundColor, borderColor, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 4 }, style]}>
    <Text style={{ ...font.mono(11, 'bold'), letterSpacing: 0.72, color }}>{label.toUpperCase()}</Text>
  </View>;
}
