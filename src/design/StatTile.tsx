import { Text, View, type ViewProps } from 'react-native';

import { Card } from './Card';
import { useColors } from './theme';
import { font } from './tokens';

export type StatTileProps = ViewProps & { label: string; value: string | number; unit?: string; delta?: string; accent?: 'neutral' | 'gold' | 'success' | 'danger' };
export function StatTile({ label, value, unit, delta, accent = 'neutral', ...props }: StatTileProps) {
  const colors = useColors();
  const color = { neutral: colors.textPrimary, gold: colors.gold500, success: colors.success, danger: colors.danger }[accent];
  return <Card {...props}>
    <Text style={{ ...font.mono(11), letterSpacing: 0.66, color: colors.textMuted }}>{label}</Text>
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
      <Text style={{ ...font.mono(28, 'bold'), color }}>{value}</Text>
      {unit ? <Text style={{ ...font.body(12, 'medium'), color: colors.textMuted }}>{unit}</Text> : null}
    </View>
    {delta ? <Text style={{ ...font.mono(12, 'bold'), color: delta.startsWith('-') ? colors.danger : delta.startsWith('+') ? colors.success : colors.textMuted }}>{delta}</Text> : null}
  </Card>;
}
