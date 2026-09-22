import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  buildExerciseIndex,
  useExerciseCatalog,
  useOnboardingProfile,
  usePlan,
  usePlans,
  useSetLogs,
  type PlanDetail,
} from '@/api/domains';
import { AnalyticsEvent, track } from '@/analytics';
import { t } from '@/i18n';
import { cursorDay, currentWeekDays, dayCode, sequenceDays } from '@/domain/plan/sequence';
import { localDateText } from '@/domain/plan/workout-date-policy';
import { todayModel } from './today-model';
import {
  displayPoint,
  ninetyDayRecordTrajectory,
  type E1RMSample,
  type E1RMSeries,
} from '@/domain/e1rm';
import { useStudentTabsStore } from '@/features/student-tabs';

import { useFeedbackInboxViewModel } from './feedback-inbox';
import {
  buildNotifications,
  buildResolvedExerciseFamilies,
  dashboardE1RMRange,
  e1RMDelta,
  e1RMPeriodLabel,
  replayE1RMSeries,
  resolveDashboardLifts,
  selectDashboardPlan,
  selectLatestPublishedPlan,
} from './model';
import type {
  DashboardNotification,
  DashboardWeekDay,
  WeekOverviewState,
} from './types';
import { useWeekOverviewViewModel } from './week-overview';
import {
  dashboardPlanSignature,
  dashboardPlanSignatureKey,
  hasSeenDashboardPlan,
  markDashboardPlanSeen,
} from './plan-seen';

const EMPTY_E1RM: E1RMSeries = {
  smoothed: [],
  rawEligible: [],
  records: [],
  best: null,
  last: null,
  currentKg: null,
};

export type DashboardViewModel = {
  now: Date;
  title: string;
  activePlan: PlanDetail | null;
  week: WeekOverviewState;
  todayDay: DashboardWeekDay | null;
  selectedDay: DashboardWeekDay | null;
  selectedDayID: string | null;
  selectDay: (dayId: string) => void;
  today: ReturnType<typeof todayModel>;
  cta: { interactive: boolean; label: string };
  plans: {
    isLoading: boolean;
    isError: boolean;
    message: string;
    retry: () => Promise<void>;
  };
  e1rm: {
    rails: { exerciseId: string; family: import('@/domain/e1rm').LiftFamily; name: string; point: ReturnType<typeof displayPoint>; periodLabel: string; delta: number; trajectory: readonly E1RMSample[] }[];
    series: E1RMSeries;
    point: ReturnType<typeof displayPoint>;
    periodLabel: string;
    delta: number;
    trajectory: readonly E1RMSample[];
    isLoading: boolean;
    isError: boolean;
    retry: () => Promise<void>;
  };
  feedback: ReturnType<typeof useFeedbackInboxViewModel>;
  profile: ReturnType<typeof useOnboardingProfile>['data'];
  profileError: boolean;
  profileLoading: boolean;
  retryProfile: () => Promise<void>;
  notifications: DashboardNotification[];
  dismissPlanNotification: () => void;
  isRefreshing: boolean;
  reload: () => Promise<void>;
};

