import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { t } from '@/i18n';
import { GradientFill } from './GradientFill';
import { append, snapped, type NumberPadField } from './number-pad';
import { useColors } from './theme';
import { font, motion, radius, spacing } from './tokens';

export function NumberPad({ field, initialValue, minimumWeight = 20, onCancel, onCommit }: {
  field: NumberPadField;
  initialValue: string;
  minimumWeight?: number;
  onCancel: () => void;
  onCommit: (value: number) => void;
}) {
  const colors = useColors();
  const [text, setText] = useState('');
  const [slide] = useState(() => new Animated.Value(400));
  useEffect(() => {
    Animated.timing(slide, { toValue: 0, duration: motion.base, useNativeDriver: true }).start();
    return () => slide.stopAnimation();
  }, [slide]);
  const confirm = () => {
    if (!text || !Number.isFinite(Number(text))) onCancel();
    else onCommit(snapped(Number(text), field, minimumWeight));
  };
  const keys = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['.', '0', '⌫']];
  return (
    <View accessibilityViewIsModal style={[StyleSheet.absoluteFill, { zIndex: 100, justifyContent: 'flex-end' }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('student.setEntrySheet.copy008')}
        onPress={onCancel} style={[StyleSheet.absoluteFill, { backgroundColor: colors.numberPadScrim }]} />
      <Animated.View style={{ backgroundColor: colors.surfaceCard, borderTopLeftRadius: radius.modal,
        borderTopRightRadius: radius.modal, borderTopColor: colors.borderDefault, borderTopWidth: 1,
        paddingHorizontal: spacing.space4, paddingTop: 14, paddingBottom: 22, transform: [{ translateY: slide }] }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', paddingTop: 2, paddingHorizontal: 4, paddingBottom: 12 }}>
          <Text style={{ ...font.mono(12), letterSpacing: 0.72, color: colors.textMuted, flex: 1 }}>
            {t(field === 'weight' ? 'designSystem.numberPad.enterWeight' : 'designSystem.numberPad.enterReps')}
          </Text>
          <Text style={{ ...font.mono(30, 'bold'), color: text ? colors.textPrimary : colors.textFaint, textAlign: 'right', minWidth: 80 }}>
            {text || initialValue}
          </Text>
          <Text style={{ ...font.mono(13, 'bold'), color: colors.textMuted, marginLeft: 5 }}>
            {field === 'weight' ? 'KG' : t('designSystem.repsUnit')}
          </Text>
        </View>
        <View style={{ gap: spacing.space2 }}>
          {keys.map((row, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: spacing.space2 }}>
              {row.map(ch => {
                const disabled = ch === '.' && field === 'reps';
                return (
                  <Pressable key={ch} accessibilityRole="button" disabled={disabled}
                    accessibilityLabel={ch === '.' ? t('designSystem.numberPad.decimalPoint') : ch === '⌫' ? t('designSystem.numberPad.backspace') : ch}
                    onPress={() => setText(previous => ch === '⌫' ? previous.slice(0, -1) : append(previous, ch, field))}
                    style={({ pressed }) => ({ flex: 1, height: 52, borderRadius: radius.control,
                      backgroundColor: colors.surfaceKey, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.25 : pressed ? 0.6 : 1 })}>
                    <Text style={{ ...font.mono(ch === '⌫' ? 19 : 21, 'bold'), color: colors.textPrimary }}>{ch}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.space2, marginTop: spacing.space2 }}>
          <Pressable accessibilityRole="button" onPress={onCancel}
            style={{ flex: 1, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong }}>
            <Text style={{ ...font.body(15, 'semibold'), color: colors.textSecondary }}>{t('designSystem.action.cancel')}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={confirm}
            style={{ flex: 2, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, overflow: 'hidden' }}>
            <GradientFill direction="vertical" stops={[{ color: colors.gold400, offset: 0 }, { color: colors.gold500, offset: 1 }]} />
            <Text style={{ ...font.display(15), color: colors.ctaText }}>{t('designSystem.action.confirm')}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}
