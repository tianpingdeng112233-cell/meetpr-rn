import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, type ReactNode } from 'react';
import { Alert, RefreshControl, ScrollView, Text, View } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { useSessionStore } from '@/api/session';
import { useOpenCoachChat } from '@/features/chat/open-coach-chat';
import { useMineBindRequest } from '@/api/domains/bind';
import { useStudentVideos } from '@/api/domains/videos';
import {
  useDayCompletion,
  type PlanDay,
} from '@/api/domains';
import { AnalyticsScreen, screen } from '@/analytics';
import {
  AppButton,
  Card,
  GradientFill,
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
import { feedbackVideoAssociation } from '@/features/feedback/video-presentation';
import {
  formatKg,
  formatDeltaKg,
  localCompetitionDays,
} from './model';
import { WeekCalendar } from './WeekCalendar';
import { FeedbackCard } from './FeedbackCard';
import { useDashboardViewModel } from './use-dashboard';
import { MeetPRMark } from './MeetPRMark';

export { WeekGrid } from './WeekCalendar';

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
  const videos = useStudentVideos(studentId);
  const feedbackItems = vm.feedback.items.map(item => {
    const association = feedbackVideoAssociation(item.video_id, videos.data?.videos ?? []);
    return { ...item, video: association.kind === 'available' ? association.video : null };
  });
  const chat = useOpenCoachChat(studentId);
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
  const statusLabel = action.kind === 'waiting'
    ? t('student.dashboardTodayScreen.copy005')
    : vm.today.cursor?.exercises.length === 0
      ? t('student.dashboardTodayScreen.copy006')
      : action.kind === 'cycleCompleted'
        ? t('student.dashboardTodayScreen.copy002')
        : null;
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
        <View style={{ gap: 15 }}>
          <View
            testID="dashboard-brand-date-row"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <MeetPRMark testID="dashboard-mark" />
            <Text
              testID="dashboard-date"
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
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 11 }}>
              <Text style={{ ...font.display(54), color: statusLabel ? colors.textDim : colors.textPrimary }}>
                {vm.title}
              </Text>
              {statusLabel ? (
                <Text style={{ ...font.mono(12, 'bold'), color: colors.textMuted, backgroundColor: colors.surfaceElevated, borderColor: colors.borderStrong, borderWidth: 1, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 5, marginBottom: 12 }}>
                  {statusLabel}
                </Text>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('student.todayWorkoutScreen.copy007')}
              disabled={chat.isOpening}
              onPress={() => void chat.openCoachChat()}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: colors.surfaceCard,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialCommunityIcons
                name="message-outline"
                size={21}
                color={colors.textPrimary}
              />
              {chat.totalUnread > 0 ? (
                <View style={{ position: 'absolute', top: 0, right: 0, minWidth: 18, minHeight: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: colors.unread, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: colors.ctaTopHighlight, ...font.mono(10, 'bold') }}>{chat.totalUnread > 99 ? '99+' : chat.totalUnread}</Text>
                </View>
              ) : null}
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', gap: 5, marginTop: -8 }}>
            {vm.today.segments.length ? vm.today.segments.map((segment) => (
              <View key={segment.day.id} style={{ flex: segment.state === 'current' ? 1.5 : 1, height: 4, borderRadius: 2, backgroundColor: segment.state === 'done' ? colors.textPrimary : colors.borderStrong, ...(segment.state === 'current' ? { boxShadow: `0 0 4px ${colors.gold500}59` } : {}) }}>
                {segment.state === 'current' ? <View style={{ flex: 1, borderRadius: 2, overflow: 'hidden' }}><GradientFill stops={[{ color: colors.gold500, offset: 0 }, { color: colors.gold400, offset: 0.5 }, { color: colors.gold300, offset: 1 }]} /></View> : null}
              </View>
            )) : <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong }} />}
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
              onMessage={() => void chat.openCoachChat()}
            />
          ) : (
            <>
              <DashboardAsyncSection
                isError={vm.feedback.isError}
                onRetry={() => void vm.feedback.reload()}
              >
                <FeedbackCard
                  coachName={coachName}
                  items={feedbackItems}
                  pending={vm.feedback.unreadCount}
                  now={vm.now}
                  onPress={openFeedback}
                  onOpenItem={item => router.push(`/(student)/feedback/${item.id}`)}
                />
              </DashboardAsyncSection>
              <WeekCalendar
                headerStyle="progress"
                weekNumber={vm.week.status === 'loaded' ? vm.week.weekIndex : 1}
                cells={vm.week.status === 'loaded' ? vm.week.days : []}
                selectedDayID={vm.selectedDayID}
                onSelect={vm.selectDay}
              />
              {!vm.today.completedToday && selected && vm.activePlan ? (
                <View style={{ gap: 5 }}>
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
                </View>
              ) : null}
            </>
          )}
        </DashboardAsyncSection>
        {vm.profileLoading ? <DashboardSkeleton /> : profile}
        {!vm.plans.isError &&
        !vm.plans.isLoading &&
        action.kind !== 'waiting' ? (
          <>
            <Text style={{ ...font.mono(12), color: colors.textSecondary }}>{t('student.dashboardTodayScreen.copy003')}</Text>
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
                          pathname: '/(student)/growth',
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
                      <Text style={{ ...font.mono(12), color: colors.gold500 }}>
                        {t('student.dashboardPrimaryAction.copy004', [dayCode(action.nextDay)])}
                      </Text>
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
      <Text style={{ ...font.mono(13), color: colors.textSecondary }}>{t('student.dashboardPlanWaitingState.copy006', [week])}</Text>
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
    ? `${formatKg(Number(profile.weight_kg))} kg`
    : '—';
  return (
    <DashboardAsyncSection isError={profileError} onRetry={onRetry}>
      <View style={{ flexDirection: 'row', gap: 11 }}>
        <Card
          accessible
          accessibilityLabel={t('student.dashboardProfileMetricsView.copy002', [
            bodyWeightText,
          ])}
          style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 14, gap: 3 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialCommunityIcons name="scale-bathroom" size={13} color={colors.textPrimary} />
            <Text style={{ color: colors.textPrimary, ...font.body(11) }}>{t('student.dashboardProfileMetricsView.copy001')}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={{ color: colors.textPrimary, ...font.mono(24, 'bold') }}>{profile?.weight_kg ? formatKg(Number(profile.weight_kg)) : '—'}</Text>
            {profile?.weight_kg ? <Text style={{ color: colors.textMuted, ...font.body(13, 'semibold') }}> kg</Text> : null}
          </View>
        </Card>
        {competitionDays !== null && competitionDays >= 0 ? (
          <Card
            accessible
            accessibilityLabel={t('student.dashboardProfileMetricsView.copy005', [
              competitionDays,
            ])}
            style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 14, gap: 3, overflow: 'hidden', borderWidth: 1, borderColor: `${colors.goldRGB}4D` }}
          >
            <GradientFill direction="diagonal" stops={[{ color: colors.goldRGB, opacity: 0.13, offset: 0 }, { color: colors.surfaceCard, offset: 0.62 }, { color: colors.surfaceCard, offset: 1 }]} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialCommunityIcons name="flag-outline" size={13} color={colors.gold500} />
              <Text style={{ color: colors.textPrimary, ...font.body(11) }}>{t('student.dashboardProfileMetricsView.copy003')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <MaterialCommunityIcons name="fire" size={16} color={colors.gold500} />
              <Text style={{ color: colors.goldText, ...font.mono(24, 'bold') }}>{competitionDays}</Text>
              <Text style={{ color: colors.textMuted, ...font.body(13, 'semibold') }}>{t('student.dashboardProfileMetricsView.copy004')}</Text>
            </View>
          </Card>
        ) : null}
      </View>
    </DashboardAsyncSection>
  );
}
