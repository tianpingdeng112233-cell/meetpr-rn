import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { t } from '@/i18n';
import { useSessionStore } from '@/api/session';
import { useShiftPlan, useUndoPlanShift, type FeedbackItem } from '@/api/domains';
import { AnalyticsScreen, screen } from '@/analytics';
import type { E1RMSample } from '@/domain/e1rm';
import {
  AppButton,
  Card,
  useColors, type Colors, font,
  radius,
  Screen,
  Sparkline,
  spacing,
  typography,
} from '@/design';
import { useStudentTabsStore } from '@/features/student-tabs';

import {
  addUtcDays,
  chineseMonthDay,
  chineseWeekday,
  formatDeltaKg,
  formatKg,
  localCompetitionDays,
  mondayOffset,
  planShiftErrorCopy,
  relativeFeedbackTime,
  utcDateText,
} from './model';
import type {
  DashboardNotification,
  DashboardWeekDay,
  WorkoutDayStatus,
} from './types';
import { useDashboardViewModel } from './use-dashboard';

const statusColors = (colors: Colors): Record<WorkoutDayStatus, string> => ({
  notStarted: colors.danger,
  partial: colors.gold500,
  complete: colors.success,
  noPlan: colors.textTertiary,
});

export function DashboardAsyncSection({
  isError,
  onRetry,
  children,
}: {
  isError: boolean;
  onRetry: () => void;
  children: ReactNode;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  if (!isError) return <>{children}</>;
  return (
    <View style={styles.errorRow}>
      <Text style={styles.errorText}>{t('student.growthCurveView.copy006')}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => pressed && styles.pressed}>
        <Text style={styles.retryText}>{/* TODO(i18n:missing) */}点击重试</Text>
      </Pressable>
    </View>
  );
}

