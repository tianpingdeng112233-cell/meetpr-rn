import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, Screen, radius, spacing, useColors } from '@/design';
import { t } from '@/i18n';
import { makeSummary, type WeekCell, type WeekGroup } from '@/domain/coach/week-overview';
import { makeTodoItems, type TodoItem } from '@/domain/coach/todo-list';
import { sameDay } from '@/domain/coach/calendar';
import { useCoachNow } from '../CoachNowProvider';
import { useCoachData } from '../CoachDataProvider';
import { Copy, EmptyState, Icon, pageContent, rowStyle } from '../ui';
const groupTone = { active: 'success', idle: 'textDisabled', attention: 'danger' } as const;
const groupKey = { active: 'coach.today.activeAsPlanned', idle: 'coach.today.notStarted', attention: 'coach.today.needsAttention' } as const;
const weekdayKeys = ['coach.today.weekday.mon', 'coach.today.weekday.tue', 'coach.today.weekday.wed', 'coach.today.weekday.thu', 'coach.today.weekday.fri', 'coach.today.weekday.sat', 'coach.today.weekday.sun'] as const;
export function CoachDashboardScreen() {
  const { rows, applications, videos, conversations, acceptedStudentName } = useCoachData();
  const now = useCoachNow();
  const router = useRouter();
  const colors = useColors();
  const todo = makeTodoItems({ rows, applications, videos, conversations, now });
  const summary = makeSummary(rows, now);
  const students = () => router.navigate('/(coach)/(tabs)/students');
  const openTodo = (item: TodoItem) => {
    if (item.kind === 'applications') students();
    else router.navigate({ pathname: '/(coach)/(tabs)/messages', params: item.studentId ? { studentId: item.studentId } : {} });
  };
  const date = `${new Intl.DateTimeFormat(undefined, { month: 'long' }).format(now)} · ${new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(now)}`;
  return <Screen edges={['top', 'left', 'right']}><ScrollView contentContainerStyle={[pageContent, { gap: spacing.point15 }]}>
    <View style={[rowStyle, { justifyContent: 'space-between' }]}><View><Copy mono size={12} tone="textTertiary" style={{ letterSpacing: 0.72 }}>{date}</Copy><Copy display size={38}>{t('coach.shell.today')}</Copy></View><View style={{ alignItems: 'flex-end' }}><Copy size={11} tone="textTertiary">{t('coach.today.todo')}</Copy><Copy display size={28}>{todo.length}</Copy></View></View>
    <Copy mono size={12} tone="textTertiary">{t('coach.today.orderedByHandling')}</Copy>
    {!rows.length ? <EmptyState title={t('coach.roster.noStudents')} subtitle={t('coach.roster.noStudentsSubtitle')} /> : !todo.length ? <EmptyState done title={t('coach.today.allDone')} subtitle={t('coach.today.allDoneSubtitle')} /> : <Card style={{ padding: 0 }}>
      {todo.map((item, index) => <Pressable key={item.id} accessibilityRole="button" onPress={() => openTodo(item)} style={({ pressed }) => [{ ...rowStyle, gap: spacing.space3, padding: spacing.space4, borderTopWidth: index ? 1 : 0, borderColor: colors.borderDefault }, pressed && { transform: [{ scale: 0.97 }] }]}>
        <View style={{ width: 7, height: 7, borderRadius: radius.pill, backgroundColor: colors[item.color] }} /><View style={{ flex: 1, gap: spacing.space1 }}><Copy lines={1} size={15} weight="bold">{item.title}</Copy><Copy lines={1} size={12} tone="textTertiary">{item.subtitle}</Copy></View><Copy size={11} weight="semibold" tone={item.color}>{item.tag}</Copy><Icon name="chevron-forward" size={14} />
      </Pressable>)}
    </Card>}
    {acceptedStudentName ? <Card style={{ borderWidth: 1, borderColor: colors.coachAcceptedBorder, ...rowStyle, gap: spacing.space2 }}><Icon name="checkmark" tone="success" /><Copy tone="success" style={{ flex: 1 }}>{t('coach.today.acceptedStudent', [acceptedStudentName])}</Copy></Card> : null}
    <Copy mono size={12} tone="textTertiary" style={{ paddingTop: spacing.point2 }}>{t('coach.today.weekOverview')}</Copy>
    <Card style={{ gap: spacing.space3 }}>
      {summary.planned > 0 ? <>
        <View style={[rowStyle, { gap: spacing.space2 }]}><Copy display size={26}>{summary.completionRate}%</Copy><Copy size={12} style={{ flex: 1 }}>{t('coach.today.trainingDaysCompleted %lld %lld', [summary.completed, summary.planned])}</Copy><Copy mono size={10} tone="textTertiary" style={{ letterSpacing: 1 }}>W{summary.isoWeek}</Copy></View>
        <View style={[rowStyle, { gap: spacing.point3 }]}>{summary.legend.map(({ group, count }) => <View key={group} style={{ flex: count, height: 8, borderRadius: radius.pill, backgroundColor: colors[groupTone[group]] }} />)}</View>
        <View style={[rowStyle, { flexWrap: 'wrap', gap: spacing.space3 }]}>{summary.legend.map(({ group, count }) => <Legend key={group} group={group} count={count} />)}</View>
        <View style={{ height: 1, backgroundColor: colors.borderHairline }} />
        <View style={[rowStyle, { gap: spacing.space2 }]}><View style={{ width: 52 }} /><View style={[rowStyle, { flex: 1, gap: spacing.space1 }]}>{summary.days.map((day, index) => <Copy key={index} mono size={9.5} weight={sameDay(day, now) ? 'bold' : 'regular'} tone={sameDay(day, now) ? 'textPrimary' : 'textDisabled'} style={{ flex: 1, textAlign: 'center' }}>{t(weekdayKeys[index])}</Copy>)}</View><View style={{ width: 30 }} /></View>
        {summary.rows.map(row => <Pressable key={row.student.id} accessibilityRole="button" accessibilityLabel={row.student.displayName} onPress={() => router.push({ pathname: '/(coach)/student/[studentId]', params: { studentId: row.student.id } })} style={({ pressed }) => [{ ...rowStyle, gap: spacing.space2, minHeight: spacing.minimumHitTarget }, pressed && { transform: [{ scale: 0.97 }] }]}>
          <View style={[rowStyle, { width: 52, gap: spacing.space1 }]}><View style={{ width: 5, height: 5, borderRadius: radius.pill, backgroundColor: colors[groupTone[row.group]] }} /><Copy size={12.5} weight="semibold" lines={1} style={{ flex: 1 }}>{row.student.displayName}</Copy></View>
          <View style={[rowStyle, { flex: 1, gap: spacing.space1 }]}>{row.cells.map((cell, index) => <Cell key={index} cell={cell} />)}</View>
          <Copy mono size={11.5} weight="semibold" tone={row.completed >= row.planned ? 'success' : row.group === 'attention' ? 'danger' : 'textTertiary'} style={{ width: 30, textAlign: 'right' }}>{row.completed}/{row.planned}</Copy>
        </Pressable>)}
      </> : <Copy size={13} weight="semibold" style={{ textAlign: 'center', paddingVertical: spacing.space4 }}>{t('coach.today.noTrainingDaysThisWeek')}</Copy>}
      <Pressable accessibilityRole="button" onPress={students} style={[rowStyle, { minHeight: spacing.minimumHitTarget, justifyContent: 'center', gap: spacing.space1 }]}><Copy size={12.5}>{t('coach.today.viewAllStudents')}</Copy><Icon name="chevron-forward" size={14} /></Pressable>
    </Card>
  </ScrollView></Screen>;
}
function Legend({ group, count }: { group: WeekGroup; count: number }) {
  const colors = useColors();
  return <View style={[rowStyle, { gap: spacing.space1 }]}><View style={{ width: 7, height: 7, borderRadius: radius.pill, backgroundColor: colors[groupTone[group]] }} /><Copy size={11.5}>{t(groupKey[group])}</Copy><Copy size={11.5} weight="bold">{t('coach.today.peopleCount %lld', [count])}</Copy></View>;
}
function Cell({ cell }: { cell: WeekCell }) {
  const colors = useColors();
  const attention = cell.kind === 'missed' && cell.isAttention;
  return <View style={{ flex: 1, height: cell.kind === 'rest' ? 8 : 14, marginTop: cell.kind === 'rest' ? 6 : 0, borderRadius: radius.micro, backgroundColor: cell.kind === 'rest' ? colors.bgStack : cell.kind === 'completed' ? colors.success : attention ? colors.coachMissedFill : cell.kind === 'upcoming' ? colors.surfaceCard : colors.bgBase, borderWidth: cell.kind === 'missed' || cell.kind === 'upcoming' ? 1 : 0, borderColor: attention ? colors.danger : colors.borderStrong, borderStyle: cell.kind === 'upcoming' ? 'dashed' : 'solid' }} />;
}
