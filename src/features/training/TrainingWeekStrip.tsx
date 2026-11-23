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

export function TrainingWeekStrip({ plan, strip, onSelect, preview = false, onPreviousPlan, onNextPlan }: {
  preview?: boolean;
  onPreviousPlan?: () => void;
  onNextPlan?: () => void;
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
      else if (gesture.dx > 0) onPreviousPlan?.(); else onNextPlan?.();
    },
  }), [nextDayID, previousDayID, onSelect, onPreviousPlan, onNextPlan]);
  if (!week) return null;
  const visibleWeight = week.calendarCells.slice(0, 7).reduce((total, cell) => total + (1), 0);
  const unitWidth = rowWidth > 0 ? (rowWidth - spacing.point2 * 6) / visibleWeight : spacing.minimumHitTarget;
  // The inline arrows take 2 × 28dp from the row, so narrow screens get a smaller circle; the ring
  // (4dp outside the circle) must still clear the neighbouring cell.
  const circle = Math.max(24, Math.min(36, Math.floor(unitWidth - 5)));
  const calendar = week.calendarCells.map(cell => {
    const dateValue = new Date(`${cell.date}T00:00:00Z`);
    const weekday = weekdayFormatter.format(dateValue);
    const date = `${dateValue.getUTCMonth() + 1}/${dateValue.getUTCDate()}`;
    const weight = 1;
    const size = overflow ? { flex: 0, width: unitWidth * weight } : { flex: weight };
    const weekdayText = <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.date, cell.kind === 'training' && cell.isSelected && !preview && styles.currentWeekday]}>{weekday}</Text>;
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
      <View style={{ height: circle + 8, justifyContent: 'center' }}>
        <View testID={`week-day-circle-${day.id}`} style={{ width: circle, height: circle, borderRadius: circle / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: preview ? colors.bgStack : scheme === 'dark' ? colors.textPrimary : colors.gold200 }}>
          {isSelected ? <View testID="week-day-ring" pointerEvents="none" style={{ position: 'absolute', top: -4, right: -4, bottom: -4, left: -4, borderRadius: circle / 2 + 4, borderWidth: 2, borderColor: preview ? colors.textMuted : colors.gold500 }} /> : null}
          <Text style={{ ...font.mono(circle >= 30 ? 15 : 13, 'semibold'), color: preview ? colors.textSecondary : scheme === 'dark' ? colors.bgBase : colors.gold900 }}>{dateValue.getUTCDate()}</Text>
          {!preview && dayStatus === 'done' ? <View style={{ position: 'absolute', right: -2, bottom: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.success, borderWidth: 2, borderColor: colors.bgBase, alignItems: 'center', justifyContent: 'center' }}><MaterialCommunityIcons name="check" size={11} color={colors.inkOnCTAFill} /></View> : null}
        </View>
      </View>
    </Pressable>;
  });
  return <View style={styles.strip} {...(!overflow ? pan.panHandlers : {})}>
    <Pressable accessibilityRole="button" accessibilityLabel={t('student.trainingWeekStrip.previous')}
      accessibilityState={{ disabled: !(previousDayID || onPreviousPlan) }} disabled={!(previousDayID || onPreviousPlan)}
      onPress={() => { if (previousDayID) onSelect(previousDayID); else onPreviousPlan?.(); }} style={[styles.arrow, { paddingLeft: spacing.base }]}
      {...(overflow ? pan.panHandlers : {})}>
      <MaterialCommunityIcons name="chevron-left" size={spacing.lg} color={previousDayID || onPreviousPlan ? colors.textPrimary : colors.textDisabled} />
    </Pressable>
    <View style={styles.calendar} onLayout={event => setRowWidth(event.nativeEvent.layout.width)}>
      {overflow ? <ScrollView key={week.number} horizontal contentContainerStyle={styles.days}
        showsHorizontalScrollIndicator>
        {calendar}
      </ScrollView> : <View style={styles.days}>{calendar}</View>}
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={t('student.trainingWeekStrip.next')}
      accessibilityState={{ disabled: !(nextDayID || onNextPlan) }} disabled={!(nextDayID || onNextPlan)}
      onPress={() => { if (nextDayID) onSelect(nextDayID); else onNextPlan?.(); }} style={[styles.arrow, { paddingRight: spacing.base }]}
      {...(overflow ? pan.panHandlers : {})}>
      <MaterialCommunityIcons name="chevron-right" size={spacing.lg} color={nextDayID || onNextPlan ? colors.textPrimary : colors.textDisabled} />
    </Pressable>
  </View>;
}

const createStyles = (colors: Colors) => StyleSheet.create({
  strip: { flexDirection: 'row', alignItems: 'stretch' },
  // The parent bleeds the strip to the screen edges: 16dp of page gutter plus the 28dp arrow column
  // (iOS TrainingWeekArrow) make one 44dp-wide target that lies fully inside its parents.
  arrow: { width: spacing.base + spacing.point28, minHeight: spacing.xxxl, alignItems: 'center', justifyContent: 'center' },
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
