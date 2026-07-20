import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, colors, radius, spacing, typography } from '@/design';

import type { CalendarDayStatus } from './model';
import { addDays, localDateText, parseLocalDate } from './policy';

type Props = {
  selectedDate: string;
  today: string;
  statusForDate: (date: string) => CalendarDayStatus;
  onSelectDate: (date: string) => void;
};

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'] as const;

function mondayFor(dateText: string): string {
  const date = parseLocalDate(dateText);
  const offset = (date.getDay() + 6) % 7;
  return addDays(dateText, -offset);
}

function monthGrid(dateText: string): (string | null)[] {
  const selected = parseLocalDate(dateText);
  const first = new Date(selected.getFullYear(), selected.getMonth(), 1);
  const leading = (first.getDay() + 6) % 7;
  const count = new Date(selected.getFullYear(), selected.getMonth() + 1, 0).getDate();
  return [
    ...Array.from<null>({ length: leading }).fill(null),
    ...Array.from({ length: count }, (_, index) =>
      localDateText(new Date(selected.getFullYear(), selected.getMonth(), index + 1)),
    ),
  ];
}

function statusColor(status: CalendarDayStatus): string {
  switch (status) {
    case 'notStarted':
      return colors.brandRed;
    case 'partial':
      return colors.amber;
    case 'complete':
      return colors.green;
    case 'noPlan':
      return colors.fgTertiary;
  }
}

export function TrainingCalendarView({
  onSelectDate,
  selectedDate,
  statusForDate,
  today,
}: Props) {
  const [mode, setMode] = useState<'week' | 'month'>('week');
  const [anchorDate, setAnchorDate] = useState(selectedDate);
  const dates = useMemo(
    () =>
      mode === 'week'
        ? Array.from({ length: 7 }, (_, index) => addDays(mondayFor(anchorDate), index))
        : monthGrid(anchorDate),
    [anchorDate, mode],
  );
  const anchor = parseLocalDate(anchorDate);
  const title = `${anchor.getFullYear()}年 ${anchor.getMonth() + 1}月`;

  const move = (amount: number) => {
    const next = parseLocalDate(anchorDate);
    if (mode === 'week') next.setDate(next.getDate() + amount * 7);
    else next.setMonth(next.getMonth() + amount, 1);
    setAnchorDate(localDateText(next));
  };

  return (
    <Card style={styles.card}>
      <View style={styles.topRow}>
        <Pressable accessibilityLabel="上一段日期" onPress={() => move(-1)}>
          <MaterialCommunityIcons color={colors.fgSecondary} name="chevron-left" size={26} />
        </Pressable>
        <Text style={styles.month}>{title}</Text>
        <Pressable accessibilityLabel="下一段日期" onPress={() => move(1)}>
          <MaterialCommunityIcons color={colors.fgSecondary} name="chevron-right" size={26} />
        </Pressable>
        <View style={styles.segment}>
          {(['week', 'month'] as const).map((value) => (
            <Pressable
              key={value}
              onPress={() => setMode(value)}
              style={[styles.segmentButton, mode === value && styles.segmentSelected]}>
              <Text style={[styles.segmentText, mode === value && styles.segmentTextSelected]}>
                {value === 'week' ? '周' : '月'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((day) => (
          <Text key={day} style={styles.weekday}>{day}</Text>
        ))}
      </View>
      <View style={styles.grid}>
        {dates.map((date, index) => {
          if (!date) return <View key={`blank-${index}`} style={styles.dayCell} />;
          const selected = date === selectedDate;
          const isToday = date === today;
          return (
            <Pressable
              key={date}
              accessibilityLabel={`${date} ${statusForDate(date)}`}
              onPress={() => {
                setAnchorDate(date);
                onSelectDate(date);
              }}
              style={styles.dayCell}>
              <View
                style={[
                  styles.dayCircle,
                  selected && styles.selectedDay,
                  !selected && isToday && styles.today,
                ]}>
                <Text style={[styles.dayText, selected && styles.selectedDayText]}>
                  {parseLocalDate(date).getDate()}
                </Text>
              </View>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: statusColor(statusForDate(date)) },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, padding: spacing.md },
  topRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  month: { color: colors.fgPrimary, flex: 1, ...typography.bodyEmphasis },
  segment: {
    backgroundColor: colors.surface3,
    borderRadius: radius.md,
    flexDirection: 'row',
    padding: 2,
  },
  segmentButton: { borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 5 },
  segmentSelected: { backgroundColor: colors.borderStrong },
  segmentText: { color: colors.fgSecondary, ...typography.footnote },
  segmentTextSelected: { color: colors.fgPrimary },
  weekdayRow: { flexDirection: 'row' },
  weekday: { color: colors.fgTertiary, flex: 1, textAlign: 'center', ...typography.caption },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { alignItems: 'center', height: 48, justifyContent: 'center', width: '14.2857%' },
  dayCircle: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: radius.pill,
    borderWidth: 2,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  selectedDay: { backgroundColor: colors.brandRedSoft, borderColor: colors.brandRed },
  today: { borderColor: colors.green },
  dayText: { color: colors.fgPrimary, ...typography.footnote },
  selectedDayText: { color: colors.fgPrimary, fontWeight: '700' },
  statusDot: { borderRadius: radius.pill, height: 4, marginTop: 2, width: 4 },
});
