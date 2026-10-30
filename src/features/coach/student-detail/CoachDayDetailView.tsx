import { ScrollView, View } from 'react-native';
import { Screen, radius, useColors } from '@/design';
import { Ionicons } from '@expo/vector-icons';
import type { SetLog } from '@/api/domains/sets';
import type { PlanDay } from '@/api/domains/plans';
import { executionExercises, isExecutionDayComplete, type ExecutionDay } from '@/domain/coach/detail-week';
import { dayCode } from '@/domain/plan/sequence';
import { t } from '@/i18n';
import { Capsule, Copy, Empty, SectionCard, styles } from './components';
import { dateText, deviceLocale } from './presentation';

function ReadOnlySet({ log }: { log: SetLog }) {
  const colors = useColors();
  const number = (value: string) => new Intl.NumberFormat(deviceLocale(), { maximumFractionDigits: 2 }).format(Number(value));
  const metrics = [
    { title: t('coach.videoFeedback.weight'), value: `${number(log.weight_kg)} kg` },
    { title: t('coach.videoFeedback.reps'), value: String(log.reps) },
    { title: log.actual_rir != null ? 'RIR' : t('coach.videoFeedback.rpe'), value: log.actual_rir != null ? String(log.actual_rir) : log.rpe == null ? t('coach.profile.notProvided') : number(log.rpe) },
  ];
  return <View accessible style={[styles.row, { padding: 10, borderRadius: radius.inset, backgroundColor: colors.bgStack }]}>
    <Copy mono size={12} tone="textTertiary" style={{ width: 32 }}>{`#${log.set_index + 1}`}</Copy>
    {metrics.map((metric) => <View key={metric.title} style={{ flex: 1, gap: 2 }}>
      <Copy size={10} tone="textTertiary">{metric.title}</Copy>
      <Copy size={14} bold numberOfLines={1} adjustsFontSizeToFit>{metric.value}</Copy>
    </View>)}
    <Ionicons name={log.completed ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={log.completed ? colors.success : colors.textTertiary} accessibilityLabel={t(log.completed ? 'coach.detail.completed' : 'coach.detail.notStarted')} />
  </View>;
}
export function CoachDayDetailView({ day, planDays, exerciseName, onClose }: { day: ExecutionDay; planDays: readonly PlanDay[]; exerciseName: (id: string) => string; onClose: () => void }) {
  const cards = executionExercises(day);
  return <Screen><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.row}><Capsule label={t('coach.detail.back')} onPress={onClose} /><View style={{ flex: 1, gap: 5 }}>
      <Copy size={16} bold>{dateText(day.date, true)}</Copy>
      {!!day.planDay?.exercises.length && <Copy size={12} tone="textTertiary">{`${dayCode(day.planDay, planDays)} · ${t(isExecutionDayComplete(day) ? 'coach.detail.completed' : 'coach.detail.notStarted')}`}</Copy>}
    </View></View>
    {day.planDay?.exercises.length ? cards.planned.map(({ exercise, prescribed, extra }) => {
      return <SectionCard key={exercise.id}>
        <Copy size={17} bold>{exerciseName(exercise.exercise_id)}</Copy>
        <Copy size={12} tone="textTertiary">{t('coach.execution.loggedSetsFraction %lld %lld', [prescribed.length, exercise.sets.length])}</Copy>
        {prescribed.map((log) => <ReadOnlySet key={log.id} log={log} />)}
        {!!extra.length && <Copy size={12} tone="textTertiary">{t('coach.execution.addedByStudent')}</Copy>}
        {extra.map((log) => <ReadOnlySet key={log.id} log={log} />)}
        {!prescribed.length && !extra.length && <Copy tone="textTertiary">{t('coach.execution.noLoggedSets')}</Copy>}
      </SectionCard>;
    }) : day.logs.length ? <SectionCard><Copy size={17} bold>{t('coach.execution.freeLog')}</Copy>{day.logs.map((log) => <ReadOnlySet key={log.id} log={log} />)}</SectionCard> : null}
    {!!day.planDay?.exercises.length && cards.added.map(({ exerciseId, logs }) => <SectionCard key={exerciseId}>
      <Copy size={17} bold>{exerciseName(exerciseId)}</Copy>
      <Copy size={12} tone="textTertiary">{t('coach.execution.studentAddedSets %lld', [logs.length])}</Copy>
      {logs.map(log => <ReadOnlySet key={log.id} log={log} />)}
    </SectionCard>)}
    {!day.planDay?.exercises.length && !day.logs.length && <Empty title={t('coach.execution.restDay')} icon="moon-outline" />}
  </ScrollView></Screen>;
}
