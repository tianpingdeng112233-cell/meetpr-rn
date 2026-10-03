import type { ReactNode } from 'react';
import { Text, View, type AccessibilityProps, type StyleProp, type ViewStyle } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import Svg, { Path } from 'react-native-svg';

import { useColors } from './theme';
import { font } from './tokens';

export type ListRowProps = AccessibilityProps & {
  title: string; subtitle?: string; accessory?: ReactNode;
  icon?: (props: { color: string; size: number }) => ReactNode;
  chevron?: boolean; disabled?: boolean; onPress?: () => void; style?: StyleProp<ViewStyle>;
};

export function ListRow({ accessory, icon, chevron = false, disabled = false, onPress, style, subtitle, title, ...accessibilityProps }: ListRowProps) {
  const colors = useColors();
  const root: ViewStyle = { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 52, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surfaceCard };
  const content = <>
    <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
      {icon ? icon({ color: colors.gold500, size: 20 }) : <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: colors.borderStrong }} />}
    </View>
    <View style={{ flex: 1, gap: 4 }}>
      <Text numberOfLines={1} style={{ ...font.body(14, 'semibold'), color: colors.textPrimary }}>{title}</Text>
      {subtitle ? <Text style={{ ...font.body(12), color: colors.textTertiary }}>{subtitle}</Text> : null}
    </View>
    {accessory ? <View style={{ flexShrink: 0 }}>{accessory}</View> : null}
    {chevron ? <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M9 6L15 12 9 18" stroke={colors.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg> : null}
  </>;
  return onPress ? <Pressable {...accessibilityProps} accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [root, pressed && !disabled && { backgroundColor: colors.bgInset }, style]}>{content}</Pressable> : <View {...accessibilityProps} style={[root, style]}>{content}</View>;
}
