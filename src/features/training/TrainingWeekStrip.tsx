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
  const status = t(week.status === 'current' ? 'student.trainingWeekStrip.current'
    : week.status === 'upcoming' ? 'student.trainingWeekStrip.upcoming' : 'student.trainingWeekStrip.completed');
  const visibleWeight = week.calendarCells.slice(0, 7).reduce((total, cell) => total + (cell.kind === 'rest' ? 0.7 : 1), 0);
  const unitWidth = rowWidth > 0 ? (rowWidth - spacing.point2 * 6) / visibleWeight : spacing.minimumHitTarget;
  const calendar = week.calendarCells.map(cell => {
    const dateValue = new Date(`${cell.date}T00:00:00Z`);
    const weekday = weekdayFormatter.format(dateValue);
    const date = `${dateValue.getUTCMonth() + 1}/${dateValue.getUTCDate()}`;
    const weight = cell.kind === 'rest' ? 0.7 : 1;
    const size = overflow ? { flex: 0, width: unitWidth * weight } : { flex: weight };
    const weekdayText = <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.date}>{weekday}</Text>;
    if (cell.kind === 'rest') return <View key={`rest-${cell.date}`} accessible
      accessibilityLabel={t('student.trainingWeekStrip.restAccessibility', [`${weekday} ${date}`])}
      style={[styles.day, styles.restDay, size]}>
      {weekdayText}
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.restLabel}>{t('student.trainingWeekStrip.rest')}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.date}>{date}</Text>
    </View>;
    const { day, ordinal, status: dayStatus, isSelected, isCurrent } = cell;
    return <Pressable key={day.id} accessibilityRole="button"
      accessibilityLabel={`${dayCode(day, plan.days)} ${weekday} ${date}`}
      accessibilityState={{ selected: isSelected }} onPress={() => onSelect(day.id)}
      style={[styles.day, size, isCurrent && styles.currentDay, isSelected && styles.selectedDay]}>
      {weekdayText}
      <MaterialCommunityIcons name={dayStatus === 'done' ? 'check' : 'circle-outline'}
        size={spacing.base} color={dayStatus === 'done' ? colors.success : isCurrent ? colors.goldText : colors.textMuted} />
      <Text style={styles.ordinal}>D{ordinal}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.date, isCurrent && styles.currentDate]}>{date}</Text>
    </Pressable>;
  });
  return <View style={styles.strip} {...(!overflow ? pan.panHandlers : {})}>
    <View style={styles.header} {...(overflow ? pan.panHandlers : {})}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('student.trainingWeekStrip.previous')}
        accessibilityState={{ disabled: !previousDayID }} disabled={!previousDayID}
        onPress={() => { if (previousDayID) onSelect(previousDayID); }} style={styles.arrow}>
        <MaterialCommunityIcons name="chevron-left" size={spacing.lg} color={previousDayID ? colors.textPrimary : colors.textDisabled} />
      </Pressable>
      <View style={styles.heading}>
        <Text style={styles.week}>W{week.number}</Text>
        <Text style={[styles.badge, week.status === 'current' && styles.currentBadge]}>{status}</Text>
        <Text style={styles.count}>{week.completed} / {week.cells.length}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={t('student.trainingWeekStrip.next')}
        accessibilityState={{ disabled: !nextDayID }} disabled={!nextDayID}
        onPress={() => { if (nextDayID) onSelect(nextDayID); }} style={styles.arrow}>
        <MaterialCommunityIcons name="chevron-right" size={spacing.lg} color={nextDayID ? colors.textPrimary : colors.textDisabled} />
      </Pressable>
    </View>
    <View onLayout={event => setRowWidth(event.nativeEvent.layout.width)}>
      {overflow ? <ScrollView key={week.number} horizontal contentContainerStyle={styles.days}
        showsHorizontalScrollIndicator>
        {calendar}
      </ScrollView> : <View style={styles.days}>{calendar}</View>}
    </View>
    {strip.indicators.length ? <View style={styles.indicators} accessible={false} importantForAccessibility="no-hide-descendants">
      {strip.indicators.map(indicator => <View key={indicator.number} style={[
        styles.dot,
        indicator.isCurrent && { backgroundColor: colors.gold500 },
        indicator.isSelected && styles.selectedDot,
      ]} />)}
    </View> : null}
  </View>;
}

const createStyles = (colors: Colors) => StyleSheet.create({
  strip: { gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center' },
  arrow: { width: spacing.minimumHitTarget, minHeight: spacing.minimumHitTarget, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  week: { ...font.display(14), color: colors.textPrimary },
  badge: { ...font.body(11, 'semibold'), color: colors.textSecondary, backgroundColor: colors.bgStack, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.point2, flexShrink: 1, textAlign: 'center' },
  currentBadge: { color: colors.goldText, backgroundColor: colors.goldSoft },
  count: { ...font.mono(11), color: colors.textMuted },
  days: { flexDirection: 'row', gap: spacing.point2 },
  day: { flex: 1, minWidth: 0, minHeight: spacing.minimumHitTarget, paddingHorizontal: spacing.zero, paddingVertical: spacing.sm, gap: spacing.xs, alignItems: 'center', justifyContent: 'center', borderRadius: radius.control, borderWidth: spacing.point2, borderColor: 'transparent', backgroundColor: colors.surfaceCard },
  restDay: { backgroundColor: colors.bgStack, borderWidth: 0, paddingVertical: spacing.sm + spacing.point2, justifyContent: 'space-between' },
  restLabel: { ...font.body(10), color: colors.textMuted, textAlign: 'center', alignSelf: 'stretch' },
  currentDay: { backgroundColor: colors.goldSoft },
  selectedDay: { borderColor: colors.textPrimary },
  ordinal: { ...font.mono(11, 'semibold'), color: colors.textPrimary },
  date: { ...font.body(10), color: colors.textMuted, textAlign: 'center', alignSelf: 'stretch' },
  currentDate: { ...font.body(10, 'bold'), color: colors.goldText },
  indicators: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.point6, paddingVertical: spacing.xs },
  dot: { width: spacing.point6, height: spacing.point6, borderRadius: radius.pill, backgroundColor: colors.borderStrong },
  selectedDot: { width: spacing.point18, backgroundColor: colors.textPrimary },
});
