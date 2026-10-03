import { ActivityIndicator, Text, type PressableProps } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import Svg, { Path } from 'react-native-svg';

import { font, useColors } from '@/design';

type GlobalAuthButtonProps = Pick<PressableProps, 'onPress' | 'disabled'> & { label: string; loading?: boolean };

export function GlobalAuthButton({ label, loading = false, disabled = false, onPress }: GlobalAuthButtonProps) {
  const colors = useColors();
  const blocked = disabled || loading;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: blocked, busy: loading }}
    disabled={blocked} onPress={onPress} style={{
      height: 54, borderRadius: 14, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center',
      backgroundColor: disabled ? colors.surfaceRaised : colors.gold500,
      ...(!disabled ? { shadowColor: colors.gold500, shadowOpacity: 0.22, shadowRadius: 9, shadowOffset: { width: 0, height: 6 }, elevation: 4 } : {}),
    }}>
    {loading ? <ActivityIndicator color={colors.inkOnGold} /> : <>
      <Text style={{ ...font.body(16, 'bold'), letterSpacing: 0.32, color: disabled ? colors.textDisabled : colors.inkOnGold }}>{label}</Text>
      <Svg width={16} height={16} viewBox="0 0 24 24" accessible={false}>
        <Path d="M4 12H20M13 5L20 12 13 19" stroke={disabled ? colors.textDisabled : colors.inkOnGold} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </Svg>
    </>}
  </Pressable>;
}
