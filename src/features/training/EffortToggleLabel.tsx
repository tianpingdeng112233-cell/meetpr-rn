import { Text } from 'react-native';
import { font, fontMetrics, radius, spacing, useColors } from '@/design';

export function EffortToggleLabel({ label, compact = false }: { label: string; compact?: boolean }) {
  const colors = useColors();
  return <Text numberOfLines={1} style={{ alignSelf: 'center', ...font.mono(fontMetrics.size11, 'semibold'), color: colors.textPrimary, paddingHorizontal: compact ? 0 : spacing.xs, paddingVertical: spacing.point3, borderRadius: radius.micro, borderWidth: spacing.point1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceRaised }}>{label}</Text>;
}
