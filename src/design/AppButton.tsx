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
};

export function AppButton({ disabled = false, label, style, ...props }: AppButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      style={(state) => [
        styles.root,
        state.pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}
      accessibilityRole="button">
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandRed,
    borderRadius: radius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  pressed: {
    backgroundColor: colors.brandRedPress,
  },
  disabled: {
    backgroundColor: colors.fgDisabled,
  },
  label: {
    color: colors.fgPrimary,
    ...typography.bodyEmphasis,
  },
});
