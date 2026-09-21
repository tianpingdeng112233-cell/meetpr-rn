import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';

import { t } from '@/i18n';
import { GradientFill } from './GradientFill';
import { append, snapped, type NumberPadField } from './number-pad';
import { useColors } from './theme';
import { font, radius, spacing } from './tokens';

export function NumberPad({ field, initialValue, minimumWeight = 20, contextText, syncTitle, nextTitle, commitTitle, onSync, onNext, onCancel, onCommit }: {
  field: NumberPadField;
  initialValue: string;
  minimumWeight?: number;
  contextText?: string;
  syncTitle?: string;
  nextTitle?: string;
  commitTitle?: string;
  onSync?: (value: number) => void;
  onNext?: (value: number) => void;
  onCancel: () => void;
  onCommit: (value: number) => void;
}) {
  const colors = useColors();
  const [text, setText] = useState('');
  const resolvedValue = () => snapped(text && Number.isFinite(Number(text)) ? Number(text) : Number(initialValue), field, minimumWeight);
  const confirm = () => {
    if (!text || !Number.isFinite(Number(text))) onCancel();
    else onCommit(snapped(Number(text), field, minimumWeight));
  };
  const keys = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['.', '0', '⌫']];
  return (
    <View accessibilityViewIsModal style={[StyleSheet.absoluteFill, { zIndex: 100, justifyContent: 'flex-end' }]}>
      <Pressable feedback="none" accessibilityRole="button" accessibilityLabel={t('student.setEntrySheet.copy008')}
        onPress={onCancel} style={[StyleSheet.absoluteFill, { backgroundColor: colors.numberPadScrim }]} />
      <View style={{ backgroundColor: colors.surfaceCard, borderTopLeftRadius: radius.modal,
        borderTopRightRadius: radius.modal, borderTopColor: colors.borderDefault, borderTopWidth: 1,
        paddingHorizontal: spacing.space4, paddingTop: 14, paddingBottom: 22 }}>
        {(contextText || onSync || onNext) ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text numberOfLines={1} style={{ ...font.mono(12), color: colors.textMuted, flex: 1 }}>{contextText}</Text>
          {onSync ? <Pressable accessibilityRole="button" accessibilityLabel={syncTitle} onPress={() => onSync(resolvedValue())} style={({ pressed }) => ({ minHeight: 48, minWidth: 48, justifyContent: 'center', opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}><Text style={{ ...font.body(12, 'semibold'), color: colors.goldText }}>{syncTitle}</Text></Pressable> : null}
          {onNext ? <Pressable accessibilityRole="button" accessibilityLabel={nextTitle} onPress={() => onNext(resolvedValue())} style={({ pressed }) => ({ minHeight: 48, minWidth: 48, justifyContent: 'center', opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}><Text style={{ ...font.body(12, 'semibold'), color: colors.goldText }}>{nextTitle}</Text></Pressable> : null}
        </View> : null}
        <View style={{ flexDirection: 'row', alignItems: 'baseline' , paddingTop: 2, paddingHorizontal: 4, paddingBottom: 12 }}>
          <Text style={{ ...font.mono(12), letterSpacing: 0.72, color: colors.textMuted, flex: 1 }}>
            {field === 'rpe' ? 'RPE' : t(field === 'weight' ? 'designSystem.numberPad.enterWeight' : 'designSystem.numberPad.enterReps')}
          </Text>
          <Text style={{ ...font.mono(30, 'bold'), color: text ? colors.textPrimary : colors.textFaint, textAlign: 'right', minWidth: 80 }}>
            {text || initialValue}
          </Text>
          <Text style={{ ...font.mono(13, 'bold'), color: colors.textMuted, marginLeft: 5 }}>
            {field === 'weight' ? 'KG' : field === 'rpe' ? '' : t('designSystem.repsUnit')}
          </Text>
        </View>
        <View style={{ gap: spacing.space2 }}>
          {keys.map((row, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: spacing.space2 }}>
              {row.map(ch => {
                const disabled = ch === '.' && field === 'reps';
                return (
                  <Pressable haptic="selection" key={ch} accessibilityRole="button" disabled={disabled}
                    accessibilityLabel={ch === '.' ? t('designSystem.numberPad.decimalPoint') : ch === '⌫' ? t('designSystem.numberPad.backspace') : ch}
                    onPress={() => setText(previous => ch === '⌫' ? previous.slice(0, -1) : append(previous, ch, field))}
                    style={({ pressed }) => ({ flex: 1, height: 52, borderRadius: radius.control,
                      backgroundColor: colors.surfaceKey, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.25 : pressed ? 0.85 : 1, transform: [{ scale: pressed && !disabled ? 0.97 : 1 }] })}>
                    <Text style={{ ...font.mono(ch === '⌫' ? 19 : 21, 'bold'), color: colors.textPrimary }}>{ch}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.space2, marginTop: spacing.space2 }}>
          <Pressable accessibilityRole="button" onPress={onCancel}
            style={({ pressed }) => ({ flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
            <Text style={{ ...font.body(15, 'semibold'), color: colors.textSecondary }}>{t('designSystem.action.cancel')}</Text>
          </Pressable>
          <Pressable haptic="light" accessibilityRole="button" onPress={confirm}
            style={({ pressed }) => ({ flex: 2, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, overflow: 'hidden', opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
            <GradientFill direction="vertical" stops={[{ color: colors.gold400, offset: 0 }, { color: colors.gold500, offset: 1 }]} />
            <Text style={{ ...font.display(15), color: colors.ctaText }}>{commitTitle ?? t('designSystem.action.confirm')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
