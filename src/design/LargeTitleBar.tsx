import { Text, View, type ViewProps } from 'react-native';

import { Eyebrow } from './Eyebrow';
import { useColors } from './theme';
import { font, typography } from './tokens';

export function LargeTitleBar({ title, eyebrow, subtitle, style, ...props }: ViewProps & { title: string; eyebrow?: string; subtitle?: string }) {
  const colors = useColors();
  return <View {...props} style={[{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12, gap: 8 }, style]}>
    {eyebrow ? <Eyebrow label={eyebrow} /> : null}
    <Text style={{ ...font.display(34, 'black'), letterSpacing: -0.7, color: colors.textPrimary }}>{title}</Text>
    {subtitle ? <Text style={{ ...typography.footnote, color: colors.textSecondary }}>{subtitle}</Text> : null}
  </View>;
}
