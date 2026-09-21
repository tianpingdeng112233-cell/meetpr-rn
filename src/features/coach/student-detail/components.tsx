import type { PropsWithChildren } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type TextProps } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { Ionicons } from '@expo/vector-icons';
import { Card, font, radius, useColors } from '@/design';
import { t } from '@/i18n';

export function Copy({ size = 14, tone = 'textPrimary', mono = false, bold = false, style, ...props }: TextProps & { size?: number; tone?: keyof ReturnType<typeof useColors>; mono?: boolean; bold?: boolean }) {
  const colors = useColors();
  return <Text {...props} style={[mono ? font.mono(size, bold ? 'bold' : 'regular') : font.body(size, bold ? 'semibold' : 'regular'), { color: colors[tone] }, style]} />;
}
export function Capsule({ label, onPress, disabled = false, hint, selected, testID }: { label: string; onPress?: () => void; disabled?: boolean; hint?: string; selected?: boolean; testID?: string }) {
  const colors = useColors();
  return <Pressable testID={testID} accessibilityRole={selected === undefined ? 'button' : 'tab'} accessibilityState={{ disabled, ...(selected === undefined ? {} : { selected }) }} accessibilityHint={hint} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: selected === undefined ? radius.pill : radius.chip, backgroundColor: selected ? colors.textPrimary : colors.surfaceCard, borderWidth: selected === undefined ? 1 : 0, borderColor: colors.borderStrong, opacity: disabled ? 0.35 : 1 }, pressed && { transform: [{ scale: 0.97 }] }]}>
    <Copy size={selected === undefined ? 12 : 13} bold tone={selected ? 'inkOnCTAFill' : 'textTertiary'}>{label}</Copy>
  </Pressable>;
}
export function Badge({ label, tone = 'gold500', filled = false }: { label: string; tone?: 'gold500' | 'success' | 'danger'; filled?: boolean }) {
  const colors = useColors();
  return <View style={{ borderRadius: radius.pill, borderColor: `${colors[tone]}59`, borderWidth: filled ? 0 : 1, paddingHorizontal: 9, paddingVertical: 4, backgroundColor: filled ? `${colors[tone]}1f` : 'transparent' }}><Copy size={11} bold tone={tone}>{label}</Copy></View>;
}
export function Loading() {
  const colors = useColors();
  return <View style={styles.empty}><ActivityIndicator color={colors.gold500} /><Copy mono size={12} tone="textTertiary">{t('coach.detail.loading')}</Copy></View>;
}
export function Empty({ title, subtitle, icon, danger = false }: { title: string; subtitle?: string; icon?: React.ComponentProps<typeof Ionicons>['name']; danger?: boolean }) {
  const colors = useColors();
  return <View style={styles.empty}>{icon && <Ionicons name={icon} size={26} color={danger ? colors.danger : colors.success} />}<Copy size={15} bold tone={danger ? 'danger' : 'textPrimary'} style={{ textAlign: 'center' }}>{title}</Copy>{subtitle && <Copy size={12} tone="textTertiary" style={{ textAlign: 'center' }}>{subtitle}</Copy>}</View>;
}
export function SectionCard({ children }: PropsWithChildren) { return <Card style={{ gap: 10 }}>{children}</Card>; }
export function Progress({ value, inverse = false }: { value: number; inverse?: boolean }) {
  const colors = useColors();
  return <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }} style={{ height: inverse ? 5 : 6, backgroundColor: inverse ? `${colors.inkOnCTAFill}24` : colors.borderDefault, borderRadius: radius.micro, overflow: 'hidden' }}><View style={{ width: `${Math.min(1, Math.max(0, value)) * 100}%`, height: '100%', backgroundColor: inverse ? colors.inkOnCTAFill : colors.success }} /></View>;
}
export const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 28, gap: 14, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32, gap: 10 },
  stack: { gap: 10 },
});
