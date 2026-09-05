import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSessionStore } from '@/api/session';
import { useMineBindRequest } from '@/api/domains/bind';
import {
  useDayCompletion,
  type PlanDay,
  type FeedbackItem,
} from '@/api/domains';
import { AnalyticsScreen, screen } from '@/analytics';
import {
  AppButton,
  Card,
  Eyebrow,
  GoldProgressBar,
  StatusBadge,
  Screen,
  Sparkline,
  useColors,
  font,
} from '@/design';
import { getLocale, t } from '@/i18n';
import { dayCode, recommendedDate } from '@/domain/plan/sequence';
import {
  dayName,
  daySummary,
  recommendedDateText,
} from '@/domain/plan/presentation';
import { useStudentTabsStore } from '@/features/student-tabs';
import { useExerciseMetadataResolver } from '@/features/training/exercise-metadata';
import { completionError } from '@/features/training/completion-errors';
import {
  formatKg,
  formatDeltaKg,
  localCompetitionDays,
  relativeFeedbackTime,
} from './model';
import type { DashboardWeekDay } from './types';
import { useDashboardViewModel } from './use-dashboard';
import { MeetPRMark } from './MeetPRMark';

export function DashboardSkeleton() {
  const colors = useColors();
  return (
    <View
      accessibilityLabel={t('student.dashboardTodayScreen.copy007')}
      style={{ height: 92, borderRadius: 16, backgroundColor: colors.bgStack }}
    />
  );
}
export function DashboardAsyncSection({
  isError,
  onRetry,
  children,
  message,
}: {
  isError: boolean;
  onRetry: () => void;
  children: ReactNode;
  message?: string;
}) {
  const colors = useColors();
  if (!isError) return <>{children}</>;
  return (
    <Card style={{ padding: 16, gap: 12 }}>
      <Text style={{ color: colors.textSecondary, ...font.body(14) }}>
        {message ?? t('student.dashboardTodayScreen.copy008')}
      </Text>
      <AppButton
        variant="secondary"
        label={t('student.dashboardTodayScreen.copy009')}
        onPress={onRetry}
      />
    </Card>
  );
}
export function DashboardScreen() {
  const colors = useColors();
  const studentId = useSessionStore((s) => s.user?.id ?? '');
  const vm = useDashboardViewModel(studentId);
  const binding = useMineBindRequest();
  const coachName =
    binding.data?.bind_request?.coach_display_name ??
    t('student.dashboardView.copy003');
  const router = useRouter();
  const handoff = useStudentTabsStore((s) => s.handoffTraining);
  const bumpCompletion = useStudentTabsStore((s) => s.bumpCompletionRevision);
  const undo = useDayCompletion(vm.activePlan?.id ?? '', true);
  const resolve = useExerciseMetadataResolver(studentId);
  useFocusEffect(
    useCallback(() => {
      void screen(AnalyticsScreen.Dashboard);
    }, []),
  );
  const openTraining = (day: PlanDay) => {
    if (!vm.activePlan) return;
    handoff({
      plan: vm.activePlan,
      dayID: day.id,
      existingLogs: vm.week.status === 'loaded' ? vm.week.logs : [],
    });
    router.navigate('/(student)/training');
  };
  const openFeedback = () => {
    router.navigate('/(student)/feedback');
  };
  const action = vm.today.action;
  const selected = vm.today.cursor ?? vm.today.completedToday;
  const profile = (
    <ProfileMetrics
      profile={vm.profile}
      now={vm.now}
      profileError={vm.profileError}
      onRetry={() => void vm.retryProfile()}
    />
  );
  return (
    <Screen edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={vm.isRefreshing}
            onRefresh={() => void vm.reload()}
          />
        }
      >
        <View style={{ gap: 12 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <MeetPRMark />
            <Text
              style={{
                ...font.mono(12),
                letterSpacing: 0.72,
                color: colors.textMuted,
              }}
            >
              {t('student.dashboardTodayPresentation.copy004', [
                new Intl.DateTimeFormat(getLocale(), {
                  month: 'short',
                  day: 'numeric',
                }).format(vm.now),
                new Intl.DateTimeFormat(getLocale(), {
                  weekday: 'short',
                }).format(vm.now),
              ])}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text
              style={{
                ...font.display(54),
                color: colors.textPrimary,
                flex: 1,
              }}
            >
              {vm.title}
            </Text>
            {action.kind === 'waiting' ? (
              <StatusBadge label={t('student.dashboardTodayScreen.copy005')} />
            ) : vm.today.cursor?.exercises.length === 0 ? (
              <StatusBadge label={t('student.dashboardTodayScreen.copy006')} />
            ) : action.kind === 'cycleCompleted' ? (
              <StatusBadge
                tone="success"
                label={t('student.dashboardTodayScreen.copy002')}
              />
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('student.todayWorkoutScreen.copy007')}
              onPress={openFeedback}
              style={{
                minWidth: 44,
                minHeight: 44,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialCommunityIcons
                name="message-outline"
                size={25}
                color={colors.textPrimary}
              />
              {vm.feedback.unreadCount > 0 ? (
                <StatusBadge
                  tone="gold"
                  label={String(vm.feedback.unreadCount)}
                />
              ) : null}
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', gap: 5 }}>
            {vm.today.segments.map((segment) => (
              <GoldProgressBar
                key={segment.day.id}
                progress={
                  segment.state === 'done'
                    ? 1
                    : segment.state === 'current'
                      ? 0.5
                      : 0
                }
                style={{ flex: segment.state === 'current' ? 1.5 : 1 }}
              />
            ))}
          </View>
        </View>
        <DashboardAsyncSection
          isError={vm.plans.isError}
          message={vm.plans.message}
          onRetry={() => void vm.plans.retry()}
        >
          {vm.plans.isLoading ? (
            <DashboardSkeleton />
          ) : action.kind === 'waiting' ? (
            <DashboardPlanWaitingState
              coachName={coachName}
              week={1}
              onMessage={openFeedback}
            />
          ) : (
            <>
              <DashboardAsyncSection
                isError={vm.feedback.isError}
                onRetry={() => void vm.feedback.reload()}
              >
                <FeedbackCard
                  coachName={coachName}
                  items={vm.feedback.items}
                  pending={vm.feedback.unreadCount}
                  now={vm.now}
                  onPress={openFeedback}
                />
              </DashboardAsyncSection>
              <View style={{ gap: 10 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <Eyebrow
                    label={`${t('student.dashboardWeekCalendar.copy012')} · ${vm.today.segments.filter((s) => s.state === 'done').length}/${vm.today.segments.length}`}
                  />
                  <Text style={{ ...font.mono(10), color: colors.textMuted }}>
                    {t('student.dashboardWeekCalendar.copy014')}
                  </Text>
                </View>
                <WeekGrid
                  days={vm.week.status === 'loaded' ? vm.week.days : []}
                  selectedDayID={vm.selectedDayID}
                  onSelect={vm.selectDay}
                />
              </View>
              {!vm.today.completedToday && selected && vm.activePlan ? (
                <Card style={{ padding: 16, gap: 6 }}>
                  <Text
                    style={{
                      ...font.body(16, 'bold'),
                      color: colors.textPrimary,
                    }}
                  >
                    {dayName(selected, resolve)}
                  </Text>
                  <Text style={{ ...font.mono(12), color: colors.textMuted }}>
                    {daySummary(selected)}
                  </Text>
                  <Text style={{ ...font.body(12), color: colors.textDim }}>
                    {t('student.dashboardPrimaryAction.copy009', [
                      recommendedDateText(
                        recommendedDate(vm.activePlan, selected),
                      ),
                    ])}
                  </Text>
                </Card>
              ) : null}
            </>
          )}
        </DashboardAsyncSection>
        {vm.profileLoading ? <DashboardSkeleton /> : profile}
        {!vm.plans.isError &&
        !vm.plans.isLoading &&
        action.kind !== 'waiting' ? (
          <>
            <Eyebrow label={t('student.dashboardTodayScreen.copy003')} />
            <DashboardAsyncSection
              isError={vm.e1rm.isError}
              onRetry={() => void vm.e1rm.retry()}
            >
              {vm.e1rm.isLoading ? (
                <DashboardSkeleton />
              ) : (
                vm.e1rm.rails.map((rail) => (
                  <Card key={rail.family} style={{ padding: 16, gap: 10 }}>
                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: '/(student)/growth-curve',
                          params: { family: rail.family },
                        })
                      }
                    >
                      <Text
                        style={{
                          color: colors.textPrimary,
                          ...font.body(16, 'bold'),
                        }}
                      >
                        {rail.name}
                      </Text>
                      <Text
                        style={{
                          color: colors.textPrimary,
                          ...font.display(34),
                        }}
                      >
                        {rail.point
                          ? `${formatKg(rail.point.valueKg)} kg`
                          : '—'}
                      </Text>
                      <Text
                        style={{ color: colors.textMuted, ...font.mono(12) }}
                      >
                        {rail.periodLabel} · {formatDeltaKg(rail.delta)}
                      </Text>
                      <Sparkline
                        data={rail.trajectory.map((point) => ({
                          x: point.date.getTime(),
                          y: point.valueKg,
                        }))}
                      />
                    </Pressable>
                  </Card>
                ))
              )}
            </DashboardAsyncSection>
            {action.kind === 'cycleCompleted' ? (
              <Card style={{ padding: 20, gap: 12, alignItems: 'center' }}>
                <MaterialCommunityIcons
                  name="trophy-outline"
                  color={colors.gold500}
                  size={34}
                />
                <Text
                  style={{
                    color: colors.textPrimary,
                    ...font.body(18, 'bold'),
                  }}
                >
                  {t('student.dashboardPrimaryAction.copy006', [
                    vm.activePlan?.plan_weeks ?? 0,
                  ])}
                </Text>
                <Text style={{ color: colors.textMuted, ...font.mono(12) }}>
                  {t('student.dashboardPrimaryAction.copy007', [
                    vm.activePlan?.plan_weeks ?? 0,
                    vm.activePlan?.days.length ?? 0,
                  ])}
                </Text>
                <Text style={{ color: colors.textSecondary, ...font.body(14) }}>
                  {t('student.dashboardPrimaryAction.copy008')}
                </Text>
              </Card>
            ) : action.kind === 'completed' ? (
              <Card style={{ padding: 20, gap: 14, alignItems: 'stretch' }}>
                <MaterialCommunityIcons
                  name="check-circle-outline"
                  color={colors.success}
                  size={34}
                />
                <Text
                  style={{
                    color: colors.textPrimary,
                    ...font.body(18, 'bold'),
                  }}
                >
                  {t('student.dashboardPrimaryAction.copy002', [
                    dayCode(action.day),
                  ])}
                </Text>
                {action.canUndo ? (
                  <AppButton
                    variant="link"
                    disabled={undo.isPending}
                    label={t('student.dashboardPrimaryAction.copy003')}
                    onPress={() => {
                      void undo
                        .mutateAsync(action.day.id)
                        .then(bumpCompletion)
                        .catch((error) =>
                          Alert.alert(
                            t('student.dashboardView.copy001'),
                            completionError(error, true),
                          ),
                        );
                    }}
                  />
                ) : null}
                {action.nextDay ? (
                  <>
                    <View
                      style={{
                        padding: 14,
                        gap: 8,
                        borderRadius: 12,
                        backgroundColor: colors.bgInset,
                      }}
                    >
                      <Eyebrow
                        label={t('student.dashboardPrimaryAction.copy004', [
                          dayCode(action.nextDay),
                        ])}
                      />
                      <Text style={{ color: colors.textPrimary }}>
                        {dayName(action.nextDay, resolve)}
                      </Text>
                      <Text style={{ color: colors.textMuted }}>
                        {daySummary(action.nextDay)}
                      </Text>
                    </View>
                    <AppButton
                      variant="secondary"
                      label={t('student.dashboardPrimaryAction.copy005')}
                      onPress={() => openTraining(action.nextDay!)}
                    />
                  </>
                ) : null}
              </Card>
            ) : null}
          </>
        ) : null}
      </ScrollView>
      {!vm.plans.isLoading && !vm.plans.isError && vm.today.stickyStartDay ? (
        <View
          style={{
            backgroundColor: colors.bgBase,
            borderTopWidth: 1,
            borderTopColor: colors.borderSubtle,
            paddingHorizontal: 20,
            paddingTop: 10,
            paddingBottom: 8,
          }}
        >
          <AppButton
            label={t('student.dashboardPrimaryAction.copy001')}
            sub={dayName(vm.today.stickyStartDay, resolve)}
            icon="play"
            onPress={() => openTraining(vm.today.stickyStartDay!)}
          />
        </View>
      ) : null}
    </Screen>
  );
}
export function WeekGrid({
  days,
  selectedDayID,
  onSelect,
}: {
  days: DashboardWeekDay[];
  selectedDayID: string | null;
  onSelect: (id: string) => void;
}) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
      {days.map(({ day, status, date }) => (
        <Pressable
          key={day.id}
          accessibilityRole="button"
          accessibilityLabel={`${dayCode(day)} ${recommendedDateText(date)}`}
          accessibilityState={{ selected: selectedDayID === day.id }}
          onPress={() => onSelect(day.id)}
          style={{
            minWidth: 64,
            flex: 1,
            minHeight: 58,
            borderRadius: 12,
            alignItems: 'center',
            padding: 6,
            gap: 4,
            backgroundColor:
              status === 'current'
                ? colors.goldSoft
                : status === 'done'
                  ? colors.surfaceCard
                  : colors.bgInset,
            borderWidth: status === 'current' ? 1.5 : 0,
            borderColor: colors.gold500,
          }}
        >
          <Text
            style={{
              color:
                status === 'done'
                  ? colors.success
                  : status === 'current'
                    ? colors.gold500
                    : colors.textGhost,
            }}
          >
            {status === 'done' ? '✓' : status === 'current' ? '●' : '○'}
          </Text>
          <Text style={{ color: colors.textPrimary, ...font.mono(10) }}>
            D{day.day_of_week}
          </Text>
          <Text style={{ color: colors.textMuted, ...font.mono(10) }}>
            {recommendedDateText(date)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
export function TrainingCTA({
  cta,
  onPress,
}: {
  cta: { interactive: boolean; label: string };
  onPress: () => void;
}) {
  return cta.interactive ? (
    <AppButton label={cta.label} onPress={onPress} />
  ) : null;
}
function FeedbackCard({
  coachName,
  items,
  pending,
  now,
  onPress,
}: {
  coachName: string;
  items: FeedbackItem[];
  pending: number;
  now: Date;
  onPress: () => void;
}) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  return (
    <Card style={{ padding: 16, gap: 12 }}>
      <Eyebrow label={t('student.dashboardFeedbackCard.copy003')} />
      {pending > 0 ? (
        <StatusBadge
          tone="gold"
          label={t('student.dashboardFeedbackCard.copy004', [pending])}
        />
      ) : null}
      {!items.length ? (
        <Text style={{ color: colors.textMuted }}>
          {t('student.dashboardFeedbackCard.copy007')}
        </Text>
      ) : (
        (expanded ? items : items.slice(0, 1)).map((item) => (
          <Pressable key={item.id} onPress={onPress}>
            <Text style={{ color: colors.textPrimary, ...font.body(15) }}>
              {item.text}
            </Text>
            <Text
              style={{
                color: colors.textMuted,
                ...font.mono(11),
                marginTop: 6,
              }}
            >
              {coachName} · {relativeFeedbackTime(item.posted_at, now)}
            </Text>
          </Pressable>
        ))
      )}
      {items.length > 1 ? (
        <AppButton
          variant="link"
          label={
            expanded
              ? t('student.dashboardFeedbackCard.copy005')
              : t('student.dashboardFeedbackCard.copy001', [items.length])
          }
          onPress={() => setExpanded(!expanded)}
        />
      ) : null}
    </Card>
  );
}
export function DashboardPlanWaitingState({
  coachName,
  week,
  onMessage,
}: {
  coachName: string;
  week: number;
  onMessage: () => void;
}) {
  const colors = useColors();
  return (
    <Card style={{ padding: 20, gap: 14 }}>
      <Text style={{ color: colors.textPrimary, ...font.body(18, 'bold') }}>
        {t('student.dashboardPlanWaitingState.copy001', [coachName, week])}
      </Text>
      <Text style={{ color: colors.textMuted, ...font.body(14) }}>
        {t('student.dashboardPlanWaitingState.copy002')}
        {t('student.dashboardPlanWaitingState.copy003')}
        {t('student.dashboardPlanWaitingState.copy004')}
      </Text>
      <AppButton
        variant="secondary"
        label={t('student.dashboardPlanWaitingState.copy005')}
        onPress={onMessage}
      />
      <Eyebrow label={t('student.dashboardPlanWaitingState.copy006', [week])} />
      {(
        [
          'student.dashboardPlanWaitingState.copy007',
          'student.dashboardPlanWaitingState.copy008',
          'student.dashboardPlanWaitingState.copy009',
        ] as const
      ).map((key) => (
        <View
          key={key}
          style={{ flexDirection: 'row', justifyContent: 'space-between' }}
        >
          <Text style={{ color: colors.textSecondary }}>{t(key)}</Text>
          <Text style={{ color: colors.textMuted }}>—</Text>
        </View>
      ))}
    </Card>
  );
}
export function ProfileMetrics({
  profile,
  now,
  profileError,
  onRetry,
}: {
  profile: ReturnType<typeof useDashboardViewModel>['profile'] | null;
  now: Date;
  profileError: boolean;
  onRetry: () => void;
}) {
  const colors = useColors();
  const competitionDays =
    profile?.is_competing && profile.competition_date
      ? localCompetitionDays(profile.competition_date, now)
      : null;
  const bodyWeightText = profile?.weight_kg
    ? `${formatKg(Number(profile.weight_kg))} KG`
    : '—';
  return (
    <DashboardAsyncSection isError={profileError} onRetry={onRetry}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card
          accessible
          accessibilityLabel={t('student.dashboardProfileMetricsView.copy002', [
            bodyWeightText,
          ])}
          style={{ flex: 1, padding: 16, gap: 8 }}
        >
          <Text style={{ color: colors.textMuted }}>
            {t('student.dashboardProfileMetricsView.copy001')}
          </Text>
          <Text style={{ color: colors.textPrimary, ...font.display(24) }}>
            {bodyWeightText}
          </Text>
        </Card>
        {competitionDays !== null && competitionDays >= 0 ? (
          <Card
            accessible
            accessibilityLabel={t('student.dashboardProfileMetricsView.copy005', [
              competitionDays,
            ])}
            style={{ flex: 1, padding: 16, gap: 8 }}
          >
            <Text style={{ color: colors.textMuted }}>
              {t('student.dashboardProfileMetricsView.copy003')}
            </Text>
            <Text style={{ color: colors.textPrimary, ...font.display(24) }}>
              {competitionDays}{' '}
              {t('student.dashboardProfileMetricsView.copy004')}
            </Text>
          </Card>
        ) : null}
      </View>
    </DashboardAsyncSection>
  );
}
