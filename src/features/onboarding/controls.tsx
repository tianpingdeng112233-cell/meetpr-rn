import { type ReactNode, useEffect, useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';

import { Card, useColors, type Colors, radius, spacing, typography } from '@/design';

import { dateText } from './model';

export type Choice<T extends string | number> = {
  label: string;
  subtitle?: string;
  value: T;
};

export function FieldLabel({ children }: { children: ReactNode }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

export function FormInput({ error, style, ...props }: TextInputProps & { error?: boolean }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <TextInput
      placeholderTextColor={colors.textTertiary}
      style={[styles.input, error && styles.errorBorder, style]}
      {...props}
    />
  );
}

export function ChoiceGroup<T extends string | number>({
  choices,
  onChange,
  selected,
  error = false,
}: {
  choices: readonly Choice<T>[];
  onChange: (value: T) => void;
  selected: T | null;
  error?: boolean;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.wrap}>
      {choices.map((choice) => {
        const active = choice.value === selected;
        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            key={String(choice.value)}
            onPress={() => onChange(choice.value)}
            style={[
              styles.choice,
              choice.subtitle && styles.choiceCard,
              active && styles.selected,
              error && styles.errorBorder,
            ]}>
            <Text style={[styles.choiceText, active && styles.selectedText]}>
              {choice.label}
            </Text>
            {choice.subtitle ? (
              <Text style={styles.choiceSubtitle}>{choice.subtitle}</Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function MultiChoice<T extends string>({
  choices,
  max,
  onChange,
  selected,
  error = false,
}: {
  choices: readonly Choice<T>[];
  max: number;
  onChange: (value: T[]) => void;
  selected: readonly T[];
  error?: boolean;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.wrap}>
      {choices.map((choice) => {
        const active = selected.includes(choice.value);
        return (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: active }}
            key={choice.value}
            onPress={() => {
              if (active) onChange(selected.filter((value) => value !== choice.value));
              else if (selected.length < max) onChange([...selected, choice.value]);
            }}
            style={[styles.choice, active && styles.selected, error && styles.errorBorder]}>
            <Text style={[styles.choiceText, active && styles.selectedText]}>
              {choice.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Scale({
  error = false,
  footnote,
  labels,
  onChange,
  title,
  value,
}: {
  error?: boolean;
  footnote?: string;
  labels?: readonly [string, string];
  onChange: (value: number) => void;
  title: string;
  value: number | null;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Card style={[styles.scaleCard, error && styles.errorBorder]}>
      <Text style={styles.scaleTitle}>{title}</Text>
      <View style={styles.scaleRow}>
        {[1, 2, 3, 4, 5].map((number) => (
          <Pressable
            accessibilityLabel={`${title} ${number}`}
            key={number}
            onPress={() => onChange(number)}
            style={[styles.scaleDot, value === number && styles.selected]}>
            <Text style={[styles.choiceText, value === number && styles.selectedText]}>
              {number}
            </Text>
          </Pressable>
        ))}
      </View>
      {labels ? (
        <View style={styles.scaleEnds}>
          <Text style={styles.caption}>{labels[0]}</Text>
          <Text style={styles.caption}>{labels[1]}</Text>
        </View>
      ) : null}
      {footnote ? <Text style={styles.footnote}>{footnote}</Text> : null}
    </Card>
  );
}

export function DiscreteSlider({
  max,
  min,
  onChange,
  step = 1,
  value,
}: {
  max: number;
  min: number;
  onChange: (value: number) => void;
  step?: number;
  value: number;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const values = Array.from(
    { length: Math.round((max - min) / step) + 1 },
    (_, index) => min + index * step,
  );
  const progress = ((value - min) / (max - min)) * 100;
  return (
    <View accessibilityRole="adjustable" style={styles.slider}>
      <View style={styles.sliderRail}>
        <View style={[styles.sliderFill, { width: `${progress}%` }]} />
      </View>
      <View style={styles.sliderMarks}>
        {values.map((candidate) => (
          <Pressable
            accessibilityLabel={String(candidate)}
            key={candidate}
            onPress={() => onChange(candidate)}
            style={styles.sliderHit}>
            <View style={[styles.sliderMark, candidate === value && styles.sliderThumb]} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const ROW_HEIGHT = 42;

export function NumberWheel({
  onChange,
  options,
  value,
}: {
  onChange: (value: number) => void;
  options: readonly number[];
  value: number;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const initialIndex = Math.max(0, options.indexOf(value));
  return (
    <View style={styles.wheel}>
      <ScrollView
        contentContainerStyle={styles.wheelContent}
        contentOffset={{ x: 0, y: ROW_HEIGHT * initialIndex }}
        decelerationRate="fast"
        nestedScrollEnabled
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.y / ROW_HEIGHT);
          const next = options[Math.max(0, Math.min(index, options.length - 1))];
          if (next !== undefined) onChange(next);
        }}
        showsVerticalScrollIndicator={false}
        snapToInterval={ROW_HEIGHT}>
        {options.map((item) => (
          <Pressable key={item} onPress={() => onChange(item)} style={styles.wheelRow}>
            <Text style={[styles.wheelText, item === value && styles.wheelSelected]}>
              {item}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <View pointerEvents="none" style={styles.wheelFocus} />
    </View>
  );
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function dateRangeOptions(min: number, max: number): number[] {
  return Array.from({ length: max - min + 1 }, (_, index) => min + index);
}

function clampDate(value: string, minDate: string, maxDate: string): string {
  return value < minDate ? minDate : value > maxDate ? maxDate : value;
}

export function DateWheel({
  maxDate = dateText(new Date()),
  minDate = '1930-01-01',
  onChange,
  value,
}: {
  maxDate?: string;
  minDate?: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const safeValue = clampDate(value, minDate, maxDate);
  const [year, month, day] = safeValue.split('-').map(Number);
  const [minYear, minMonth, minDay] = minDate.split('-').map(Number);
  const [maxYear, maxMonth, maxDay] = maxDate.split('-').map(Number);
  const firstMonth = year === minYear ? minMonth : 1;
  const lastMonth = year === maxYear ? maxMonth : 12;
  const firstDay = year === minYear && month === minMonth ? minDay : 1;
  const lastDay = year === maxYear && month === maxMonth ? maxDay : daysInMonth(year, month);
  const years = useMemo(() => dateRangeOptions(minYear, maxYear), [maxYear, minYear]);
  const months = useMemo(() => dateRangeOptions(firstMonth, lastMonth), [firstMonth, lastMonth]);
  const days = useMemo(() => dateRangeOptions(firstDay, lastDay), [firstDay, lastDay]);
  useEffect(() => {
    if (value !== safeValue) onChange(safeValue);
  }, [onChange, safeValue, value]);

  const setPart = (nextYear: number, nextMonth: number, nextDay: number) => {
    const safeDay = Math.min(nextDay, daysInMonth(nextYear, nextMonth));
    const next = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
    onChange(clampDate(next, minDate, maxDate));
  };
  return (
    <View style={styles.dateWheel}>
      <NumberWheel onChange={(next) => setPart(next, month, day)} options={years} value={year} />
      <NumberWheel onChange={(next) => setPart(year, next, day)} options={months} value={month} />
      <NumberWheel onChange={(next) => setPart(year, month, next)} options={days} value={day} />
    </View>
  );
}

const createStyles = (colors: Colors) => StyleSheet.create({
  fieldLabel: { color: colors.textPrimary, marginTop: spacing.sm, ...typography.bodyEmphasis },
  input: {
    backgroundColor: colors.bgInset,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.textPrimary,
    minHeight: 48,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    ...typography.body,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: {
    backgroundColor: colors.bgInset,
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  choiceCard: { flexBasis: '100%' },
  selected: { backgroundColor: colors.goldSoft, borderColor: colors.gold500 },
  errorBorder: { borderColor: colors.danger },
  choiceText: { color: colors.textSecondary, ...typography.body },
  selectedText: { color: colors.textPrimary },
  choiceSubtitle: { color: colors.textTertiary, marginTop: spacing.xs, ...typography.footnote },
  scaleCard: { gap: spacing.md, padding: spacing.base },
  scaleTitle: { color: colors.textPrimary, ...typography.bodyEmphasis },
  scaleRow: { flexDirection: 'row', justifyContent: 'space-between' },
  scaleDot: {
    alignItems: 'center',
    backgroundColor: colors.bgStack,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  scaleEnds: { flexDirection: 'row', justifyContent: 'space-between' },
  caption: { color: colors.textTertiary, ...typography.caption },
  footnote: { color: colors.textSecondary, lineHeight: 18, ...typography.footnote },
  slider: { height: 48, justifyContent: 'center' },
  sliderRail: { backgroundColor: colors.bgStack, borderRadius: radius.pill, height: 4, left: 10, position: 'absolute', right: 10 },
  sliderFill: { backgroundColor: colors.gold500, borderRadius: radius.pill, height: 4 },
  sliderMarks: { flexDirection: 'row', justifyContent: 'space-between' },
  sliderHit: { alignItems: 'center', height: 44, justifyContent: 'center', width: 20 },
  sliderMark: { backgroundColor: colors.borderStrong, borderRadius: radius.pill, height: 8, width: 8 },
  sliderThumb: { backgroundColor: colors.gold500, borderColor: colors.textPrimary, borderWidth: 2, height: 20, width: 20 },
  dateWheel: { flexDirection: 'row', gap: spacing.sm },
  wheel: { flex: 1, height: ROW_HEIGHT * 3, overflow: 'hidden' },
  wheelContent: { paddingVertical: ROW_HEIGHT },
  wheelRow: { alignItems: 'center', height: ROW_HEIGHT, justifyContent: 'center' },
  wheelText: { color: colors.textTertiary, ...typography.body },
  wheelSelected: { color: colors.textPrimary, ...typography.bodyEmphasis },
  wheelFocus: {
    borderBottomColor: colors.borderStrong,
    borderTopColor: colors.borderStrong,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    height: ROW_HEIGHT,
    left: 0,
    position: 'absolute',
    right: 0,
    top: ROW_HEIGHT,
  },
});
