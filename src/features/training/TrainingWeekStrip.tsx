import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMemo } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import type { PlanDetail } from '@/api/domains/plans';
import { font, radius, spacing, useColors, type Colors } from '@/design';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { recommendedDateText } from '@/domain/plan/presentation';
import { dayCode, recommendedDate } from '@/domain/plan/sequence';
import type { trainingWeekStrip } from '@/domain/plan/week-strip';
import { t } from '@/i18n';

export function TrainingWeekStrip({ plan, strip, onSelect }: {
  plan: PlanDetail;
  strip: ReturnType<typeof trainingWeekStrip>;
  onSelect: (id: string) => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { week, previousDayID, nextDayID } = strip;
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
  return <View style={styles.strip} {...pan.panHandlers}>
    <View style={styles.header}>
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
    <View style={styles.days}>
      {week.cells.map(({ day, ordinal, status: dayStatus, isSelected, isCurrent }) => {
        const date = recommendedDateText(recommendedDate(plan, day));
        return <Pressable key={day.id} accessibilityRole="button"
          accessibilityLabel={`${dayCode(day, plan.days)} ${date}`}
          accessibilityState={{ selected: isSelected }} onPress={() => onSelect(day.id)}
          style={[styles.day, isCurrent && styles.currentDay, isSelected && styles.selectedDay]}>
          <MaterialCommunityIcons name={dayStatus === 'done' ? 'check' : 'circle-outline'}
            size={spacing.base} color={dayStatus === 'done' ? colors.success : isCurrent ? colors.goldText : colors.textMuted} />
          <Text style={styles.ordinal}>D{ordinal}</Text>
          <Text style={[styles.date, isCurrent && styles.currentDate]}>{date}</Text>
        </Pressable>;
      })}
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
  days: { flexDirection: 'row', gap: spacing.xs },
  day: { flex: 1, minWidth: 0, minHeight: spacing.minimumHitTarget, paddingHorizontal: spacing.point2, paddingVertical: spacing.sm, gap: spacing.xs, alignItems: 'center', justifyContent: 'center', borderRadius: radius.control, borderWidth: spacing.point2, borderColor: 'transparent', backgroundColor: colors.surfaceCard },
  currentDay: { backgroundColor: colors.goldSoft },
  selectedDay: { borderColor: colors.textPrimary },
  ordinal: { ...font.mono(11, 'semibold'), color: colors.textPrimary },
  date: { ...font.body(10), color: colors.textMuted, textAlign: 'center', alignSelf: 'stretch' },
  currentDate: { ...font.body(10, 'bold'), color: colors.goldText },
  indicators: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.point6, paddingVertical: spacing.xs },
  dot: { width: spacing.point6, height: spacing.point6, borderRadius: radius.pill, backgroundColor: colors.borderStrong },
  selectedDot: { width: spacing.point18, backgroundColor: colors.textPrimary },
});
