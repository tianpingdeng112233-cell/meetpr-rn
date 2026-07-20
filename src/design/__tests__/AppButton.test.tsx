import { expect, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import {
  StyleSheet,
  Text,
  type PressableStateCallbackType,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { AppButton, type AppButtonProps } from '@/design/AppButton';
import { colors, radius, spacing, typography } from '@/design/tokens';

function renderedStyles(variant: NonNullable<AppButtonProps['variant']>, disabled = false) {
  let renderer: ReactTestRenderer | undefined;

  act(() => {
    renderer = create(
      <AppButton disabled={disabled} label={variant} variant={variant} />,
    );
  });

  const button = renderer!.root.findByProps({ accessibilityRole: 'button' });
  const label = renderer!.root.findByType(Text);
  const styleFor = button.props.style as (
    state: PressableStateCallbackType,
  ) => StyleProp<ViewStyle>;
  const normal = StyleSheet.flatten(styleFor({ pressed: false })) as ViewStyle;
  const pressed = StyleSheet.flatten(styleFor({ pressed: true })) as ViewStyle;
  const labelStyle = StyleSheet.flatten(label.props.style) as TextStyle;

  act(() => renderer?.unmount());

  return { labelStyle, normal, pressed };
}

const cases: {
  backgroundColor: string;
  borderColor?: string;
  borderWidth?: number;
  color: string;
  variant: NonNullable<AppButtonProps['variant']>;
}[] = [
  { backgroundColor: colors.fgPrimary, color: colors.bg, variant: 'primary' },
  {
    backgroundColor: 'transparent',
    borderColor: colors.fgPrimary,
    borderWidth: 1,
    color: colors.fgPrimary,
    variant: 'secondary',
  },
  { backgroundColor: colors.brandRed, color: '#FFFFFF', variant: 'danger' },
];

test.each(cases)(
  '$variant variant preserves the iOS fill, label and interaction states',
  ({ backgroundColor, borderColor, borderWidth, color, variant }) => {
    const enabled = renderedStyles(variant);
    const disabled = renderedStyles(variant, true);

    expect({
      backgroundColor: enabled.normal.backgroundColor,
      borderColor: enabled.normal.borderColor,
      borderRadius: enabled.normal.borderRadius,
      borderWidth: enabled.normal.borderWidth,
      color: enabled.labelStyle.color,
      fontSize: enabled.labelStyle.fontSize,
      fontWeight: enabled.labelStyle.fontWeight,
      minHeight: enabled.normal.minHeight,
      paddingHorizontal: enabled.normal.paddingHorizontal,
      paddingVertical: enabled.normal.paddingVertical,
    }).toEqual({
      backgroundColor,
      borderColor,
      borderRadius: radius.lg,
      borderWidth,
      color,
      fontSize: typography.bodyEmphasis.fontSize,
      fontWeight: typography.bodyEmphasis.fontWeight,
      minHeight: 44,
      paddingHorizontal: spacing.lg,
      paddingVertical: 14,
    });
    expect(enabled.normal.opacity).toBeUndefined();
    expect(enabled.pressed.opacity).toBe(0.6);
    expect(disabled.normal.backgroundColor).toBe(backgroundColor);
    expect(disabled.normal.opacity).toBe(0.35);
    expect(disabled.pressed.opacity).toBe(0.35);
  },
);