export function useDashboardViewModel(studentId: string): DashboardViewModel {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(timer); }, []);
  const todayReloadToken = useStudentTabsStore((state) => state.todayReloadToken);
  const planRevision = useStudentTabsStore((state) => state.planRevision);
  const plansQuery = usePlans(studentId);
  const planSummaries = plansQuery.data?.plans ?? [];
  const activeSummary = selectDashboardPlan(planSummaries);
  const latestPublishedPlan = selectLatestPublishedPlan(planSummaries);
  const detailQuery = usePlan(activeSummary?.id ?? '');
  const activePlan = detailQuery.data ?? null;
  const exerciseCatalogQuery = useExerciseCatalog(Boolean(studentId));
  const profileQuery = useOnboardingProfile(studentId);
  // A FAILED profile/catalog request is not the same as "no profile" (a real
  // null profile legitimately falls back to the raw family): while metadata is
  // unavailable, lift resolution must stay unresolved instead of guessing.
  const liftMetadataUnavailable =
    exerciseCatalogQuery.isError || profileQuery.isError;
  const exerciseIndex = useMemo(
    () =>
      liftMetadataUnavailable
        ? buildExerciseIndex([])
        : buildExerciseIndex(exerciseCatalogQuery.data?.exercises ?? []),
    [exerciseCatalogQuery.data?.exercises, liftMetadataUnavailable],
  );
  const currentWeekIndex = currentWeekDays(activePlan?.days ?? [])[0]?.week_number ?? 1;
  const week = useWeekOverviewViewModel(
    studentId,
    activePlan,
    currentWeekIndex,
    planRevision,
    exerciseIndex,
    profileQuery.data ?? null,
  );
  const feedback = useFeedbackInboxViewModel(studentId);
  const historyQuery = useSetLogs(
    studentId,
    dashboardE1RMRange(localDateText(now)),
    Boolean(activePlan),
  );
  const [requestedDayID, setRequestedDayID] = useState<string | null>(null);
  const [planSeenState, setPlanSeenState] = useState<{
    signatureKey: string | null;
    unread: boolean;
  }>({ signatureKey: null, unread: false });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const planSignature = useMemo(
    () =>
      latestPublishedPlan
        ? dashboardPlanSignature(latestPublishedPlan)
        : null,
    [latestPublishedPlan],
  );
  const planSignatureKey = planSignature
    ? dashboardPlanSignatureKey(planSignature)
    : null;
  useEffect(() => {
    let cancelled = false;
    if (!studentId || !planSignature || !planSignatureKey) {
      return () => {
        cancelled = true;
      };
    }
    void hasSeenDashboardPlan(studentId, planSignature)
      .then((seen) => {
        if (!cancelled) {
          setPlanSeenState({ signatureKey: planSignatureKey, unread: !seen });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPlanSeenState({ signatureKey: planSignatureKey, unread: true });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [planSignature, planSignatureKey, studentId]);

  const days = week.state.status === 'loaded' ? week.state.days : [];
  const todayState = todayModel(activePlan, now, planSummaries);
  const current = cursorDay(activePlan?.days ?? []);
  const todayDay = days.find(day => day.day.id === current?.id) ?? days[days.length - 1] ?? null;
  const selectedDayID = requestedDayID && days.some(day => day.day.id === requestedDayID) ? requestedDayID : todayDay?.day.id ?? null;
  const selectedDay = days.find(day => day.day.id === selectedDayID) ?? todayDay;
  const familyByExerciseId = useMemo(
    () =>
      liftMetadataUnavailable
        ? new Map<string, never>()
        : buildResolvedExerciseFamilies(exerciseIndex, profileQuery.data ?? null),
    [exerciseIndex, profileQuery.data, liftMetadataUnavailable],
  );
  const series =
    selectedDay?.lift && historyQuery.data
      ? replayE1RMSeries(
          historyQuery.data.logs,
          familyByExerciseId,
          selectedDay.lift.family,
        )
      : EMPTY_E1RM;
  const point = displayPoint(series);
  let projectionIndex = 0;
  const trajectory = ninetyDayRecordTrajectory(
    series,
    now,
    () => `dashboard-trajectory-${projectionIndex++}`,
  );
  const railDay = todayState.completedToday ?? todayState.cursor ?? todayDay?.day;
  const lifts = activePlan ? resolveDashboardLifts(activePlan, exerciseIndex, profileQuery.data ?? null) : new Map();
  const seenFamilies = new Set<string>();
  const rails = (railDay?.exercises ?? []).filter(exercise => exercise.is_main_lift).flatMap(exercise => {
    const lift = lifts.get(exercise.exercise_id);
    if (!lift || seenFamilies.has(lift.family)) return [];
    seenFamilies.add(lift.family);
    const railSeries = replayE1RMSeries(historyQuery.data?.logs ?? [], familyByExerciseId, lift.family);
    let index = 0;
    return [{ ...lift, point: displayPoint(railSeries), periodLabel: e1RMPeriodLabel(railSeries, now), delta: e1RMDelta(railSeries, now), trajectory: ninetyDayRecordTrajectory(railSeries, now, () => `${lift.family}-${index++}`) }];
  });
  const notifications = buildNotifications({
    planId:
      latestPublishedPlan &&
      planSeenState.signatureKey === planSignatureKey &&
      planSeenState.unread
        ? latestPublishedPlan.id
        : null,
    weekIndex: currentWeekIndex,
    unreadFeedback: feedback.unreadCount,
  });

  const retryPlans = async () => {
    const requests: Promise<unknown>[] = [plansQuery.refetch()];
    if (activeSummary) requests.push(detailQuery.refetch());
    if (activePlan) requests.push(week.reload());
    await Promise.all(requests);
  };

  const retryE1RM = async () => {
    await Promise.all([
      historyQuery.refetch(),
      exerciseCatalogQuery.refetch(),
      profileQuery.refetch(),
    ]);
  };

  const reload = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const requests: Promise<unknown>[] = [
        plansQuery.refetch(),
        week.reload(),
        feedback.reload(),
        profileQuery.refetch(),
        exerciseCatalogQuery.refetch(),
      ];
      if (activeSummary) {
        requests.push(detailQuery.refetch());
      }
      if (activePlan) {
        requests.push(historyQuery.refetch());
      }
      await Promise.all(requests);
    } finally {
      setIsRefreshing(false);
    }
  }, [
    activePlan,
    activeSummary,
    detailQuery,
    exerciseCatalogQuery,
    feedback,
    historyQuery,
    plansQuery,
    profileQuery,
    week,
  ]);

  const previousReloadToken = useRef(todayReloadToken);
  useEffect(() => {
    if (previousReloadToken.current !== todayReloadToken) {
      previousReloadToken.current = todayReloadToken;
      void reload();
    }
  }, [reload, todayReloadToken]);

  const previousPlanRevision = useRef(planRevision);
  useEffect(() => {
    if (previousPlanRevision.current !== planRevision) {
      previousPlanRevision.current = planRevision;
      const requests: Promise<unknown>[] = [plansQuery.refetch()];
      if (activeSummary) requests.push(detailQuery.refetch());
      void Promise.all(requests);
    }
  }, [activeSummary, detailQuery, planRevision, plansQuery]);

  const viewedPlans = useRef(new Set<string>());
  useEffect(() => {
    if (activePlan && !viewedPlans.current.has(activePlan.id)) {
      viewedPlans.current.add(activePlan.id);
      void track(AnalyticsEvent.PlanViewed, {
        plan_id: activePlan.id,
        week: currentWeekIndex,
      });
    }
  }, [activePlan, currentWeekIndex]);

  return {
    now,
    title: current ? dayCode(current) : activePlan?.days.length ? dayCode(sequenceDays(activePlan.days)[activePlan.days.length - 1]) : t('student.dashboardTodayScreen.copy001'),
    activePlan,
    week: week.state,
    todayDay,
    selectedDay,
    selectedDayID,
    selectDay: setRequestedDayID,
    today: todayState,
    cta: { interactive: todayState.stickyStartDay !== null, label: t('student.dashboardPrimaryAction.copy001') },
    plans: {
      isLoading:
        plansQuery.isPending ||
        (Boolean(activeSummary) && detailQuery.isPending) ||
        week.state.status === 'loading',
      isError:
        plansQuery.isError ||
        detailQuery.isError ||
        week.state.status === 'error',
      message: week.state.status === 'error' && !week.state.error ? t('student.dashboardTodayScreen.copy004') : t('student.dashboardTodayScreen.copy008'),
      retry: retryPlans,
    },
    e1rm: {
      rails,
      series,
      point,
      periodLabel: e1RMPeriodLabel(series, now),
      delta: e1RMDelta(series, now),
      trajectory,
      isLoading:
        Boolean(activePlan) &&
        historyQuery.isPending,
      isError: historyQuery.isError || liftMetadataUnavailable,
      retry: retryE1RM,
    },
    feedback,
    profile: profileQuery.data,
    profileError: profileQuery.isError,
    profileLoading: profileQuery.isPending,
    retryProfile: async () => {
      await profileQuery.refetch();
    },
    notifications,
    dismissPlanNotification: () => {
      if (!studentId || !planSignature || !planSignatureKey) return;
      setPlanSeenState({ signatureKey: planSignatureKey, unread: false });
      void markDashboardPlanSeen(studentId, planSignature).catch(() => undefined);
    },
    isRefreshing,
    reload,
  };
}
