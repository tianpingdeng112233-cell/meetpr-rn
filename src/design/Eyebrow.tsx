import { Text, View, type ViewProps } from 'react-native';

import { useColors } from './theme';
import { font } from './tokens';

export function Eyebrow({ label, style, ...props }: ViewProps & { label: string }) {
  const colors = useColors();
  return <View testID="eyebrow" {...props} style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, style]}>
    <Text style={{ ...font.mono(11, 'bold'), letterSpacing: 0.8, color: colors.gold500 }}>{label.toUpperCase()}</Text>
    <View style={{ width: 32, height: 1, backgroundColor: colors.gold500 }} />
  </View>;
}
