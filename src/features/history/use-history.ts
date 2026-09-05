import { useQueries } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  buildExerciseIndex,
  planKeys,
  plansRepository,
  useExerciseCatalog,
  useOnboardingProfile,
  usePlans,
  useSetLogs,
  type SetLog,
} from '@/api/domains';
import type { E1RMHistoryPoint, LiftFamily, PRBreakthroughEvent } from '@/domain/e1rm';
import {
  buildResolvedExerciseFamilies,
  dashboardE1RMRange,
  replayE1RMHistoryPoints,
  utcDateText,
} from '@/features/dashboard/model';
import { useFeedbackInboxViewModel } from '@/features/dashboard/feedback-inbox';
import { exerciseDisplayName, t } from '@/i18n';
import { useStudentTabsStore } from '@/features/student-tabs';
import { trainingE1RMRepository } from '@/features/training/storage';

import {
  buildGrowthCurves,
  buildGrowthStats,
  buildHistoryWeeks,
  chartBuckets,
  LIFT_FAMILIES,
} from './model';
import type { GrowthState } from './types';

async function backfillImportedHistory(
  studentId: string,
  logs: readonly SetLog[],
  familyByExerciseId: ReadonlyMap<string, LiftFamily>,
): Promise<void> {
  const projected = LIFT_FAMILIES.flatMap((family) =>
    replayE1RMHistoryPoints(logs, familyByExerciseId, family).map(
      (point): E1RMHistoryPoint => ({
        ...point,
        id: `imported-${point.setLogId}`,
        origin: 'imported',
      }),
    ),
  );
  const histories = await trainingE1RMRepository.fetchHistories(
    studentId,
    [...new Set(projected.map((point) => point.exerciseId))],
  );
  const existingSetLogs = new Set(
    [...histories.values()].flatMap((points) =>
      points.map((point) => point.setLogId),
    ),
  );
  for (const point of projected) {
    if (!existingSetLogs.has(point.setLogId)) {
      await trainingE1RMRepository.upsertPoint(point);
      existingSetLogs.add(point.setLogId);
    }
  }
}

export type HistoryViewModel = {
  state: GrowthState;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
  reload: () => Promise<void>;
  acknowledgePR: (eventId: string) => Promise<void>;
};

