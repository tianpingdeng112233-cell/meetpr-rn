import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import type { ComponentProps, PropsWithChildren } from 'react';
import { font, radius, spacing, useColors } from '@/design';
export function Copy({ children, size = 14, tone = 'textPrimary', weight = 'regular', mono = false, display = false, style, lines }: PropsWithChildren<{ size?: number; tone?: keyof ReturnType<typeof useColors>; weight?: 'regular' | 'medium' | 'semibold' | 'bold'; mono?: boolean; display?: boolean; style?: StyleProp<TextStyle>; lines?: number }>) {
  const colors = useColors();
  return <Text numberOfLines={lines} style={[display ? font.display(size) : mono ? font.mono(size, weight) : font.body(size, weight), { color: colors[tone] }, style]}>{children}</Text>;
}
export function Icon({ name, tone = 'textTertiary', size = 20 }: { name: ComponentProps<typeof Ionicons>['name']; tone?: keyof ReturnType<typeof useColors>; size?: number }) {
  const colors = useColors();
  return <Ionicons name={name} color={colors[tone]} size={size} />;
}
export function Action({ label, onPress, filled = false, disabled = false, icon, style, testID }: { label: string; onPress(): void; filled?: boolean; disabled?: boolean; icon?: ComponentProps<typeof Ionicons>['name']; style?: StyleProp<ViewStyle>; testID?: string }) {
  const colors = useColors();
  return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [{ minHeight: spacing.minimumHitTarget, paddingHorizontal: spacing.space4, paddingVertical: spacing.point10, borderRadius: radius.pill, borderWidth: filled ? 0 : 1, borderColor: colors.borderStrong, backgroundColor: filled ? colors.textPrimary : undefined, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : 1 }, style, pressed && { transform: [{ scale: 0.97 }] }]}>
    {icon ? <Icon name={icon} /> : <Copy size={14} weight={filled ? 'bold' : 'semibold'} tone={filled ? 'inkOnCTAFill' : 'textTertiary'}>{label}</Copy>}
  </Pressable>;
}
export function EmptyState({ title, subtitle, done = false, search = false }: { title: string; subtitle?: string; done?: boolean; search?: boolean }) {
  const colors = useColors();
  return <View style={{ paddingVertical: spacing.point40, alignItems: 'center', gap: spacing.point10 }}>
    <View style={{ width: spacing.point52, height: spacing.point52, borderRadius: radius.pill, backgroundColor: colors.surfaceCard, alignItems: 'center', justifyContent: 'center' }}><Icon name={done ? 'checkmark' : search ? 'search' : 'person-add-outline'} tone={done ? 'success' : 'gold500'} size={24} /></View>
    <Copy size={15} weight="semibold">{title}</Copy>
    {subtitle ? <Copy size={12} tone="textDisabled" style={{ textAlign: 'center' }}>{subtitle}</Copy> : null}
  </View>;
}
export const pageContent = { paddingHorizontal: spacing.pageHorizontal, paddingTop: spacing.point6, paddingBottom: spacing.point28, gap: spacing.point14 } as const;
export const rowStyle = { flexDirection: 'row', alignItems: 'center' } as const;
