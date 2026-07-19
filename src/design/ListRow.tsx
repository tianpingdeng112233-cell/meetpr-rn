import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type AccessibilityProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, spacing, typography } from './tokens';

export type ListRowProps = AccessibilityProps & {
  title: string;
  subtitle?: string;
  accessory?: ReactNode;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function ListRow({
  accessory,
  disabled = false,
  onPress,
  style,
  subtitle,
  title,
  ...accessibilityProps
}: ListRowProps) {
  const content = (
    <>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {accessory ? <View style={styles.accessory}>{accessory}</View> : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [styles.root, pressed && !disabled && styles.pressed, style]}
        {...accessibilityProps}>
        {content}
      </Pressable>
    );
  }

  return (
    <View style={[styles.root, style]} {...accessibilityProps}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  pressed: {
    backgroundColor: colors.surface2,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: colors.fgPrimary,
    ...typography.body,
  },
  subtitle: {
    color: colors.fgSecondary,
    ...typography.footnote,
  },
  accessory: {
    flexShrink: 0,
  },
});
