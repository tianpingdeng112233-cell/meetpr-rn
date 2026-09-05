import {
  cursorDay,
  sequenceDays,
  selectCurrentPlan,
  planLogRange,
  workoutDayState,
  dayCode,
} from '@/domain/plan/sequence';
import { dayName } from '@/domain/plan/presentation';
import { prescriptionRestRPE } from '@/domain/plan/prescription';
import { useOnboardingProfile } from '@/api/domains/onboarding';
import { useMineBindRequest } from '@/api/domains/bind';
import {
  weightSuggestionOutcome,
  type SuggestionOutcome,
} from './suggestion-gating';
import { completionAvailability } from './hold-to-complete';
import { HoldToCompleteButton } from './HoldToCompleteButton';
import { completionError } from './completion-errors';
import { replayE1RMSeries } from '@/features/dashboard/model';
import { StudentTodayRefreshThrottle } from './refresh-throttle';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { t } from '@/i18n';
import { AnalyticsEvent, track } from '@/analytics';
import {
  usePlan,
  usePlans,
  useDayCompletion,
  planKeys,
  type PlanDetail,
} from '@/api/domains/plans';
import { readinessKeys, useReadiness } from '@/api/domains/readiness';
import { useSetLogs, useUpsertSetLog, setKeys } from '@/api/domains/sets';
import { useSessionStore } from '@/api/session';
import {
  AppButton,
  Card,
  Eyebrow,
  useColors,
  type Colors,
  Screen,
  spacing,
  typography,
} from '@/design';
import {
  buildE1RMSeries,
  E1RMRecorder,
  type PRBreakthroughEvent,
} from '@/domain/e1rm';
import { useStudentTabsStore } from '@/features/student-tabs';

import { DayCompletionBanner, SessionSummaryView } from './CompletionControls';
import { STORAGE_KEYS, TRAINING_LIMITS } from './constants';
import { isDraftTerminal, synthesizeDrafts } from './drafts';
import { recordTrainingSetE1RM } from './e1rm-live';
import {
  exerciseTitle,
  useExerciseMetadataResolver,
} from './exercise-metadata';
import { LoadGeneration } from './load-generation';
import type {
  ReadinessGateState,
  SessionReview,
  TrainingLoadState,
  WorkoutSetDraft,
} from './model';
import {
  formatWeight,
  gymDayText,
  historyRangeStart,
  parseFiniteDecimal,
  resolveRestSeconds,
} from './policy';
import { readRestPreference } from '@/features/settings/storage';
import { restSecondsForRPE } from '@/features/settings/rest-timer';
import { ReadinessSheet } from './ReadinessSheet';
import { RestTimer } from './RestTimer';
import { saveErrorCopy } from './save-errors';
import { SerialTaskQueue } from './serial-task-queue';
import { SetEntrySheet } from './SetEntrySheet';
import {
  readBoolean,
  readReview,
  trainingE1RMRepository,
  writeBoolean,
  writeReview,
} from './storage';
import { TrainingCalendarView } from './TrainingCalendarView';
import { trackTrainingTabVisit } from './training-analytics';
import { WorkoutBody } from './WorkoutBody';

const recorder = new E1RMRecorder(trainingE1RMRepository);
const EMPTY_E1RM_BY_EXERCISE: Record<string, number | null> = {};

function PRBanner({
  event,
  exerciseName,
}: {
  event: PRBreakthroughEvent;
  exerciseName: string;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Card style={styles.prBanner}>
      <Text style={styles.prTitle}>
        🎉 {t('student.progression.prTitle', [exerciseName])}
      </Text>
      <Text style={styles.prValue}>
        {formatWeight(event.breakthroughE1RMKg)} kg
        {event.previousMaxE1RMKg > 0
          ? t('student.progression.prPrevious', [
              formatWeight(event.previousMaxE1RMKg),
            ])
          : t('student.progression.prFirst')}
      </Text>
    </Card>
  );
}

