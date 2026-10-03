import { useState } from 'react';
import { Text, TextInput, View, type TextInputProps, type StyleProp, type ViewStyle } from 'react-native';

import { useColors } from './theme';
import { font, radius, typography } from './tokens';

export type TextFieldProps = TextInputProps & { label?: string; helper?: string; error?: string; mono?: boolean; containerStyle?: StyleProp<ViewStyle> };

export function TextField({ label, helper, error, mono = false, containerStyle, style, onFocus, onBlur, ...props }: TextFieldProps) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  return <View style={[{ gap: 8 }, containerStyle]}>
    {label ? <Text style={{ ...font.mono(11, 'semibold'), letterSpacing: 0.7, color: error ? colors.danger : colors.textMuted }}>{label.toUpperCase()}</Text> : null}
    <TextInput {...props} accessibilityLabel={props.accessibilityLabel ?? label} placeholderTextColor={colors.textTertiary} selectionColor={colors.gold500} cursorColor={colors.gold500}
      onFocus={(event) => { setFocused(true); onFocus?.(event); }} onBlur={(event) => { setFocused(false); onBlur?.(event); }}
      style={[{ backgroundColor: colors.bgInset, borderWidth: 1, borderColor: error ? colors.danger : focused ? colors.gold500 : colors.borderDefault, borderRadius: radius.md, minHeight: 44, padding: 12, color: colors.textPrimary }, mono ? { ...font.mono(17, 'medium'), letterSpacing: 0.8 } : font.body(17), style]} />
    {error || helper ? <Text accessibilityRole={error ? 'alert' : undefined} style={{ ...typography.footnote, color: error ? colors.danger : colors.textTertiary }}>{error || helper}</Text> : null}
  </View>;
}
