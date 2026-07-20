import {
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radius, spacing, typography } from './tokens';

export type AppButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  style?: StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
  /** `accent` = the red borderedProminent look (readiness/privacy confirm);
   * `danger` is visually identical but reserved for destructive actions. */
  variant?: 'primary' | 'secondary' | 'accent' | 'danger';
};

export function AppButton({
  disabled = false,
  label,
  style,
  variant = 'primary',
  ...props
}: AppButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      style={(state) => [
        styles.root,
        styles[variant],
        state.pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}
      accessibilityRole="button">
      <Text style={[styles.label, styles[`${variant}Label`]]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    borderRadius: radius.lg,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  primary: {
    backgroundColor: colors.fgPrimary,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderColor: colors.fgPrimary,
    borderWidth: 1,
  },
  accent: {
    backgroundColor: colors.brandRed,
  },
  danger: {
    backgroundColor: colors.brandRed,
  },
  pressed: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.35,
  },
  label: {
    ...typography.bodyEmphasis,
  },
  primaryLabel: {
    color: colors.bg,
  },
  secondaryLabel: {
    color: colors.fgPrimary,
  },
  accentLabel: {
    color: '#FFFFFF',
  },
  dangerLabel: {
    color: '#FFFFFF',
  },
});
