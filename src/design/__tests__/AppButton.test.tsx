import { expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { StyleSheet, Text, Vibration, type PressableStateCallbackType, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { AppButton, type AppButtonProps } from '@/design/AppButton';

function renderedStyles(variant: NonNullable<AppButtonProps['variant']>, disabled = false) {
  let renderer!: ReactTestRenderer;
  act(() => { renderer = create(<AppButton disabled={disabled} label={variant} variant={variant} />); });
  const button = renderer.root.findByProps({ accessibilityRole: 'button' });
  const label = renderer.root.findByType(Text);
  const styleFor = button.props.style as (state: PressableStateCallbackType) => StyleProp<ViewStyle>;
  const normal = StyleSheet.flatten(styleFor({ pressed: false } as PressableStateCallbackType)) as ViewStyle;
  const pressed = StyleSheet.flatten(styleFor({ pressed: true } as PressableStateCallbackType)) as ViewStyle;
  const labelStyle = StyleSheet.flatten(label.props.style) as TextStyle;
  act(() => renderer.unmount());
  return { labelStyle, normal, pressed };
}

const cases = [
  { variant: 'primary', backgroundColor: '#111827', color: '#FFFFFF', borderColor: undefined, borderWidth: undefined, borderRadius: 999, fontFamily: 'Archivo_800ExtraBold', fontSize: 16, minHeight: 52 },
  { variant: 'secondary', backgroundColor: '#FFFFFF', color: '#4B5563', borderColor: '#E5E7EB', borderWidth: 1, borderRadius: 999, fontFamily: 'Archivo_800ExtraBold', fontSize: 16, minHeight: 52 },
  { variant: 'danger', backgroundColor: '#FFFFFF', color: '#A33B40', borderColor: '#D1D5DB', borderWidth: 1, borderRadius: 16, fontFamily: 'IBMPlexSans_600SemiBold', fontSize: 14, minHeight: 52 },
  { variant: 'link', backgroundColor: 'transparent', color: '#5C6371', borderColor: undefined, borderWidth: undefined, borderRadius: 999, fontFamily: 'IBMPlexSans_500Medium', fontSize: 13, minHeight: 44 },
] as const;

test.each(cases)('$variant variant matches v3 GoldCTA fill, typography and press states', ({ variant, color, fontFamily, fontSize, borderColor, borderWidth, ...surface }) => {
  const enabled = renderedStyles(variant);
  const disabled = renderedStyles(variant, true);
  expect(enabled.normal).toMatchObject(surface);
  expect(enabled.normal.borderColor).toBe(borderColor);
  expect(enabled.normal.borderWidth).toBe(borderWidth);
  expect(enabled.labelStyle).toMatchObject({ color, fontFamily, fontSize });
  expect(enabled.normal.opacity).toBeUndefined();
  expect(enabled.pressed.transform).toEqual([{ scale: 0.97 }]);
  expect(disabled.normal.opacity).toBe(0.35);
  expect(disabled.pressed.transform).toBeUndefined();
});

test('pressing the button calls onPress without vibrating', () => {
  const vibrate = jest.spyOn(Vibration, 'vibrate').mockImplementation(() => {});
  const onPress = jest.fn();
  let renderer!: ReactTestRenderer;
  try {
    act(() => { renderer = create(<AppButton label="登录" onPress={onPress} />); });
    const button = renderer.root.findByProps({ accessibilityRole: 'button' });
    act(() => button.props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(vibrate).not.toHaveBeenCalled();
  } finally {
    act(() => renderer?.unmount());
    vibrate.mockRestore();
  }
});

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
