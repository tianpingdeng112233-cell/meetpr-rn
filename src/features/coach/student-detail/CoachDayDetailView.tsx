import { ScrollView, View } from 'react-native';
import { Screen, radius, useColors } from '@/design';
import { Ionicons } from '@expo/vector-icons';
import type { SetLog } from '@/api/domains/sets';
import type { ExecutionDay } from '@/domain/coach/detail-week';
import { t } from '@/i18n';
import { Capsule, Copy, Empty, SectionCard, styles } from './components';
import { dateText, deviceLocale } from './presentation';

function ReadOnlySet({ log }: { log: SetLog }) {
  const colors = useColors();
  const number = (value: string) => new Intl.NumberFormat(deviceLocale(), { maximumFractionDigits: 2 }).format(Number(value));
  const metrics = [
    { title: t('coach.videoFeedback.weight'), value: `${number(log.weight_kg)} kg` },
    { title: t('coach.videoFeedback.reps'), value: String(log.reps) },
    { title: t('coach.videoFeedback.rpe'), value: log.rpe == null ? t('coach.profile.notProvided') : number(log.rpe) },
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
export function CoachDayDetailView({ day, exerciseName, onClose }: { day: ExecutionDay; exerciseName: (id: string) => string; onClose: () => void }) {
  return <Screen><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.row}><Capsule label={t('coach.detail.back')} onPress={onClose} /><Copy size={16} bold style={{ flex: 1 }}>{dateText(day.date, true)}</Copy></View>
    {day.planDay?.exercises.length ? day.planDay.exercises.map((exercise) => {
      const logs = day.logs.filter((log) => log.plan_exercise_id === exercise.id);
      return <SectionCard key={exercise.id}>
        <Copy size={17} bold>{exerciseName(exercise.exercise_id)}</Copy>
        <Copy size={12} tone="textTertiary">{t('coach.execution.loggedSetsFraction %lld %lld', [logs.length, exercise.sets.length])}</Copy>
        {logs.length ? logs.map((log) => <ReadOnlySet key={log.id} log={log} />) : <Copy tone="textTertiary">{t('coach.execution.noLoggedSets')}</Copy>}
      </SectionCard>;
    }) : day.logs.length ? <SectionCard><Copy size={17} bold>{t('coach.execution.freeLog')}</Copy>{day.logs.map((log) => <ReadOnlySet key={log.id} log={log} />)}</SectionCard> : null}
    {!day.planDay?.exercises.length && !day.logs.length && <Empty title={t('coach.execution.restDay')} icon="moon-outline" />}
  </ScrollView></Screen>;
}
