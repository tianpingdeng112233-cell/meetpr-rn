import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMemo, useState } from 'react';
import { PanResponder, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { PlanDetail } from '@/api/domains/plans';
import { font, radius, spacing, useColors, type Colors } from '@/design';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { dayCode } from '@/domain/plan/sequence';
import type { trainingWeekStrip } from '@/domain/plan/week-strip';
import { useTheme } from '@/design/theme';
import { getLocale, t } from '@/i18n';

export function TrainingWeekStrip({ plan, strip, onSelect }: {
  plan: PlanDetail;
  strip: ReturnType<typeof trainingWeekStrip>;
  onSelect: (id: string) => void;
}) {
  const colors = useColors();
  const { scheme } = useTheme();
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
  const visibleWeight = week.calendarCells.slice(0, 7).reduce((total, cell) => total + (1), 0);
  const unitWidth = rowWidth > 0 ? (rowWidth - spacing.point2 * 6) / visibleWeight : spacing.minimumHitTarget;
  const calendar = week.calendarCells.map(cell => {
    const dateValue = new Date(`${cell.date}T00:00:00Z`);
    const weekday = weekdayFormatter.format(dateValue);
    const date = `${dateValue.getUTCMonth() + 1}/${dateValue.getUTCDate()}`;
    const weight = 1;
    const size = overflow ? { flex: 0, width: unitWidth * weight } : { flex: weight };
    const weekdayText = <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.date, cell.kind === 'training' && cell.isSelected && styles.currentWeekday]}>{weekday}</Text>;
    if (cell.kind === 'rest') return <View key={`rest-${cell.date}`} accessible
      accessibilityLabel={t('student.trainingWeekStrip.restAccessibility', [weekday])}
      style={[styles.day, styles.restDay, size]}>
      {weekdayText}
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.restLabel}>{dateValue.getUTCDate()}</Text>
    </View>;
    const { day, status: dayStatus, isSelected, isBehind } = cell;
    return <Pressable key={day.id} accessibilityRole="button"
      accessibilityLabel={isBehind
        ? t('student.trainingWeekStrip.behindAccessibility', [`${dayCode(day, plan.days)}, ${weekday}`])
        : `${dayCode(day, plan.days)}, ${weekday} ${date}`}
      accessibilityState={{ selected: isSelected }} onPress={() => onSelect(day.id)}
      style={[styles.day, size]}>
      {weekdayText}
      <View style={{ padding: 2, borderRadius: 22, borderWidth: 2, borderColor: isSelected ? colors.gold500 : 'transparent' }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: scheme === 'dark' ? colors.textPrimary : colors.gold200 }}>
          <Text style={{ ...font.mono(15, 'semibold'), color: scheme === 'dark' ? colors.bgBase : colors.gold900 }}>{dateValue.getUTCDate()}</Text>
          {dayStatus === 'done' ? <View style={{ position: 'absolute', right: -2, bottom: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.success, borderWidth: 2, borderColor: colors.bgBase, alignItems: 'center', justifyContent: 'center' }}><MaterialCommunityIcons name="check" size={11} color={colors.inkOnCTAFill} /></View> : null}
        </View>
      </View>
    </Pressable>;
  });
  return <View style={styles.strip} {...(!overflow ? pan.panHandlers : {})}>
    <Pressable accessibilityRole="button" accessibilityLabel={t('student.trainingWeekStrip.previous')}
      accessibilityState={{ disabled: !previousDayID }} disabled={!previousDayID}
      onPress={() => { if (previousDayID) onSelect(previousDayID); }} style={[styles.arrow, { left: -spacing.md }]}
      {...(overflow ? pan.panHandlers : {})}>
      <MaterialCommunityIcons name="chevron-left" size={spacing.md} color={previousDayID ? colors.textPrimary : colors.textDisabled} />
    </Pressable>
    <View style={styles.calendar} onLayout={event => setRowWidth(event.nativeEvent.layout.width)}>
      {overflow ? <ScrollView key={week.number} horizontal contentContainerStyle={styles.days}
        showsHorizontalScrollIndicator>
        {calendar}
      </ScrollView> : <View style={styles.days}>{calendar}</View>}
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={t('student.trainingWeekStrip.next')}
      accessibilityState={{ disabled: !nextDayID }} disabled={!nextDayID}
      onPress={() => { if (nextDayID) onSelect(nextDayID); }} style={[styles.arrow, { right: -spacing.md }]}
      {...(overflow ? pan.panHandlers : {})}>
      <MaterialCommunityIcons name="chevron-right" size={spacing.md} color={nextDayID ? colors.textPrimary : colors.textDisabled} />
    </Pressable>
  </View>;
}

const createStyles = (colors: Colors) => StyleSheet.create({
  strip: { flexDirection: 'row', alignItems: 'stretch' },
  arrow: { position: 'absolute', top: 0, bottom: 0, width: spacing.md, minHeight: spacing.minimumHitTarget, alignItems: 'center', justifyContent: 'center' },
  calendar: { flex: 1, minWidth: 0 },
  days: { flexDirection: 'row', gap: spacing.point2 },
  day: { flex: 1, minWidth: 0, minHeight: spacing.xxxl, paddingHorizontal: spacing.zero, paddingVertical: spacing.xs, gap: spacing.point2, alignItems: 'center', justifyContent: 'center', borderRadius: radius.control, backgroundColor: colors.bgBase },
  statusSlot: { height: spacing.base, alignItems: 'center', justifyContent: 'center' },
  restDay: { backgroundColor: colors.bgBase, borderWidth: 0, paddingVertical: spacing.sm, gap: spacing.xs },
  restLabel: { ...font.body(10), color: colors.textMuted, textAlign: 'center', alignSelf: 'stretch' },
  currentDay: { backgroundColor: colors.goldSoft },
  selectedDay: { borderColor: colors.textPrimary },
  shortDate: { ...font.mono(11), color: colors.textPrimary, textAlign: 'center', alignSelf: 'stretch' },
  behind: { ...font.mono(10), color: colors.goldText },
  date: { ...font.body(11), letterSpacing: 0.7, color: colors.textMuted, textAlign: 'center', alignSelf: 'stretch' },
  currentDate: { color: colors.goldText },
  currentWeekday: { ...font.body(10, 'bold'), color: colors.goldText },
});