export function DashboardScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const studentId = useSessionStore((state) => state.user?.id ?? '');
  const router = useRouter();
  const vm = useDashboardViewModel(studentId);
  const shiftPlan = useShiftPlan();
  const undoPlanShift = useUndoPlanShift();
  const bumpTrainingJump = useStudentTabsStore((state) => state.bumpTrainingJump);
  const bumpPlanRevision = useStudentTabsStore((state) => state.bumpPlanRevision);
  const bumpFeedbackJump = useStudentTabsStore((state) => state.bumpFeedbackJump);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void screen(AnalyticsScreen.Dashboard);
    }, []),
  );

  const openTraining = () => {
    if (!vm.cta.interactive) return;
    bumpTrainingJump();
    router.navigate('/(student)/training');
  };

  const openFeedback = () => {
    setNotificationsOpen(false);
    bumpFeedbackJump();
    router.navigate('/(student)/growth');
  };

  const confirmShift = () => {
    if (!vm.activePlan || !vm.todayDay?.day) return;
    const plan = vm.activePlan;
    const course = vm.todayDay.lift?.name ?? plan.name;
    const shiftedEnd = chineseMonthDay(
      addUtcDays(plan.end_date, plan.total_shift_days + 1),
    );
    Alert.alert(
      /* TODO(i18n:drift) */ '把整份计划往后顺延一天?',
      /* TODO(i18n:drift) */ `今天的${course}课改到明天,之后的课依次顺延,本周期结束日变为${shiftedEnd}`,
      [
        { text: t('student.accountSecuritySheets.copy013'), style: 'cancel' },
        {
          text: /* TODO(i18n:drift) */ '确认顺延',
          onPress: () => {
            void shiftPlan
              .mutateAsync(plan.id)
              .then((result) => {
                bumpPlanRevision();
                const advisory =
                  result.total_offset_days >= 3
                    ? /* TODO(i18n:drift) */ `已累计顺延 ${result.total_offset_days} 天,建议联系教练调整计划`
                    : '';
                Alert.alert(/* TODO(i18n:drift) */ '顺延成功', advisory, [{ text: t('student.dashboardView.copy002') }]);
              })
              .catch((error: unknown) => {
                const copy = planShiftErrorCopy(error, 'shift');
                Alert.alert(copy.title, copy.message, [{ text: t('student.dashboardView.copy002') }]);
              });
          },
        },
      ],
    );
  };

  const confirmUndoShift = () => {
    if (!vm.activePlan) return;
    const planId = vm.activePlan.id;
    Alert.alert(/* TODO(i18n:drift) */ '撤销顺延?', /* TODO(i18n:drift) */ `课程会回到${chineseMonthDay(utcDateText(vm.now))}。`, [
      { text: /* TODO(i18n:drift) */ '保留顺延', style: 'cancel' },
      {
        text: /* TODO(i18n:drift) */ '撤销顺延',
        style: 'destructive',
        onPress: () => {
          void undoPlanShift
            .mutateAsync(planId)
            .then(() => bumpPlanRevision())
            .catch((error: unknown) => {
              const copy = planShiftErrorCopy(error, 'undo');
              Alert.alert(copy.title, copy.message, [{ text: t('student.dashboardView.copy002') }]);
            });
        },
      },
    ]);
  };

  return (
    <Screen edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            onRefresh={() => void vm.reload()}
            refreshing={vm.isRefreshing}
            tintColor={colors.gold500}
          />
        }
        showsVerticalScrollIndicator={false}>
        <View style={styles.heroRow}>
          <Text style={styles.hero}>{vm.title}</Text>
          <Pressable
            accessibilityLabel={t('student.notifications')}
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => setNotificationsOpen(true)}
            style={({ pressed }) => [styles.bell, pressed && styles.pressed]}>
            <MaterialCommunityIcons
              color={colors.textPrimary}
              name={vm.notifications.length > 0 ? 'bell-badge-outline' : 'bell-outline'}
              size={27}
            />
            {vm.notifications.length > 0 ? <View style={styles.redDot} /> : null}
          </Pressable>
        </View>

        {vm.plans.isError ? null : <ProgressSegments week={vm.week} />}

        <DashboardAsyncSection
          isError={vm.feedback.isError}
          onRetry={() => void vm.feedback.reload()}>
          {vm.feedback.latest ? (
            <FeedbackCard
              feedback={vm.feedback.latest}
              now={vm.now}
              onPress={openFeedback}
            />
          ) : null}
        </DashboardAsyncSection>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('student.trainingCalendarView.copy006')}</Text>
          {vm.week.status === 'loading' ? (
            <ActivityIndicator color={colors.textTertiary} size="small" />
          ) : null}
        </View>
        <DashboardAsyncSection
          isError={vm.plans.isError}
          onRetry={() => void vm.plans.retry()}>
          <WeekGrid
            days={vm.week.status === 'loaded' ? vm.week.days : []}
            onSelect={vm.selectDate}
            selectedDate={vm.selectedDate}
          />

          {!vm.plans.isLoading ? (
            <>
              <DashboardAsyncSection
                isError={vm.e1rm.isError}
                onRetry={() => void vm.e1rm.retry()}>
                <LiftCard
                  day={vm.selectedDay}
                  delta={vm.e1rm.delta}
                  loading={vm.e1rm.isLoading}
                  onPress={() =>
                    router.push({
                      pathname: '/(student)/growth',
                      params: { lift: vm.selectedDay?.lift?.name ?? t('student.growthCurveView.copy001') },
                    })
                  }
                  periodLabel={vm.e1rm.periodLabel}
                  point={vm.e1rm.point}
                  trajectory={vm.e1rm.trajectory}
                />
              </DashboardAsyncSection>

              <TrainingCTA cta={vm.cta} onPress={openTraining} />

              {vm.canShift ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={shiftPlan.isPending}
                  onPress={confirmShift}
                  style={({ pressed }) => [styles.shiftButton, pressed && styles.pressed]}>
                  <Text style={styles.shiftLabel}>
                    {shiftPlan.isPending ? /* TODO(i18n:drift) */ '顺延中…' : /* TODO(i18n:drift) */ '今天有事'}
                  </Text>
                </Pressable>
              ) : null}
              {vm.canUndoShift ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={undoPlanShift.isPending}
                  onPress={confirmUndoShift}
                  style={({ pressed }) => [styles.undoShiftButton, pressed && styles.pressed]}>
                  <Text style={styles.undoShiftLabel}>
                    {undoPlanShift.isPending ? /* TODO(i18n:drift) */ '撤销中…' : /* TODO(i18n:drift) */ '撤销顺延'}
                  </Text>
                </Pressable>
              ) : null}
            </>
          ) : null}
        </DashboardAsyncSection>

        <ProfileMetrics
          now={vm.now}
          onRetry={() => void vm.retryProfile()}
          profile={vm.profile ?? null}
          profileError={vm.profileError}
        />
      </ScrollView>

      <NotificationCenterSheet
        notifications={vm.notifications}
        onClose={() => setNotificationsOpen(false)}
        onFeedback={openFeedback}
        onPlan={() => {
          vm.dismissPlanNotification();
          setNotificationsOpen(false);
        }}
        visible={notificationsOpen}
      />
    </Screen>
  );
}

