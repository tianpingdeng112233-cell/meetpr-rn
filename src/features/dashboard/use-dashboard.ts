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
import { useSessionStore } from '@/api/session';
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
  dashboardCTA,
  dashboardTitle,
  e1RMDelta,
  e1RMPeriodLabel,
  replayE1RMSeries,
  selectDashboardPlan,
  selectLatestPublishedPlan,
  shouldOfferPlanShift,
  utcDateText,
  weekIndexForDate,
  canUndoPlanShift,
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
  selectedDate: string | null;
  selectDate: (date: string) => void;
  cta: { interactive: boolean; label: string };
  plans: {
    isLoading: boolean;
    isError: boolean;
    retry: () => Promise<void>;
  };
  e1rm: {
    series: E1RMSeries;
    point: ReturnType<typeof displayPoint>;
    periodLabel: '90 天' | '历史最佳';
    delta: number;
    trajectory: readonly E1RMSample[];
    isLoading: boolean;
    isError: boolean;
    retry: () => Promise<void>;
  };
  feedback: ReturnType<typeof useFeedbackInboxViewModel>;
  profile: ReturnType<typeof useOnboardingProfile>['data'];
  profileError: boolean;
  retryProfile: () => Promise<void>;
  notifications: DashboardNotification[];
  dismissPlanNotification: () => void;
  canShift: boolean;
  canUndoShift: boolean;
  isRefreshing: boolean;
  reload: () => Promise<void>;
};

export function useDashboardViewModel(studentId: string): DashboardViewModel {
  const now = new Date();
  const today = utcDateText(now);
  const todayReloadToken = useStudentTabsStore((state) => state.todayReloadToken);
  const planRevision = useStudentTabsStore((state) => state.planRevision);
  const role = useSessionStore((state) => state.user?.role);
  const plansQuery = usePlans(studentId);
  const planSummaries = plansQuery.data?.plans ?? [];
  const activeSummary = selectDashboardPlan(planSummaries, today);
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
  const currentWeekIndex = activePlan
    ? weekIndexForDate(activePlan, today)
    : activeSummary
      ? weekIndexForDate(activeSummary, today)
      : 1;
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
    dashboardE1RMRange(today),
    Boolean(activePlan),
  );
  const [requestedDate, setRequestedDate] = useState<string | null>(null);
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
  const todayDay = days.find((day) => day.date === today) ?? null;
  const selectedDate =
    (requestedDate && days.some((day) => day.date === requestedDate)
      ? requestedDate
      : null) ??
    todayDay?.date ??
    days.find((day) => day.day !== null)?.date ??
    days[0]?.date ??
    null;
  const selectedDay =
    days.find((day) => day.date === selectedDate) ?? todayDay ?? null;
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
  const todayLogs =
    week.state.status === 'loaded'
      ? week.state.logs.filter((log) => log.logged_date === today)
      : [];
  const canShift = shouldOfferPlanShift({
    role,
    plan: activeSummary,
    todayDay,
    todayLogs,
    now,
  });
  const undoAvailable = role === 'coached_student' && canUndoPlanShift(activeSummary, now);
  const notifications = buildNotifications({
    planId:
      latestPublishedPlan &&
      planSeenState.signatureKey === planSignatureKey &&
      planSeenState.unread
        ? latestPublishedPlan.id
        : null,
    weekIndex: latestPublishedPlan
      ? weekIndexForDate(latestPublishedPlan, today)
      : currentWeekIndex,
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
    title: dashboardTitle(todayDay),
    activePlan,
    week: week.state,
    todayDay,
    selectedDay,
    selectedDate,
    selectDate: setRequestedDate,
    cta: dashboardCTA(todayDay),
    plans: {
      isLoading:
        plansQuery.isPending ||
        (Boolean(activeSummary) && detailQuery.isPending) ||
        week.state.status === 'loading',
      isError:
        plansQuery.isError ||
        detailQuery.isError ||
        week.state.status === 'error',
      retry: retryPlans,
    },
    e1rm: {
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
    retryProfile: async () => {
      await profileQuery.refetch();
    },
    notifications,
    dismissPlanNotification: () => {
      if (!studentId || !planSignature || !planSignatureKey) return;
      setPlanSeenState({ signatureKey: planSignatureKey, unread: false });
      void markDashboardPlanSeen(studentId, planSignature).catch(() => undefined);
    },
    canShift,
    canUndoShift: undoAvailable,
    isRefreshing,
    reload,
  };
}