export function TodayWorkoutView() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const studentId = useSessionStore((state) => state.user?.id ?? '');
  const [clockNow, setClockNow] = useState(() => new Date());
  const today = gymDayText(clockNow);
  const handoff = useStudentTabsStore((state) => state.trainingHandoff);
  const [requestedDayID, setRequestedDayID] = useState<string | null>(() =>
    handoff?.plan.trainee_id === studentId ? handoff.dayID : null,
  );
  const [startedDays, setStartedDays] = useState<Record<string, boolean>>({});
  const [startedLoaded, setStartedLoaded] = useState<string | null>(null);
  const router = useRouter();
  const throttle = useRef(new StudentTodayRefreshThrottle());
  const bumpCompletion = useStudentTabsStore(
    (state) => state.bumpCompletionRevision,
  );
  const profileQuery = useOnboardingProfile(studentId);
  const binding = useMineBindRequest();
  const coachName =
    binding.data?.bind_request?.coach_display_name ??
    t('student.dashboardView.copy003');
  const [draftOverrides, setDraftOverrides] = useState<
    Record<string, WorkoutSetDraft>
  >({});
  const [editingPlan, setEditingPlan] = useState<PlanDetail | null>(null);
  const [recordingSetId, setRecordingSetId] = useState<string | null>(null);
  const [collarState, setCollarState] = useState({
    studentId: '',
    value: false,
  });
  const [restSeconds, setRestSeconds] = useState<number | null>(null);
  const [reviewState, setReviewState] = useState<{
    key: string;
    status: 'loading' | 'loaded';
    value: SessionReview | null;
  }>(() => ({ key: '', status: 'loading', value: null }));
  const [summaryVisible, setSummaryVisible] = useState(false);
  const [readinessVisible, setReadinessVisible] = useState(false);
  const [readinessSkipState, setReadinessSkipState] = useState({
    key: '',
    value: false,
  });
  const [prEvent, setPREvent] = useState<PRBreakthroughEvent | null>(null);
  const [e1rmState, setE1rmState] = useState<{
    key: string;
    values: Record<string, number | null>;
  }>({ key: '', values: {} });
  const saveQueue = useRef(new SerialTaskQueue());
  const jumpToken = useStudentTabsStore((state) => state.trainingJumpToken);
  const planRevision = useStudentTabsStore((state) => state.planRevision);
  const previousJump = useRef(jumpToken);
  const previousRevision = useRef(planRevision);
  const loadGeneration = useRef(new LoadGeneration());
  const queryClient = useQueryClient();
  const resolveExerciseMetadata = useExerciseMetadataResolver(studentId);
  const plansQuery = usePlans(studentId);
  const selectedPlan =
    editingPlan?.trainee_id === studentId
      ? editingPlan
      : selectCurrentPlan(plansQuery.data?.plans ?? []);
  const planQuery = usePlan(selectedPlan?.id ?? '');
  const plan =
    editingPlan?.trainee_id === studentId ? editingPlan : planQuery.data;
  const orderedDays = sequenceDays(plan?.days ?? []);
  const cursor = cursorDay(orderedDays);
  const planDay =
    orderedDays.find((day) => day.id === requestedDayID) ??
    cursor ??
    orderedDays[orderedDays.length - 1];
  const selectedDayID = planDay?.id ?? null;
  const dayState = planDay
    ? workoutDayState(orderedDays, planDay, clockNow)
    : null;
  const editable = dayState?.kind === 'current';
  const reviewKey = `${studentId}:${selectedDayID}`;
  const review =
    reviewState.key === reviewKey && reviewState.status === 'loaded'
      ? reviewState.value
      : null;
  const reviewLoaded =
    reviewState.key === reviewKey && reviewState.status === 'loaded';
  const collarOn =
    collarState.studentId === studentId ? collarState.value : false;
  const readinessSkipKey = `${studentId}:${today}`;
  const readinessSkipped =
    readinessSkipState.key === readinessSkipKey && readinessSkipState.value;
  const range = plan
    ? planLogRange(plan)
    : { from: today, to: today, scope: 'plan' as const };
  const logsQuery = useSetLogs(studentId, range, Boolean(plan));
  const historyQuery = useSetLogs(
    studentId,
    { from: '1970-01-01', to: today },
    Boolean(plan),
  );
  const readinessQuery = useReadiness(studentId, today);
  const upsert = useUpsertSetLog();
  const completion = useDayCompletion(plan?.id ?? '');
  const undoCompletion = useDayCompletion(plan?.id ?? '', true);
  const logs = useMemo(
    () => logsQuery.data?.logs ?? [],
    [logsQuery.data?.logs],
  );
  const e1rmKey = `${studentId}:${planDay?.id ?? ''}`;
  const e1rmByExercise =
    e1rmState.key === e1rmKey ? e1rmState.values : EMPTY_E1RM_BY_EXERCISE;
  const synthesizedDrafts = planDay ? synthesizeDrafts(planDay, logs) : [];
  const liveDrafts = synthesizedDrafts.map((draft) =>
    draftOverrides[draft.stableSetId]?.sourceLog?.student_id === studentId
      ? draftOverrides[draft.stableSetId]
      : draft,
  );

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    const delay = 60_000 - (Date.now() % 60_000);
    const timeout = setTimeout(() => {
      setClockNow(new Date());
      interval = setInterval(() => setClockNow(new Date()), 60_000);
    }, delay);
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const generation = loadGeneration.current.begin('collar');
    if (!studentId) return;
    void readBoolean(STORAGE_KEYS.collar(studentId)).then((stored) => {
      if (loadGeneration.current.isCurrent('collar', generation)) {
        setCollarState({ studentId, value: stored });
      }
    });
  }, [studentId]);

  useFocusEffect(
    useCallback(() => {
      void trackTrainingTabVisit();
      if (!studentId) return undefined;
      let active = true;
      const timer = setTimeout(() => {
        void trainingE1RMRepository
          .unacknowledgedPRs(studentId)
          .then((events) => {
            if (events[0] && active) setPREvent(events[0]);
          });
      }, TRAINING_LIMITS.prReplayDelayMs);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }, [studentId]),
  );

  useEffect(() => {
    if (!prEvent) return;
    const timer = setTimeout(
      () => setPREvent(null),
      TRAINING_LIMITS.transientBannerMs,
    );
    return () => clearTimeout(timer);
  }, [prEvent]);

  useEffect(() => {
    const generation = loadGeneration.current.begin('review');
    const key = `${studentId}:${selectedDayID}`;
    if (!studentId || !selectedDayID) return;
    void readReview(studentId, selectedDayID).then((storedReview) => {
      if (!loadGeneration.current.isCurrent('review', generation)) return;
      setReviewState({ key, status: 'loaded', value: storedReview });
    });
  }, [selectedDayID, studentId]);

  useEffect(() => {
    const generation = loadGeneration.current.begin('readiness-skip');
    if (!studentId) return;
    void readBoolean(STORAGE_KEYS.readinessSkip(studentId, today)).then(
      (skipped) => {
        if (loadGeneration.current.isCurrent('readiness-skip', generation)) {
          setReadinessSkipState({
            key: `${studentId}:${today}`,
            value: skipped,
          });
        }
      },
    );
  }, [studentId, today]);

  useEffect(() => {
    const generation = loadGeneration.current.begin('e1rm');
    if (!studentId || !planDay) return;
    const key = `${studentId}:${planDay.id}`;
    const exerciseIds = planDay.exercises.map(
      (exercise) => exercise.exercise_id,
    );
    void trainingE1RMRepository
      .fetchHistories(studentId, exerciseIds)
      .then((histories) => {
        if (!loadGeneration.current.isCurrent('e1rm', generation)) return;
        const next: Record<string, number | null> = {};
        histories.forEach((history, exerciseId) => {
          const metadata = resolveExerciseMetadata(exerciseId);
          next[exerciseId] = metadata
            ? buildE1RMSeries(history, metadata.competitionFamily).currentKg
            : null;
        });
        setE1rmState({ key, values: next });
      });
  }, [planDay, resolveExerciseMetadata, studentId]);

  const refresh = useCallback(
    async (mode: 'full' | 'volatileOnly' = 'full') => {
      const requests: Promise<unknown>[] = [readinessQuery.refetch()];
      if (mode === 'full') {
        throttle.current.recordFullRefresh();
        requests.push(plansQuery.refetch());
        if (selectedPlan)
          requests.push(
            planQuery.refetch(),
            logsQuery.refetch(),
            historyQuery.refetch(),
          );
      }
      await Promise.all(requests);
    },
    [
      historyQuery,
      logsQuery,
      planQuery,
      plansQuery,
      readinessQuery,
      selectedPlan,
    ],
  );
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);
  useFocusEffect(
    useCallback(() => {
      void refreshRef.current(throttle.current.refreshWhenReturning());
    }, []),
  );
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setClockNow(new Date());
        void refreshRef.current(throttle.current.refreshWhenReturning());
      }
    });
    return () => listener.remove();
  }, []);
  useEffect(() => {
    if (jumpToken === previousJump.current) return;
    previousJump.current = jumpToken;
    void Promise.resolve().then(() => {
      if (handoff && handoff.plan.trainee_id === studentId) {
        queryClient.setQueryData(
          planKeys.detail(handoff.plan.id),
          handoff.plan,
        );
        queryClient.setQueryData(
          setKeys.range(studentId, planLogRange(handoff.plan)),
          { logs: handoff.existingLogs },
        );
        setRequestedDayID(handoff.dayID);
      } else setRequestedDayID(null);
      setRecordingSetId(null);
      setEditingPlan(null);
      void refreshRef.current(throttle.current.refreshWhenReturning());
    });
  }, [handoff, jumpToken, queryClient, studentId]);
  useEffect(() => {
    if (planRevision === previousRevision.current) return;
    previousRevision.current = planRevision;
    void refreshRef.current();
  }, [planRevision]);
  const startKey = `${studentId}:${selectedDayID}`;
  useEffect(() => {
    let cancelled = false;
    if (!selectedDayID) return;
    void readBoolean(`training.started.${startKey}`).then((started) => {
      if (cancelled) return;
      if (started)
        setStartedDays((current) => ({ ...current, [startKey]: true }));
      setStartedLoaded(startKey);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedDayID, startKey]);
  const selectedDraft =
    liveDrafts.find((draft) => draft.stableSetId === recordingSetId) ?? null;
  const state: TrainingLoadState =
    plansQuery.isLoading ||
    (selectedPlan && (planQuery.isLoading || logsQuery.isLoading)) ||
    (Boolean(planDay) && startedLoaded !== startKey)
      ? { kind: 'loading' }
      : plansQuery.isError || planQuery.isError || logsQuery.isError
        ? {
            kind: 'error',
            error: plansQuery.error ?? planQuery.error ?? logsQuery.error,
          }
        : !planDay
          ? { kind: 'noPlan' }
          : selectedDraft
            ? {
                kind: 'recording',
                planDay,
                drafts: liveDrafts,
                rowIndex: liveDrafts.indexOf(selectedDraft),
              }
            : { kind: 'loaded', planDay, drafts: liveDrafts };

  const outcomeForDraft = (draft: WorkoutSetDraft): SuggestionOutcome => {
    const family =
      resolveExerciseMetadata(draft.exercise.exercise_id)?.competitionFamily ??
      null;
    const registered = family ? profileQuery.data?.[`${family}_1rm_kg`] : null;
    return weightSuggestionOutcome({
      planSet: draft.planSet,
      exercise: draft.exercise,
      priorDrafts: liveDrafts.slice(0, liveDrafts.indexOf(draft)),
      sameDayLogs: liveDrafts
        .slice(0, liveDrafts.indexOf(draft))
        .flatMap((prior) =>
          prior.sourceLog && !prior.sourceLog.assumed ? [prior.sourceLog] : [],
        ),
      historyLogs: (historyQuery.data?.logs ?? []).filter(
        (log) =>
          log.logged_date >= historyRangeStart(today) &&
          !planDay?.exercises.some(
            (exercise) => exercise.id === log.plan_exercise_id,
          ),
      ),
      e1RMKg:
        e1rmByExercise[draft.exercise.exercise_id] ??
        (family
          ? replayE1RMSeries(
              historyQuery.data?.logs ?? [],
              new Map([[draft.exercise.exercise_id, family]]),
              family,
            ).currentKg
          : null),
      registeredOneRMKg: registered == null ? null : Number(registered),
      family,
    });
  };
  const suggestionOutcome = selectedDraft
    ? outcomeForDraft(selectedDraft)
    : null;
  const suggestion = suggestionOutcome?.suggestion ?? null;
  const openDraft = (draft: WorkoutSetDraft) => {
    if (editable && plan) {
      setEditingPlan(plan);
      setRequestedDayID(draft.exercise.plan_day_id);
      setRecordingSetId(draft.stableSetId);
    }
  };
  const selectDay = (id: string) => {
    loadGeneration.current.begin('review');
    loadGeneration.current.begin('e1rm');
    setReviewState({
      key: `${studentId}:${id}`,
      status: 'loading',
      value: null,
    });
    setSummaryVisible(false);
    setE1rmState({ key: '', values: {} });
    setRecordingSetId(null);
    setEditingPlan(null);
    setRequestedDayID(id);
  };
  const completeDay = async (undo = false) => {
    if (!planDay || completion.isPending || undoCompletion.isPending) return;
    setRequestedDayID(planDay.id);
    try {
      await (undo ? undoCompletion : completion).mutateAsync(planDay.id);
      if (!undo) setRestSeconds(null);
      bumpCompletion();
    } catch (error) {
      Alert.alert(
        t('student.todayWorkoutScreen.copy001'),
        completionError(error, undo),
      );
    }
  };
  const commit = (input: {
    stableSetId: string;
    weightText: string;
    repsText: string;
    rpeText: string;
    failed: boolean;
    completed?: boolean;
  }): Promise<void> => {
    const operation = async () => {
      const draft = liveDrafts.find(
        (candidate) => candidate.stableSetId === input.stableSetId,
      );
      if (!draft) return;
      const latestPlan = queryClient.getQueryData<PlanDetail>(
        planKeys.detail(plan?.id ?? ''),
      );
      if (
        !editable ||
        (latestPlan &&
          (latestPlan.status !== 'published' ||
            cursorDay(latestPlan.days)?.id !== selectedDayID))
      ) {
        Alert.alert(
          t('student.setEntrySheet.copy010'),
          t('student.todayWorkoutScreen.copy024'),
        );
        throw new Error('Selected day is no longer current');
      }
      const logDate = gymDayText(new Date());
      const completed = input.completed ?? true;
      const weight = parseFiniteDecimal(input.weightText);
      const reps = Number(input.repsText);
      const rpe = input.rpeText ? parseFiniteDecimal(input.rpeText) : null;
      if (
        weight === null ||
        weight < 0 ||
        !Number.isInteger(reps) ||
        reps < 0 ||
        reps > 99 ||
        (rpe !== null && (rpe < 0 || rpe > 10))
      ) {
        Alert.alert(
          t('student.setEntrySheet.copy010'),
          t('student.todayWorkoutViewModelRecordingError.copy004'),
          [{ text: t('student.restTimerExplanationView.copy005') }],
        );
        throw new Error('Invalid set input');
      }
      try {
        const response = await upsert.mutateAsync({
          plan_exercise_id: draft.exercise.id,
          logged_date: logDate,
          set_index: draft.setIndex,
          weight_kg: String(weight),
          reps,
          rpe: rpe === null ? null : String(rpe),
          completed: completed && !input.failed,
          failed: input.failed,
        });
        const nextStatus = input.failed
          ? 'failed'
          : completed
            ? 'complete'
            : 'pending';
        const nextDrafts = liveDrafts.map((candidate) =>
          candidate.stableSetId === draft.stableSetId
            ? ({
                ...candidate,
                status: nextStatus,
                weightText: input.weightText,
                repsText: input.repsText,
                rpeText: input.rpeText,
                sourceLog: {
                  id: response.id,
                  student_id: studentId,
                  plan_exercise_id: draft.exercise.id,
                  exercise_id: draft.exercise.exercise_id,
                  set_index: draft.setIndex,
                  weight_kg: String(weight),
                  reps,
                  rpe: rpe === null ? null : String(rpe),
                  completed: completed && !input.failed,
                  failed: input.failed,
                  assumed: false,
                  adhoc: false,
                  logged_date: logDate,
                  logged_at: response.logged_at,
                },
              } satisfies WorkoutSetDraft)
            : candidate,
        );
        const updatedDraft = nextDrafts.find(
          (candidate) => candidate.stableSetId === draft.stableSetId,
        );
        if (updatedDraft) {
          setDraftOverrides((current) => ({
            ...current,
            [updatedDraft.stableSetId]: updatedDraft,
          }));
        }
        setRecordingSetId(null);
        setEditingPlan(null);
        void track(AnalyticsEvent.SetLogged, {
          failed: input.failed,
          set_index: draft.setIndex,
          date: today,
        });

        if (!input.failed && completed) {
          const e1rm = await recordTrainingSetE1RM({
            recorder,
            repository: trainingE1RMRepository,
            resolveExerciseMetadata,
            input: {
              studentId,
              exerciseId: draft.exercise.exercise_id,
              setLogId: response.id,
              weightKg: weight,
              reps,
              rpe,
              completed,
              failed: false,
            },
          });
          if (e1rm.refreshed) {
            setE1rmState((current) => ({
              key: e1rmKey,
              values: {
                ...(current.key === e1rmKey ? current.values : {}),
                [draft.exercise.exercise_id]: e1rm.currentKg,
              },
            }));
          }
          if (e1rm.pr) setPREvent(e1rm.pr);
          if (
            draft.status !== 'complete' &&
            nextDrafts.some((candidate) => !isDraftTerminal(candidate))
          ) {
            // Rest band follows the RPE just logged; fall back to the prescription when the set has none.
            const restRPE = rpe ?? prescriptionRestRPE(draft.planSet);
            const preference = restSecondsForRPE(
              await readRestPreference(studentId).catch(
                () => ({ mode: 'automatic' }) as const,
              ),
              restRPE,
            );
            setRestSeconds(
              resolveRestSeconds({
                prescribed: draft.planSet.rest_seconds,
                preference,
                rpe: restRPE,
              }),
            );
          }
        }
      } catch (error) {
        Alert.alert(t('student.setEntrySheet.copy010'), saveErrorCopy(error), [
          { text: t('student.restTimerExplanationView.copy005') },
        ]);
        throw error;
      }
    };
    return saveQueue.current.enqueue(operation);
  };

  const realDrafts = liveDrafts.filter(
    (draft) => draft.sourceLog && !draft.sourceLog.assumed,
  );
  const recording =
    dayState?.kind === 'completed' ||
    (dayState?.kind === 'current' &&
      (Boolean(startedDays[startKey]) || realDrafts.length > 0));
  const remaining = liveDrafts.filter(
    (draft) =>
      !draft.sourceLog || draft.sourceLog.assumed || !isDraftTerminal(draft),
  );
  const completionUI = completionAvailability({
    editable,
    recording,
    realCount: realDrafts.length,
    remainingSets: remaining.length,
  });
  const readinessDone = Boolean(readinessQuery.data?.checkin);
  const readinessGate: ReadinessGateState = readinessQuery.isLoading
    ? 'unknown'
    : readinessDone
      ? 'done'
      : readinessSkipped
        ? 'skippedToday'
        : 'needed';
  const readinessLabel =
    readinessGate === 'done'
      ? t('student.todayWorkoutScreen.copy006')
      : readinessGate === 'skippedToday'
        ? t('student.todayWorkoutScreen.copy006')
        : t('coach.detail.todayStatus');

  return (
    <Screen style={styles.screen}>
      <View style={styles.nav}>
        <View>
          <Text style={styles.navTitle}>
            {planDay
              ? `${dayCode(planDay)} · ${dayName(planDay, resolveExerciseMetadata)}`
              : t('student.todayWorkoutView.copy011')}
          </Text>
          <Text style={styles.navDate}>{today}</Text>
        </View>
        <View style={styles.navActions}>
          {cursor && selectedDayID !== cursor.id ? (
            <AppButton
              variant="link"
              label={t('student.todayWorkoutView.copy010')}
              onPress={() => selectDay(cursor.id)}
            />
          ) : null}
          <Pressable
            accessibilityLabel={readinessLabel}
            onPress={() => setReadinessVisible(true)}
          >
            <MaterialCommunityIcons
              color={readinessDone ? colors.success : colors.textSecondary}
              name={readinessDone ? 'heart' : 'heart-outline'}
              size={25}
            />
          </Pressable>
          <Pressable
            accessibilityLabel={t('student.todayWorkoutScreen.copy005')}
            onPress={() => void refresh()}
          >
            <MaterialCommunityIcons
              color={colors.textSecondary}
              name="refresh"
              size={25}
            />
          </Pressable>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {prEvent ? (
          <PRBanner
            event={prEvent}
            exerciseName={exerciseTitle(
              resolveExerciseMetadata(prEvent.exerciseId),
            )}
          />
        ) : null}
        {state.kind === 'loading' ? (
          <ActivityIndicator
            color={colors.gold500}
            size="large"
            style={styles.center}
          />
        ) : null}
        {state.kind === 'error' ? (
          <Card style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {t('student.todayWorkoutScreen.copy001')}
            </Text>
            <Text style={styles.emptySub}>
              {state.error instanceof Error
                ? state.error.message
                : t('student.dashboardTodayScreen.copy008')}
            </Text>
            <Pressable onPress={() => void refresh()}>
              <Text style={styles.retry}>
                {t('student.bindGateView.copy003')}
              </Text>
            </Pressable>
          </Card>
        ) : null}
        {state.kind === 'noPlan' ? (
          <Card style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {t('student.todayWorkoutScreen.copy002')}
            </Text>
            <Text style={styles.emptySub}>
              {t('student.todayWorkoutScreen.copy003', [coachName])}
            </Text>
            <AppButton
              variant="secondary"
              label={t('student.todayWorkoutScreen.copy004')}
              onPress={() => router.navigate('/(student)/growth')}
            />
            <AppButton
              variant="link"
              label={t('student.todayWorkoutScreen.copy005')}
              onPress={() => void refresh()}
            />
          </Card>
        ) : null}
        {state.kind === 'loaded' || state.kind === 'recording' ? (
          <>
            <Eyebrow label={t('student.todayWorkoutScreen.copy017')} />
            {dayState && dayState.kind !== 'current' ? (
              <View
                style={[
                  styles.readOnly,
                  {
                    borderWidth: 1,
                    borderColor: colors.borderSubtle,
                    borderRadius: 12,
                    gap: 10,
                  },
                ]}
              >
                <Text style={styles.readOnlyText}>
                  {t(
                    dayState.kind === 'completed'
                      ? 'student.todayWorkoutScreen.copy024'
                      : 'student.todayWorkoutScreen.copy026',
                  )}
                </Text>
                {dayState.kind === 'completed' && dayState.canUndo ? (
                  <AppButton
                    variant="link"
                    label={t('student.todayWorkoutScreen.copy023')}
                    disabled={undoCompletion.isPending}
                    onPress={() => void completeDay(true)}
                  />
                ) : null}
                {dayState.kind === 'upcoming' && dayState.previousDay ? (
                  <Text style={styles.emptySub}>
                    {t('student.trainingCalendarLogic.copy012', [
                      dayState.previousDay.week_number,
                      dayName(dayState.previousDay, resolveExerciseMetadata),
                    ])}
                  </Text>
                ) : null}
              </View>
            ) : null}
            <WorkoutBody
              exercises={state.planDay.exercises}
              drafts={state.drafts}
              editable={editable}
              recording={recording}
              startLoading={startedLoaded !== startKey}
              onStart={() => {
                setStartedDays((current) => ({ ...current, [startKey]: true }));
                void writeBoolean(`training.started.${startKey}`, true);
              }}
              suggestionForDraft={outcomeForDraft}
              historyLogs={(historyQuery.data?.logs ?? []).filter(
                (log) => log.logged_date < today,
              )}
              onRecord={openDraft}
              onToggleComplete={(draft) => {
                void commit({
                  stableSetId: draft.stableSetId,
                  weightText: draft.weightText,
                  repsText: draft.repsText,
                  rpeText: draft.rpeText,
                  failed: false,
                  completed: draft.status !== 'complete',
                }).catch(() => undefined);
              }}
              resolveExerciseMetadata={resolveExerciseMetadata}
            />
            {dayState?.kind === 'completed' ? (
              <DayCompletionBanner
                count={realDrafts.length}
                onPress={() => setSummaryVisible(true)}
              />
            ) : null}
            {completionUI.pill ? (
              <View
                style={{
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: colors.borderStrong,
                  borderRadius: 999,
                  padding: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <MaterialCommunityIcons
                  name="timer-outline"
                  size={16}
                  color={colors.textMuted}
                />
                <Text style={styles.emptySub}>
                  {t('student.todayWorkoutPresentation.copy001', [
                    new Set(remaining.map((draft) => draft.exercise.id)).size,
                    remaining.length,
                  ])}
                </Text>
              </View>
            ) : null}
            {completionUI.button ? (
              <HoldToCompleteButton
                disabled={completion.isPending || upsert.isPending}
                onComplete={() => void completeDay()}
              />
            ) : null}
          </>
        ) : null}
        {plan ? (
          <TrainingCalendarView
            key={plan.id}
            plan={plan}
            selectedDayID={selectedDayID}
            onSelectDay={selectDay}
            resolveExerciseMetadata={resolveExerciseMetadata}
          />
        ) : null}
      </ScrollView>
      {selectedDraft ? (
        <SetEntrySheet
          key={selectedDraft.stableSetId}
          collarOn={collarOn}
          draft={selectedDraft}
          editable={editable}
          exerciseName={exerciseTitle(
            resolveExerciseMetadata(selectedDraft.exercise.exercise_id),
          )}
          suggestion={suggestion}
          suggestionReason={suggestionOutcome?.reason ?? null}
          onChangeCollar={(value) => {
            setCollarState({ studentId, value });
            void writeBoolean(STORAGE_KEYS.collar(studentId), value);
          }}
          onClose={() => {
            setRecordingSetId(null);
            setEditingPlan(null);
          }}
          onSave={commit}
        />
      ) : null}
      {readinessVisible ? (
        <ReadinessSheet
          date={today}
          studentId={studentId}
          onComplete={() => {
            setReadinessVisible(false);
            void queryClient.invalidateQueries({ queryKey: readinessKeys.all });
          }}
          onSkip={() => {
            setReadinessSkipState({ key: readinessSkipKey, value: true });
            setReadinessVisible(false);
          }}
        />
      ) : null}
      {summaryVisible && reviewLoaded ? (
        <SessionSummaryView
          drafts={liveDrafts}
          initialReflection={review?.reflection}
          onClose={() => setSummaryVisible(false)}
          onComplete={async (reflection) => {
            const next = { completedAt: new Date().toISOString(), reflection };
            await writeReview(studentId, selectedDayID!, next);
            setReviewState({ key: reviewKey, status: 'loaded', value: next });
            setSummaryVisible(false);
            await track(AnalyticsEvent.WorkoutLogSave, {
              date: today,
              sets: liveDrafts.length,
            });
          }}
        />
      ) : null}
      {restSeconds !== null ? (
        <RestTimer
          durationSeconds={restSeconds}
          studentId={studentId}
          onClose={() => setRestSeconds(null)}
        />
      ) : null}
    </Screen>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    screen: { flex: 1 },
    nav: {
      alignItems: 'center',
      borderBottomColor: colors.borderDefault,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      justifyContent: 'space-between',
      minHeight: 64,
      paddingHorizontal: spacing.base,
    },
    navTitle: { color: colors.textPrimary, ...typography.bodyEmphasis },
    navDate: {
      color: colors.textTertiary,
      marginTop: 2,
      ...typography.caption,
    },
    navActions: { flexDirection: 'row', gap: spacing.base },
    content: { gap: spacing.md, padding: spacing.base, paddingBottom: 120 },
    center: { marginVertical: spacing.xxl },
    empty: { alignItems: 'center', gap: spacing.md, padding: spacing.xl },
    emptyTitle: { color: colors.textPrimary, ...typography.headline },
    emptySub: { color: colors.textSecondary, ...typography.body },
    retry: { color: colors.gold500, ...typography.bodyEmphasis },
    readOnly: {
      backgroundColor: colors.bgInset,
      borderRadius: 8,
      padding: spacing.md,
    },
    readOnlyText: {
      color: colors.textSecondary,
      textAlign: 'center',
      ...typography.footnote,
    },
    prBanner: {
      backgroundColor: colors.successTint,
      borderColor: colors.success,
      gap: spacing.xs,
      padding: spacing.base,
    },
    prTitle: { color: colors.textPrimary, ...typography.bodyEmphasis },
    prValue: { color: colors.success, ...typography.footnote },
  });