function ProgressSegments({ week }: { week: ReturnType<typeof useDashboardViewModel>['week'] }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  if (week.status === 'idle' || week.status === 'error') return null;
  if (week.status === 'loading') {
    return <View style={styles.progressSkeleton} />;
  }
  const trainingDays = week.days.filter((day) => day.day !== null);
  if (trainingDays.length === 0) return null;
  return (
    <View accessibilityLabel={/* TODO(i18n:missing) */ "本周训练进度"} style={styles.progressRow}>
      {trainingDays.map((day) => (
        <View key={day.date} style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: statusColors(colors)[day.status],
                width: `${Math.round(day.completion * 100)}%`,
              },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

function FeedbackCard({
  feedback,
  now,
  onPress,
}: {
  feedback: FeedbackItem;
  now: Date;
  onPress: () => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const eyebrow = feedback.day_date
    ? `${t('student.dashboardFeedbackCard.copy003')} · ${chineseWeekday(feedback.day_date)}`
    : t('student.dashboardFeedbackCard.copy003');
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {({ pressed }) => (
        <Card style={[styles.feedbackCard, pressed && styles.pressed]}>
          <View style={styles.feedbackTop}>
            {feedback.read_at === null ? <View style={styles.inlineDot} /> : null}
            <Text style={styles.eyebrow}>{eyebrow}</Text>
          </View>
          <Text numberOfLines={3} style={styles.feedbackBody}>
            {feedback.text}
          </Text>
          <Text style={styles.feedbackFooter}>
            {t('student.dashboardView.copy003')} · {relativeFeedbackTime(feedback.posted_at, now)} {/* TODO(i18n:missing) */}· 在「成长」查看全部反馈 →
          </Text>
        </Card>
      )}
    </Pressable>
  );
}

export function WeekGrid({
  days,
  selectedDate,
  onSelect,
}: {
  days: DashboardWeekDay[];
  selectedDate: string | null;
  onSelect: (date: string) => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const ordered = [...days].sort((left, right) => {
    const leftWeekday = mondayOffset(
      new Date(`${left.date}T00:00:00Z`).getUTCDay() + 1,
    );
    const rightWeekday = mondayOffset(
      new Date(`${right.date}T00:00:00Z`).getUTCDay() + 1,
    );
    return leftWeekday - rightWeekday;
  });
  if (ordered.length === 0) {
    return <View style={styles.weekGridSkeleton} />;
  }
  return (
    <View style={styles.weekGrid}>
      {ordered.map((day) => {
        const selected = day.date === selectedDate;
        return (
          <Pressable
            accessibilityLabel={`${chineseWeekday(day.date)} ${day.lift?.name ?? (day.day ? t('student.studentRootView.copy002') : t('coach.execution.rest'))}`}
            accessibilityRole="button"
            key={day.date}
            onPress={() => onSelect(day.date)}
            style={({ pressed }) => [
              styles.weekCell,
              selected && styles.weekCellSelected,
              pressed && styles.pressed,
            ]}>
            {day.status === 'complete' ? <View style={styles.completeTriangle} /> : null}
            <Text style={[styles.weekday, selected && styles.selectedText]}>
              {chineseWeekday(day.date)}
            </Text>
            <Text
              style={[
                styles.liftInitial,
                {
                  color: day.day
                    ? statusColors(colors)[day.status]
                    : colors.textTertiary,
                },
              ]}>
              {day.lift?.initial ?? '·'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function TrainingCTA({
  cta,
  onPress,
}: {
  cta: ReturnType<typeof useDashboardViewModel>['cta'];
  onPress: () => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return cta.interactive ? (
    <AppButton label={cta.label} onPress={onPress} />
  ) : (
    <View style={styles.restCTA}>
      <Text style={styles.restLabel}>{cta.label}</Text>
    </View>
  );
}

function LiftCard({
  day,
  point,
  periodLabel,
  delta,
  loading,
  onPress,
  trajectory,
}: {
  day: DashboardWeekDay | null;
  point: E1RMSample | null;
  periodLabel: string;
  delta: number;
  loading: boolean;
  onPress: () => void;
  trajectory: readonly E1RMSample[];
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const lift = day?.lift;
  const deltaColor =
    delta > 0 ? colors.success : delta < 0 ? colors.danger : colors.textSecondary;
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {({ pressed }) => (
        <Card style={[styles.liftCard, pressed && styles.pressed]}>
          {point && lift ? (
            <>
              <View style={styles.liftTitleRow}>
                <Text style={styles.liftTitle}>
                  {lift.name} E1RM · {periodLabel}
                </Text>
                <MaterialCommunityIcons
                  color={colors.textTertiary}
                  name="chevron-right"
                  size={22}
                />
              </View>
              <View style={styles.numberRow}>
                <Text style={styles.bigNumber}>{formatKg(point.valueKg)}</Text>
                <Text style={styles.bigUnit}>KG</Text>
              </View>
              <Text style={[styles.delta, { color: deltaColor }]}>90 {t('student.dashboardProfileMetricsView.copy004')} {formatDeltaKg(delta)}</Text>
              <View style={styles.sparkline}>
                <Sparkline
                  data={trajectory.map((sample) => ({
                    x: sample.date.getTime(),
                    y: sample.valueKg,
                  }))}
                />
              </View>
              <Text style={styles.liftFooter}>
                {/* TODO(i18n:missing) */}选中 {chineseWeekday(day.date)} · {chineseMonthDay(day.date)}
              </Text>
            </>
          ) : (
            <View style={styles.liftEmpty}>
              <View style={styles.liftTitleRow}>
                <Text style={styles.liftTitle}>{/* TODO(i18n:missing) */}成长曲线</Text>
                {loading ? (
                  <ActivityIndicator color={colors.textTertiary} size="small" />
                ) : (
                  <MaterialCommunityIcons
                    color={colors.textTertiary}
                    name="chevron-right"
                    size={22}
                  />
                )}
              </View>
              <Text style={styles.liftEmptyText}>
                {lift ? /* TODO(i18n:missing) */ '练几次就有趋势了' : /* TODO(i18n:missing) */ '选中训练日查看对应成长曲线'}
              </Text>
            </View>
          )}
        </Card>
      )}
    </Pressable>
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
  const styles = useMemo(() => createStyles(colors), [colors]);
  if (profileError) {
    return (
      <DashboardAsyncSection isError onRetry={onRetry}>
        {null}
      </DashboardAsyncSection>
    );
  }
  const competitionDays =
    profile?.is_competing && profile.competition_date
      ? localCompetitionDays(profile.competition_date, now)
      : null;
  return (
    <View style={styles.metricsRow}>
      <Card style={styles.metricCard}>
        <Text style={styles.metricLabel}>{t('student.dashboardProfileMetricsView.copy001')}</Text>
        <Text style={styles.metricValue}>
          {profile?.weight_kg ? `${formatKg(Number(profile.weight_kg))} KG` : '—'}
        </Text>
        <Text style={styles.metricFooter}>{/* TODO(i18n:missing) */}资料档案</Text>
      </Card>
      {competitionDays !== null && competitionDays >= 0 ? (
        <Card style={styles.metricCard}>
          <Text style={styles.metricLabel}>{t('student.dashboardProfileMetricsView.copy003')}</Text>
          <Text style={styles.metricValue}>{competitionDays} {t('student.dashboardProfileMetricsView.copy004')}</Text>
        </Card>
      ) : null}
    </View>
  );
}

function NotificationCenterSheet({
  visible,
  notifications,
  onClose,
  onFeedback,
  onPlan,
}: {
  visible: boolean;
  notifications: DashboardNotification[];
  onClose: () => void;
  onFeedback: () => void;
  onPlan: () => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      transparent
      visible={visible}>
      <Pressable accessibilityRole="button" onPress={onClose} style={styles.scrim}>
        <Pressable onPress={(event) => event.stopPropagation()} style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{t('student.notifications')}</Text>
            <Pressable accessibilityRole="button" hitSlop={12} onPress={onClose}>
              <Text style={styles.done}>{t('student.readinessCheckinSheet.copy018')}</Text>
            </Pressable>
          </View>
          {notifications.length === 0 ? (
            <View style={styles.notificationEmpty}>
              <MaterialCommunityIcons
                color={colors.textTertiary}
                name="bell-outline"
                size={38}
              />
              <Text style={styles.notificationEmptyTitle}>{/* TODO(i18n:missing) */}暂无新通知</Text>
              <Text style={styles.notificationEmptyBody}>{/* TODO(i18n:missing) */}新的反馈和计划会在这里出现</Text>
            </View>
          ) : (
            notifications.map((notification) => {
              if (notification.type === 'plan') {
                return (
                  <NotificationRow
                    icon="clipboard-text-outline"
                    key={notification.id}
                    onPress={onPlan}
                    subtitle={/* TODO(i18n:missing) */ `第 ${notification.weekIndex} 周计划已可查看`}
                    title={t('student.studentBlackGoldChatView.copy020')}
                  />
                );
              }
              if (notification.type === 'feedback') {
                return (
                  <NotificationRow
                    icon="message-text-outline"
                    key={notification.id}
                    onPress={onFeedback}
                    subtitle={/* TODO(i18n:missing) */ "查看教练最近的训练反馈"}
                    title={/* TODO(i18n:missing) */ `${notification.count} 条未读反馈`}
                  />
                );
              }
              return (
                <NotificationRow
                  icon="check-decagram-outline"
                  key={notification.id}
                  onPress={onClose}
                  subtitle={/* TODO(i18n:missing) */ "查看教练给你的评估结果"}
                  title={/* TODO(i18n:missing) */ "评估已完成"}
                />
              );
            })
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function NotificationRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.notificationRow, pressed && styles.pressed]}>
      <View style={styles.notificationIcon}>
        <MaterialCommunityIcons color={colors.gold500} name={icon} size={22} />
      </View>
      <View style={styles.notificationText}>
        <Text style={styles.notificationTitle}>{title}</Text>
        <Text style={styles.notificationSubtitle}>{subtitle}</Text>
      </View>
      <MaterialCommunityIcons color={colors.textTertiary} name="chevron-right" size={21} />
    </Pressable>
  );
}

const createStyles = (colors: Colors) => StyleSheet.create({
  content: { gap: spacing.base, padding: spacing.base, paddingBottom: spacing.xxl },
  heroRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  hero: { color: colors.textPrimary, ...font.display(36, 'black'), lineHeight: 40 },
  bell: { borderRadius: radius.pill, padding: spacing.sm },
  redDot: {
    backgroundColor: colors.dangerFill,
    borderColor: colors.bgBase,
    borderRadius: radius.pill,
    borderWidth: 2,
    height: 10,
    position: 'absolute',
    right: 5,
    top: 5,
    width: 10,
  },
  pressed: { opacity: 0.72 },
  progressRow: { flexDirection: 'row', gap: spacing.xs },
  progressTrack: {
    backgroundColor: colors.bgStack,
    borderRadius: radius.pill,
    flex: 1,
    height: 6,
    overflow: 'hidden',
  },
  progressFill: { borderRadius: radius.pill, height: 6 },
  progressSkeleton: { backgroundColor: colors.bgStack, borderRadius: radius.pill, height: 6 },
  feedbackCard: { gap: spacing.md, padding: spacing.base },
  feedbackTop: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  inlineDot: { backgroundColor: colors.dangerFill, borderRadius: radius.pill, height: 8, width: 8 },
  eyebrow: { color: colors.textSecondary, ...typography.caption, letterSpacing: 0.8 },
  feedbackBody: { color: colors.textPrimary, ...typography.body },
  feedbackFooter: { color: colors.textSecondary, ...typography.footnote },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { color: colors.textPrimary, ...typography.headline },
  errorRow: {
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderColor: colors.borderDefault,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: spacing.base,
  },
  errorText: { color: colors.textTertiary, ...typography.footnote },
  retryText: { color: colors.gold500, ...typography.footnote },
  weekGrid: { flexDirection: 'row', gap: spacing.xs },
  weekCell: {
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderColor: colors.borderDefault,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    gap: spacing.xs,
    minHeight: 62,
    overflow: 'hidden',
    paddingVertical: spacing.sm,
  },
  weekCellSelected: { backgroundColor: colors.goldSoft, borderColor: colors.gold500 },
  completeTriangle: {
    borderLeftColor: 'transparent',
    borderLeftWidth: 9,
    borderTopColor: colors.success,
    borderTopWidth: 9,
    height: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    width: 0,
  },
  weekday: { color: colors.textSecondary, ...typography.caption },
  selectedText: { color: colors.textPrimary },
  liftInitial: { ...font.display(18) },
  weekGridSkeleton: { backgroundColor: colors.surfaceCard, borderRadius: radius.md, height: 62 },
  liftCard: { minHeight: 150, padding: spacing.base },
  liftTitleRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  liftTitle: { color: colors.textSecondary, ...typography.footnote },
  numberRow: { alignItems: 'baseline', flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  bigNumber: { color: colors.textPrimary, ...typography.displayNumeral },
  bigUnit: { color: colors.textPrimary, ...typography.displayUnit },
  delta: { ...font.body(13, 'semibold') },
  sparkline: { marginTop: spacing.md },
  liftFooter: { color: colors.textTertiary, marginTop: spacing.md, ...typography.caption },
  liftEmpty: { flex: 1, gap: spacing.md, justifyContent: 'space-between' },
  liftEmptyText: { color: colors.textTertiary, ...typography.body },
  restCTA: {
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 52,
  },
  restLabel: { color: colors.textTertiary, ...typography.bodyEmphasis },
  shiftButton: { alignItems: 'center', backgroundColor: colors.surfaceCard, borderColor: colors.borderDefault, borderRadius: radius.lg, borderWidth: 1, justifyContent: 'center', minHeight: 44, paddingHorizontal: spacing.lg },
  shiftLabel: { color: colors.textSecondary, ...typography.bodyEmphasis },
  undoShiftButton: { alignItems: 'center', backgroundColor: colors.goldSoft, borderRadius: radius.lg, justifyContent: 'center', minHeight: 44, paddingHorizontal: spacing.lg },
  undoShiftLabel: { color: colors.gold500, ...typography.bodyEmphasis },
  metricsRow: { flexDirection: 'row', gap: spacing.md },
  metricCard: { flex: 1, minHeight: 96, padding: spacing.base },
  metricLabel: { color: colors.textSecondary, ...typography.footnote },
  metricValue: { color: colors.textPrimary, marginTop: spacing.sm, ...typography.headline },
  metricFooter: { color: colors.textTertiary, marginTop: spacing.xs, ...typography.caption },
  scrim: { backgroundColor: 'rgba(0,0,0,0.62)', flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surfaceCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    minHeight: 290,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.base,
  },
  sheetHeader: {
    alignItems: 'center',
    borderBottomColor: colors.borderDefault,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.base,
  },
  sheetTitle: { color: colors.textPrimary, ...typography.headline },
  done: { color: colors.textPrimary, ...typography.bodyEmphasis },
  notificationEmpty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  notificationEmptyTitle: { color: colors.textPrimary, ...typography.bodyEmphasis },
  notificationEmptyBody: { color: colors.textTertiary, ...typography.footnote },
  notificationRow: {
    alignItems: 'center',
    borderBottomColor: colors.borderDefault,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.base,
  },
  notificationIcon: {
    alignItems: 'center',
    backgroundColor: colors.goldSoft,
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  notificationText: { flex: 1, gap: spacing.xs },
  notificationTitle: { color: colors.textPrimary, ...typography.bodyEmphasis },
  notificationSubtitle: { color: colors.textSecondary, ...typography.footnote },
});
