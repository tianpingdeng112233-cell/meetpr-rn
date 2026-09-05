import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PlanDetail } from '@/api/domains/plans';
import type { FeedbackItem } from '@/api/domains/feedback';
import { type ExecutionDay, localDay, makeOverview } from '@/domain/coach/detail-week';
import { useColors } from '@/design';
import { cursorDay, sequenceDays } from '@/domain/plan/sequence';
import { t } from '@/i18n';
import type { ReadinessRowState } from './plan-card-state';
import { Badge, Capsule, Copy, SectionCard, styles } from './components';
import { deviceLocale, muscleLabel, relativeText } from './presentation';

export function OverviewSection({ plan, days, feedback, readiness, now, exerciseName, onDay, onSection }: {
  plan: PlanDetail | null; days: ExecutionDay[]; feedback: FeedbackItem[]; readiness: ReadinessRowState; now: Date;
  exerciseName: (id: string) => string; onDay: (day: ExecutionDay) => void; onSection: (section: 'feedback' | 'videos') => void;
}) {
  const colors = useColors();
  const trainingDays = days.filter((day) => day.planDay?.exercises.length);
  const ordered = sequenceDays(plan?.days ?? []);
  const planWeekIndex = (cursorDay(ordered) ?? ordered[ordered.length - 1])?.week_number ?? 1;
  const latest = makeOverview(days, feedback).latestFeedback;
  const severity = ['coach.shared.severity.light', 'coach.shared.severity.moderate', 'coach.shared.severity.heavy'] as const;
  return <View style={styles.stack}>
    <SectionCard>
      <View style={styles.between}><Copy size={11} bold tone="gold500">{t('coach.detail.weekTraining')}</Copy><Copy size={11} tone="textTertiary">{t('coach.detail.tapDayForDetails')}</Copy></View>
      {!trainingDays.length && <Copy>{t('coach.detail.noTrainingThisWeek')}</Copy>}
      {trainingDays.map((day, index) => {
        const planned = day.planDay!;
        const completed = day.logs.some((log) => log.completed);
        const badge = planned.shifted_to_date ? t('coach.detail.adjusted') : index === 0 && (plan?.total_shift_days ?? 0) > 0 ? t('coach.studentDetail.shiftedDays %lld', [plan!.total_shift_days]) : null;
        return <Pressable key={planned.id} testID={`coach.detail.day.${localDay(day.date)}`} accessibilityRole="button" onPress={() => onDay(day)} style={({ pressed }) => [styles.row, { paddingVertical: 9 }, pressed && { transform: [{ scale: 0.97 }] }]}>
          <View style={{ flex: 1, gap: 5 }}><Copy size={14} bold>{`W${planWeekIndex}D${index + 1} · ${exerciseName(planned.exercises[0].exercise_id)}`}</Copy>
            <Copy size={12} tone="textTertiary">{new Intl.DateTimeFormat(deviceLocale(), { month: 'numeric', day: 'numeric', weekday: 'short' }).format(day.date)}</Copy>
            {badge && <View style={{ alignSelf: 'flex-start' }}><Badge label={badge} filled /></View>}
          </View>
          <Copy size={12} tone={completed ? 'success' : 'textTertiary'}>{t(completed ? 'coach.detail.completed' : localDay(day.date) === localDay(now) ? 'coach.detail.today' : 'coach.detail.notStarted')}</Copy>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </Pressable>;
      })}
    </SectionCard>
    <SectionCard><Copy size={11} bold tone="textTertiary">{t('coach.detail.todayStatus')}</Copy>
      {readiness.kind === 'loaded' ? <>
        <Copy size={15} bold>{t('coach.shared.readiness.scales %lld %lld %lld', [readiness.checkin.sleep_quality, readiness.checkin.mood, readiness.checkin.stress])}</Copy>
        <Copy size={12} tone="textTertiary">{readiness.checkin.muscle_fatigue.length ? t('coach.shared.readiness.fatigue', [readiness.checkin.muscle_fatigue.map((entry) => `${muscleLabel(entry.muscle_group)}(${t(severity[entry.severity - 1])})`).join(' · ')]) : t('coach.shared.readiness.noMuscleFatigue')}</Copy>
      </> : readiness.kind === 'notFiled' ? <View style={styles.between}><Copy size={15} bold>{t('coach.detail.todayNotFiled')}</Copy><Capsule label={t('coach.detail.remindToFile')} disabled /></View> : <Copy size={15} bold>{t('coach.detail.statusUnavailable')}</Copy>}
    </SectionCard>
    <Pressable accessibilityRole="button" onPress={() => onSection(latest ? 'feedback' : 'videos')} style={({ pressed }) => pressed && { transform: [{ scale: 0.97 }] }}>
      <SectionCard><Copy size={11} bold tone="textTertiary">{t('coach.detail.recentFeedback')}</Copy><Copy size={15} bold numberOfLines={1}>{latest?.text ?? t('coach.detail.noFeedback')}</Copy><Copy size={12} tone="textTertiary">{latest ? t('coach.detail.feedbackMeta', [relativeText(latest.posted_at, now)]) : t('coach.detail.writeFirstFeedback')}</Copy></SectionCard>
    </Pressable>
  </View>;
}
