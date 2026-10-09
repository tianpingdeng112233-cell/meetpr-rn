import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMemo, useState } from 'react';
import { PanResponder, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { PlanDetail } from '@/api/domains/plans';
import { font, radius, spacing, useColors, type Colors } from '@/design';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { dayCode } from '@/domain/plan/sequence';
import type { trainingWeekStrip } from '@/domain/plan/week-strip';
import { getLocale, t } from '@/i18n';

export function TrainingWeekStrip({ plan, strip, onSelect }: {
  plan: PlanDetail;
  strip: ReturnType<typeof trainingWeekStrip>;
  onSelect: (id: string) => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { week, previousDayID, nextDayID } = strip;
  const [rowWidth, setRowWidth] = useState(0);
  const overflow = (week?.calendarCells.length ?? 0) > 7;
  const weekdayFormatter = new Intl.DateTimeFormat(getLocale(), { weekday: 'short', timeZone: 'UTC' });
  const pan = useMemo(() => PanResponder.create({
    // Claim only deliberate horizontal movement; taps and vertical scrolling stay native.
    onMoveShouldSetPanResponderCapture: (_, gesture) =>
      Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
    onPanResponderRelease: (_, gesture) => {
      if (Math.abs(gesture.dx) < 44 || Math.abs(gesture.dx) <= Math.abs(gesture.dy) * 1.5) return;
      const target = gesture.dx > 0 ? previousDayID : nextDayID;
      if (target) onSelect(target);
    },
  }), [nextDayID, previousDayID, onSelect]);
  if (!week) return null;
  const visibleWeight = week.calendarCells.slice(0, 7).reduce((total, cell) => total + (cell.kind === 'rest' ? 0.7 : 1), 0);
  const unitWidth = rowWidth > 0 ? (rowWidth - spacing.point2 * 6) / visibleWeight : spacing.minimumHitTarget;
  const calendar = week.calendarCells.map(cell => {
    const dateValue = new Date(`${cell.date}T00:00:00Z`);
    const weekday = weekdayFormatter.format(dateValue);
    const date = `${dateValue.getUTCMonth() + 1}/${dateValue.getUTCDate()}`;
    const weight = cell.kind === 'rest' ? 0.7 : 1;
    const size = overflow ? { flex: 0, width: unitWidth * weight } : { flex: weight };
    const weekdayText = <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.date, cell.kind === 'training' && cell.isCurrent && styles.currentWeekday]}>{weekday}</Text>;
    if (cell.kind === 'rest') return <View key={`rest-${cell.date}`} accessible
      accessibilityLabel={t('student.trainingWeekStrip.restAccessibility', [weekday])}
      style={[styles.day, styles.restDay, size]}>
      {weekdayText}
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.restLabel}>{t('student.trainingWeekStrip.rest')}</Text>
    </View>;
    const { day, status: dayStatus, isSelected, isCurrent, isBehind } = cell;
    return <Pressable key={day.id} accessibilityRole="button"
      accessibilityLabel={isBehind
        ? t('student.trainingWeekStrip.behindAccessibility', [`${dayCode(day, plan.days)}, ${weekday}`])
        : `${dayCode(day, plan.days)}, ${weekday} ${date}`}
      accessibilityState={{ selected: isSelected }} onPress={() => onSelect(day.id)}
      style={[styles.day, size, isCurrent && styles.currentDay, isSelected && styles.selectedDay]}>
      {weekdayText}
      <MaterialCommunityIcons name={dayStatus === 'done' ? 'check' : isCurrent ? 'circle' : 'circle-outline'}
        size={spacing.base} color={dayStatus === 'done' ? colors.success : isCurrent ? colors.goldText : colors.textMuted} />
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.shortDate, isCurrent && styles.currentDate, isBehind && styles.behind]}>{isBehind ? t('student.trainingWeekStrip.behind') : date}</Text>
    </Pressable>;
  });
  return <View style={styles.strip} {...(!overflow ? pan.panHandlers : {})}>
    <Pressable accessibilityRole="button" accessibilityLabel={t('student.trainingWeekStrip.previous')}
      accessibilityState={{ disabled: !previousDayID }} disabled={!previousDayID}
      onPress={() => { if (previousDayID) onSelect(previousDayID); }} style={styles.arrow}
      {...(overflow ? pan.panHandlers : {})}>
      <MaterialCommunityIcons name="chevron-left" size={spacing.lg} color={previousDayID ? colors.textPrimary : colors.textDisabled} />
    </Pressable>
    <View style={styles.calendar} onLayout={event => setRowWidth(event.nativeEvent.layout.width)}>
      {overflow ? <ScrollView key={week.number} horizontal contentContainerStyle={styles.days}
        showsHorizontalScrollIndicator>
        {calendar}
      </ScrollView> : <View style={styles.days}>{calendar}</View>}
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={t('student.trainingWeekStrip.next')}
      accessibilityState={{ disabled: !nextDayID }} disabled={!nextDayID}
      onPress={() => { if (nextDayID) onSelect(nextDayID); }} style={styles.arrow}
      {...(overflow ? pan.panHandlers : {})}>
      <MaterialCommunityIcons name="chevron-right" size={spacing.lg} color={nextDayID ? colors.textPrimary : colors.textDisabled} />
    </Pressable>
  </View>;
}

const createStyles = (colors: Colors) => StyleSheet.create({
  strip: { flexDirection: 'row', alignItems: 'stretch' },
  arrow: { width: spacing.point28, minHeight: spacing.minimumHitTarget, alignItems: 'center', justifyContent: 'center' },
  calendar: { flex: 1, minWidth: 0 },
  days: { flexDirection: 'row', gap: spacing.point2 },
  day: { flex: 1, minWidth: 0, minHeight: spacing.xxxl, paddingHorizontal: spacing.zero, paddingVertical: spacing.xs, gap: spacing.point2, alignItems: 'center', justifyContent: 'center', borderRadius: radius.control, borderWidth: spacing.point2, borderColor: 'transparent', backgroundColor: colors.surfaceCard },
  restDay: { backgroundColor: colors.bgStack, borderWidth: 0, paddingVertical: spacing.sm, gap: spacing.xs },
  restLabel: { ...font.body(10), color: colors.textMuted, textAlign: 'center', alignSelf: 'stretch' },
  currentDay: { backgroundColor: colors.goldSoft },
  selectedDay: { borderColor: colors.textPrimary },
  shortDate: { ...font.mono(11), color: colors.textPrimary, textAlign: 'center', alignSelf: 'stretch' },
  behind: { ...font.mono(10), color: colors.goldText },
  date: { ...font.body(10), color: colors.textMuted, textAlign: 'center', alignSelf: 'stretch' },
  currentDate: { color: colors.goldText },
  currentWeekday: { ...font.body(10, 'bold'), color: colors.goldText },
});
