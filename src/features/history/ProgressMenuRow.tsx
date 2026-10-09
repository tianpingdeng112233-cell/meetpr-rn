import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { Text, View } from 'react-native';
import { Card, font, radius, spacing, useColors } from '@/design';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';

export function ProgressMenuRow({ title, value, emphasized, icon, onPress }: {
  title: string;
  value: string;
  emphasized?: boolean;
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  onPress: () => void;
}) {
  const colors = useColors();
  return <Pressable accessibilityRole="button" accessibilityLabel={!value || value === '—' ? title : `${title}, ${value}`} onPress={onPress}>
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.space3, padding: spacing.space4, minHeight: spacing.minimumHitTarget + spacing.space6, elevation: 0, shadowOpacity: 0 }}>
      <View style={{ width: spacing.point40, height: spacing.point40, borderRadius: radius.control, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' }}>
        <MaterialCommunityIcons name={icon} size={20} color={colors.gold500} />
      </View>
      <Text style={{ flexShrink: 0, ...font.body(15, 'bold'), color: colors.textPrimary }}>{title}</Text>
      <Text style={{ flex: 1, flexShrink: 1, textAlign: 'right', ...font.mono(13, emphasized ? 'semibold' : 'regular'), color: emphasized ? colors.goldText : colors.textMuted }}>{value}</Text>
      <MaterialCommunityIcons name="chevron-right" size={14} color={colors.textDim} />
    </Card>
  </Pressable>;
}