export function useHistoryViewModel(studentId: string): HistoryViewModel {
  const now = useMemo(() => new Date(), []);
  const today = utcDateText(now);
  const importedHistoryRefreshToken = useStudentTabsStore(
    (state) => state.importedHistoryRefreshToken,
  );
  const plansQuery = usePlans(studentId);
  const planIds = useMemo(
    () => (plansQuery.data?.plans ?? []).map((plan) => plan.id),
    [plansQuery.data?.plans],
  );
  const detailQueries = useQueries({
    queries: planIds.map((planId) => ({
      queryKey: planKeys.detail(planId),
      queryFn: () => plansRepository.detail(planId),
      enabled: Boolean(studentId),
    })),
  });
  const logsQuery = useSetLogs(
    studentId,
    dashboardE1RMRange(today),
    Boolean(studentId),
  );
  const exerciseQuery = useExerciseCatalog(Boolean(studentId));
  const profileQuery = useOnboardingProfile(studentId);
  const feedback = useFeedbackInboxViewModel(studentId);
  const [prEvents, setPREvents] = useState<PRBreakthroughEvent[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const planDetails = useMemo(
    () => detailQueries.flatMap((query) => (query.data ? [query.data] : [])),
    [detailQueries],
  );
  const exerciseIndex = useMemo(
    () => buildExerciseIndex(exerciseQuery.data?.exercises ?? []),
    [exerciseQuery.data?.exercises],
  );
  const familyByExerciseId = useMemo(
    () =>
      buildResolvedExerciseFamilies(exerciseIndex, profileQuery.data ?? null),
    [exerciseIndex, profileQuery.data],
  );

  const loadPRs = useCallback(async () => {
    if (!studentId) return;
    setPREvents(await trainingE1RMRepository.unacknowledgedPRs(studentId));
  }, [studentId]);

  useEffect(() => {
    if (!studentId) return;
    let active = true;
    void trainingE1RMRepository.unacknowledgedPRs(studentId).then((events) => {
      if (active) setPREvents(events);
    });
    return () => {
      active = false;
    };
  }, [studentId]);

  const reload = useCallback(async () => {
    await Promise.all([
      plansQuery.refetch(),
      logsQuery.refetch(),
      exerciseQuery.refetch(),
      profileQuery.refetch(),
      feedback.reload(),
      ...detailQueries.map((query) => query.refetch()),
      loadPRs(),
    ]);
  }, [
    detailQueries,
    exerciseQuery,
    feedback,
    loadPRs,
    logsQuery,
    plansQuery,
    profileQuery,
  ]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [logsResult, exercisesResult, profileResult] = await Promise.all([
        logsQuery.refetch(),
        exerciseQuery.refetch(),
        profileQuery.refetch(),
        plansQuery.refetch(),
        feedback.reload(),
        ...detailQueries.map((query) => query.refetch()),
      ]);
      const freshExerciseIndex = buildExerciseIndex(
        exercisesResult.data?.exercises ?? exerciseQuery.data?.exercises ?? [],
      );
      const freshFamilies = buildResolvedExerciseFamilies(
        freshExerciseIndex,
        profileResult.data ?? profileQuery.data ?? null,
      );
      await backfillImportedHistory(
        studentId,
        logsResult.data?.logs ?? logsQuery.data?.logs ?? [],
        freshFamilies,
      );
      await loadPRs();
    } finally {
      setIsRefreshing(false);
    }
  }, [
    detailQueries,
    exerciseQuery,
    feedback,
    loadPRs,
    logsQuery,
    plansQuery,
    profileQuery,
    studentId,
  ]);

  const previousImportedToken = useRef(importedHistoryRefreshToken);
  useEffect(() => {
    if (previousImportedToken.current === importedHistoryRefreshToken) return;
    previousImportedToken.current = importedHistoryRefreshToken;
    void reload();
  }, [importedHistoryRefreshToken, reload]);

  const state = useMemo<GrowthState>(() => {
    if (!studentId) return { status: 'idle' };
    const loading =
      plansQuery.isPending ||
      logsQuery.isPending ||
      exerciseQuery.isPending ||
      profileQuery.isPending ||
      feedback.isLoading ||
      detailQueries.some((query) => query.isPending);
    const errorQuery = detailQueries.find((query) => query.isError);
    if (
      plansQuery.isError ||
      logsQuery.isError ||
      exerciseQuery.isError ||
      profileQuery.isError ||
      feedback.isError ||
      errorQuery
    ) {
      return {
        status: 'error',
        error:
          plansQuery.error ??
          logsQuery.error ??
          exerciseQuery.error ??
          profileQuery.error ??
          errorQuery?.error ??
          new Error(t('student.trainingHistoryView.copy022')),
      };
    }
    if (loading) return { status: 'loading' };
    const logs = logsQuery.data?.logs ?? [];
    const curves = buildGrowthCurves(logs, familyByExerciseId, now);
    const familyByPlanExerciseId = new Map<string, LiftFamily>();
    for (const plan of planDetails) {
      for (const day of plan.days) {
        for (const exercise of day.exercises) {
          const family = familyByExerciseId.get(exercise.exercise_id);
          if (family) familyByPlanExerciseId.set(exercise.id, family);
        }
      }
    }
    return {
      status: 'loaded',
      plans: planDetails,
      weeks: buildHistoryWeeks(planDetails, logs, exerciseIndex, today),
      logs,
      feedback: feedback.items,
      curves,
      stats: buildGrowthStats(logs, curves, profileQuery.data ?? null),
      volumeIntensity: chartBuckets(logs),
      familyByExerciseId,
      familyByPlanExerciseId,
      exerciseNames: new Map(
        [...exerciseIndex].map(([id, exercise]) => [id, exerciseDisplayName(exercise)]),
      ),
      prEvents,
    };
  }, [
    detailQueries,
    exerciseIndex,
    exerciseQuery.error,
    exerciseQuery.isError,
    exerciseQuery.isPending,
    familyByExerciseId,
    feedback.isError,
    feedback.isLoading,
    feedback.items,
    logsQuery.data?.logs,
    logsQuery.error,
    logsQuery.isError,
    logsQuery.isPending,
    now,
    planDetails,
    plansQuery.error,
    plansQuery.isError,
    plansQuery.isPending,
    prEvents,
    profileQuery.data,
    profileQuery.error,
    profileQuery.isError,
    profileQuery.isPending,
    studentId,
    today,
  ]);

  return {
    state,
    isRefreshing,
    refresh,
    reload,
    acknowledgePR: async (eventId) => {
      await trainingE1RMRepository.acknowledgePR(eventId);
      setPREvents((events) => events.filter((event) => event.id !== eventId));
    },
  };
}
