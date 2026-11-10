import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';

import { t } from '@/i18n';
import { GradientFill } from './GradientFill';
import { accessoryValue, appendAccessory, append, snapped, type NumberPadField } from './number-pad';
import { useColors } from './theme';
import { font, radius, spacing } from './tokens';

type NumberPadProps = {
  layout?: 'allDay';
  field: NumberPadField;
  initialValue: string;
  minimumWeight?: number;
  contextText?: string;
  syncTitle?: string;
  nextTitle?: string;
  commitTitle?: string;
  unit?: 'kg' | 'lb';
  onPanelLayout?: (top: number, height: number) => void;
  onSync?: (value: number) => void;
  onCancel: () => void;
  /** Training entry keeps a live preview and commits valid, edited values on dismissal. */
  onChangeText?: (text: string) => void;
  onDismiss?: (value: number | undefined) => void;
} & ({
  mode?: 'main';
  onNext?: (value: number) => void;
  onCommit: (value: number) => void;
} | {
  mode: 'accessory';
  onNext?: (value: number | null) => void;
  onCommit: (value: number | null) => void;
});

export type NumberPadHandle = { dismiss: () => void };

export const NumberPad = forwardRef<NumberPadHandle, NumberPadProps>(function NumberPad(props, ref) {
  const { field, initialValue, minimumWeight = 20, contextText, syncTitle, nextTitle, commitTitle, unit = 'kg', onPanelLayout, onSync, onNext, onCancel, onCommit } = props;
  const accessory = props.mode === 'accessory';
  const panel = useRef<View>(null);
  const colors = useColors();
  const [text, setText] = useState(accessory || props.onDismiss ? initialValue : '');
  const [pristine, setPristine] = useState(true);
  const invalid = accessory && accessoryValue(text, field) === undefined;
  const resolvedValue = () => snapped(text && Number.isFinite(Number(text)) ? Number(text) : Number(initialValue), field, minimumWeight);
  const dismiss = () => {
    if (!props.onDismiss) { onCancel(); return; }
    const value = accessory ? accessoryValue(text, field) : text && Number.isFinite(Number(text)) ? Number(text) : undefined;
    props.onDismiss(!pristine && value != null ? accessory ? value : snapped(value, field, minimumWeight) : undefined);
  };
  useImperativeHandle(ref, () => ({ dismiss }));
  const confirm = () => {
    if (props.mode === 'accessory') {
      const value = accessoryValue(text, field);
      if (value !== undefined) (props.onNext ?? props.onCommit)(value);
      return;
    }
    if (!text || !Number.isFinite(Number(text))) onCancel();
    else onCommit(snapped(Number(text), field, minimumWeight));
  };
  if (props.layout === 'allDay') {
    const key = (ch: string, flex = 1) => <Pressable key={ch} accessibilityRole="button" accessibilityLabel={ch === '⌫' ? t('designSystem.numberPad.backspace') : ch === '.' ? t('designSystem.numberPad.decimalPoint') : ch}
      disabled={ch === '.' && (field === 'reps' || field === 'rir')} onPress={() => {
        const next = ch === '⌫' ? text.slice(0, -1) : appendAccessory(pristine ? '' : text, ch, field);
        setText(next); setPristine(false); props.onChangeText?.(next);
      }} style={{ flex, height: 52, backgroundColor: colors.surfaceKey, borderRadius: radius.control, alignItems: 'center', justifyContent: 'center' }}><Text style={{ ...font.mono(21, 'bold'), color: colors.textPrimary }}>{ch}</Text></Pressable>;
    return <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end', zIndex: 100 }]}>

      <View ref={panel} onLayout={onPanelLayout ? () => panel.current?.measureInWindow((_x, top, _width, height) => onPanelLayout(top, height)) : undefined} style={{ padding: 16, paddingBottom: 22, gap: 12, backgroundColor: colors.surfaceCard, borderTopLeftRadius: radius.modal, borderTopRightRadius: radius.modal }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Text style={{ ...font.body(12), color: colors.textSecondary, flex: 1 }}>{contextText}</Text>
          {onNext ? <Pressable accessibilityRole="button" accessibilityLabel={nextTitle} onPress={() => { const value = accessoryValue(text, field); if (value !== undefined && props.mode === 'accessory') props.onNext?.(value); }}><Text style={{ ...font.body(12), color: colors.goldText }}>{nextTitle}</Text></Pressable> : null}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 3, gap: 8 }}>{[['1','2','3'],['4','5','6'],['7','8','9']].map((row, i) => <View key={i} style={{ flexDirection: 'row', gap: 8 }}>{row.map(ch => key(ch))}</View>)}<View style={{ flexDirection: 'row', gap: 8 }}>{key('.')}{key('0', 2)}</View></View>
          <View style={{ flex: 1, gap: 8 }}>{key('⌫', 0)}<Pressable accessibilityRole="button" accessibilityLabel={commitTitle} disabled={invalid} onPress={dismiss} style={{ flex: 1, backgroundColor: colors.gold500, borderRadius: radius.control, justifyContent: 'center', alignItems: 'center' }}><Text style={{ ...font.body(16, 'bold'), color: colors.inkOnGold }}>{commitTitle}</Text></Pressable></View>
        </View>
      </View>
    </View>;
  }
  const keys = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['.', '0', '⌫']];
  return (
    <View accessibilityViewIsModal style={[StyleSheet.absoluteFill, { zIndex: 100, justifyContent: 'flex-end' }]}>
      <Pressable feedback="none" accessibilityRole="button" accessibilityLabel={props.onDismiss ? t('training.numberPad.dismiss') : t('student.setEntrySheet.copy008')}
        onPress={dismiss} style={[StyleSheet.absoluteFill, { backgroundColor: colors.numberPadScrim }]} />
      <View ref={panel} onLayout={onPanelLayout ? () => panel.current?.measureInWindow((_x, top, _width, height) => onPanelLayout(top, height)) : undefined} style={{ backgroundColor: colors.surfaceCard, borderTopLeftRadius: radius.modal,
        borderTopRightRadius: radius.modal, borderTopColor: colors.borderDefault, borderTopWidth: 1,
        paddingHorizontal: spacing.space4, paddingTop: 14, paddingBottom: 22 }}>
        {!accessory && (contextText || onSync || onNext) ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text numberOfLines={1} style={{ ...font.mono(12), color: colors.textMuted, flex: 1 }}>{contextText}</Text>
          {onSync ? <Pressable accessibilityRole="button" accessibilityLabel={syncTitle} onPress={() => onSync(resolvedValue())} style={({ pressed }) => ({ minHeight: 48, minWidth: 48, justifyContent: 'center', opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}><Text style={{ ...font.body(12, 'semibold'), color: colors.goldText }}>{syncTitle}</Text></Pressable> : null}
          {onNext ? <Pressable accessibilityRole="button" accessibilityLabel={nextTitle} onPress={() => onNext(resolvedValue())} style={({ pressed }) => ({ minHeight: 48, minWidth: 48, justifyContent: 'center', opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}><Text style={{ ...font.body(12, 'semibold'), color: colors.goldText }}>{nextTitle}</Text></Pressable> : null}
        </View> : null}
        <View style={{ flexDirection: 'row', alignItems: 'baseline' , paddingTop: 2, paddingHorizontal: 4, paddingBottom: 12 }}>
          <Text numberOfLines={accessory ? 1 : undefined} style={{ ...font.mono(12), letterSpacing: 0.72, color: colors.textMuted, flex: 1 }}>
            {accessory ? contextText : field === 'rir' ? 'RIR' : field === 'rpe' ? 'RPE' : t(field === 'weight' ? 'designSystem.numberPad.enterWeight' : 'designSystem.numberPad.enterReps')}
          </Text>
          <Text style={{ ...font.mono(30, 'bold'), color: text ? colors.textPrimary : colors.textFaint, textAlign: 'right', minWidth: 80 }}>
            {accessory ? text || '—' : text || initialValue}
          </Text>
          <Text style={{ ...font.mono(13, 'bold'), color: colors.textMuted, marginLeft: 5 }}>
            {field === 'weight' ? unit.toUpperCase() : field === 'rpe' || field === 'rir' ? '' : t('designSystem.repsUnit')}
          </Text>
        </View>
        <View style={{ gap: spacing.space2 }}>
          {keys.map((row, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: spacing.space2 }}>
              {row.map(ch => {
                const disabled = ch === '.' && (field === 'reps' || field === 'rir');
                return (
                  <Pressable haptic="selection" key={ch} accessibilityRole="button" disabled={disabled}
                    accessibilityLabel={ch === '.' ? t('designSystem.numberPad.decimalPoint') : ch === '⌫' ? t('designSystem.numberPad.backspace') : ch}
                    onPress={() => {
                      const next = ch === '⌫' ? text.slice(0, -1) : accessory ? appendAccessory(pristine ? '' : text, ch, field) : append(pristine ? '' : text, ch, field);
                      setText(next);
                      setPristine(false);
                      props.onChangeText?.(next);
                    }}
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
          <Pressable accessibilityRole="button" onPress={dismiss}
            style={({ pressed }) => ({ flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
            <Text style={{ ...font.body(15, 'semibold'), color: colors.textSecondary }}>{t(props.onDismiss ? 'training.numberPad.dismiss' : 'designSystem.action.cancel')}</Text>
          </Pressable>
          <Pressable haptic="light" accessibilityRole="button" disabled={invalid} accessibilityState={{ disabled: invalid }} onPress={confirm}
            style={({ pressed }) => ({ flex: 2, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, overflow: 'hidden', backgroundColor: accessory ? colors.gold500 : undefined, opacity: invalid ? 0.4 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
            {!accessory ? <GradientFill direction="vertical" stops={[{ color: colors.gold400, offset: 0 }, { color: colors.gold500, offset: 1 }]} /> : null}
            <Text style={{ ...font.display(15), color: colors.ctaText }}>{accessory && onNext ? nextTitle : commitTitle ?? t('designSystem.action.confirm')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
});
