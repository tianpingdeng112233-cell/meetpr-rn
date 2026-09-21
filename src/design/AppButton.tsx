import { ActivityIndicator, StyleSheet, Text, View, type PressableProps, type PressableStateCallbackType, type StyleProp, type ViewStyle } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import Svg, { Path } from 'react-native-svg';

import { useColors } from './theme';
import { font, radius } from './tokens';

export type AppButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  haptic?: 'none' | 'light' | 'warning';
  label: string;
  sub?: string;
  icon?: 'none' | 'play' | 'logout';
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
  variant?: 'primary' | 'secondary' | 'danger' | 'link';
};

export function AppButton({ disabled = false, label, sub, icon = 'none', loading = false, fullWidth = true, style, variant = 'primary', accessibilityState, onPress, haptic, ...props }: AppButtonProps) {
  const colors = useColors();
  const blocked = disabled || loading;
  const foreground = { primary: colors.ctaText, secondary: colors.textSecondary, danger: colors.dangerMuted, link: colors.textMuted }[variant];
  const labelFont = variant === 'danger' ? font.body(14, 'semibold') : variant === 'link' ? font.body(13, 'medium') : { ...font.display(16), letterSpacing: 0.16 };
  return (
    <Pressable
      {...props}
      haptic={haptic ?? (variant === 'link' ? undefined : variant === 'danger' ? 'warning' : 'light')}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel ?? label}
      accessibilityState={{ ...accessibilityState, disabled: blocked, busy: loading }}
      disabled={blocked}
      style={(state) => [styles.root, {
        alignSelf: fullWidth && variant !== 'link' ? 'stretch' : 'flex-start',
        backgroundColor: variant === 'link' ? 'transparent' : variant === 'primary' ? colors.ctaBackground : colors.surfaceCard,
        borderRadius: variant === 'danger' ? radius.card : radius.pill,
        minHeight: variant === 'link' ? 44 : sub ? 62 : 52,
        paddingHorizontal: variant === 'link' ? 12 : 24,
      }, (variant === 'secondary' || variant === 'danger') && { borderWidth: 1, borderColor: variant === 'danger' ? colors.borderStrong : colors.borderDefault },
      blocked && { opacity: 0.35 },
      typeof style === 'function' ? style(state) : style,
      state.pressed && !blocked && { opacity: 0.85, transform: [{ scale: 0.97 }] }] }>
      {loading && variant === 'secondary' ? <View style={[styles.loadingLine, { backgroundColor: colors.gold500 }]} /> : null}
      <View style={styles.row}>
        {loading && variant !== 'secondary' ? <ActivityIndicator color={foreground} /> : null}
        {icon === 'logout' && variant !== 'link' ? <Svg width={17} height={17} viewBox="0 0 24 24"><Path d="M9 21H5A2 2 0 0 1 3 19V5A2 2 0 0 1 5 3H9M16 17L21 12 16 7M21 12H9" stroke={foreground} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg> : null}
        <View style={styles.copy}>
          <View style={styles.labelRow}>
            {icon === 'play' && variant !== 'link' ? <Svg width={13} height={13} viewBox="0 0 24 24" style={{ marginRight: 7 }}><Path d="M7 4.5V19.5C7 20.3 7.9 20.8 8.6 20.4L20.6 12.9C21.2 12.5 21.2 11.5 20.6 11.1L8.6 3.6C7.9 3.2 7 3.7 7 4.5Z" fill={foreground} /></Svg> : null}
            <Text style={[labelFont, { color: foreground }]}>{label}</Text>
            {variant === 'link' ? <Svg width={13} height={13} viewBox="0 0 24 24" style={{ marginLeft: 3 }}><Path d="M9 6L15 12 9 18" stroke={foreground} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg> : null}
          </View>
          {sub && variant !== 'link' ? <Text style={{ ...font.mono(12, 'bold'), letterSpacing: 0.72, color: foreground, opacity: 0.72 }}>{sub}</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  row: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  copy: { alignItems: 'center', gap: 4 },
  labelRow: { alignItems: 'center', flexDirection: 'row' },
  loadingLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
});
