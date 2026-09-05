import { useState } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { font, typography, useColors } from '@/design';

type GlobalAuthFieldProps = TextInputProps & {
  label?: string;
  helper?: string;
  error?: string;
  mono?: boolean;
};

export function GlobalAuthField({ label, helper, error, mono = false, secureTextEntry = false, style, onFocus, onBlur, ...props }: GlobalAuthFieldProps) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  return <View style={{ gap: 6 }}>
    <View style={{
      backgroundColor: colors.surfaceCard, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
      borderWidth: 1, borderColor: error ? `${colors.danger}80` : focused ? colors.gold500 : colors.borderSubtle,
      shadowColor: colors.cardShadow, shadowOpacity: 0.67, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2,
    }}>
      {label ? <Text style={{ ...font.mono(9.5, 'bold'), letterSpacing: 1.33, color: error ? colors.danger : focused ? colors.goldText : colors.textMuted }}>{label}</Text> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: label ? 5 : 0 }}>
        <TextInput {...props}
          accessibilityLabel={props.accessibilityLabel ?? label}
          accessibilityHint={error ?? helper ?? props.accessibilityHint}
          placeholderTextColor={colors.textDisabled} selectionColor={colors.gold500} cursorColor={colors.gold500}
          secureTextEntry={secureTextEntry && !visible}
          onFocus={event => { setFocused(true); onFocus?.(event); }}
          onBlur={event => { setFocused(false); onBlur?.(event); }}
          style={[{
            ...(secureTextEntry || mono ? font.mono(18, 'semibold') : font.body(16, 'semibold')),
            ...(secureTextEntry ? { letterSpacing: 2.52 } : {}),
            color: colors.textPrimary, flex: 1, minHeight: 44, padding: 0,
          }, style]} />
        {secureTextEntry ? <Pressable accessibilityRole="button" accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          disabled={props.editable === false} onPress={() => setVisible(value => !value)}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={17} height={17} viewBox="0 0 24 24" accessible={false}>
            <Path d="M2 12S5.5 5 12 5s10 7 10 7-3.5 7-10 7S2 12 2 12Z" fill="none" stroke={colors.textMuted} strokeWidth={2} strokeLinejoin="round" />
            <Circle cx={12} cy={12} r={3} fill="none" stroke={colors.textMuted} strokeWidth={2} />
            {visible ? <Path d="M3 3L21 21" stroke={colors.textMuted} strokeWidth={2} strokeLinecap="round" /> : null}
          </Svg>
        </Pressable> : null}
      </View>
    </View>
    {error || helper ? <Text accessibilityRole={error ? 'alert' : undefined} style={{ ...typography.footnote, color: error ? colors.danger : colors.textTertiary }}>{error || helper}</Text> : null}
  </View>;
}
