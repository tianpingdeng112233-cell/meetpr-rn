import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { t } from '@/i18n';
import { AnalyticsEvent, track } from '@/analytics';
import { usePlan, usePlans, type PlanDay, type PlanDetail } from '@/api/domains/plans';
import { readinessKeys, useReadiness } from '@/api/domains/readiness';
import { useSetLogs, useUpsertSetLog, type SetLog } from '@/api/domains/sets';
import { useSessionStore } from '@/api/session';
import { Card, useColors, type Colors, Screen, spacing, typography } from '@/design';
import { buildE1RMSeries, E1RMRecorder, type PRBreakthroughEvent } from '@/domain/e1rm';
import { useStudentTabsStore } from '@/features/student-tabs';

import { DayCompletionBanner, SessionSummaryView, SlideToCompleteButton } from './CompletionControls';
import { STORAGE_KEYS, TRAINING_LIMITS } from './constants';
import { isDraftTerminal, synthesizeDrafts } from './drafts';
import { recordTrainingSetE1RM } from './e1rm-live';
import { exerciseTitle, useExerciseMetadataResolver } from './exercise-metadata';
import { LoadGeneration } from './load-generation';
import type { CalendarDayStatus, ReadinessGateState, SessionReview, TrainingLoadState, WeightSuggestion, WorkoutSetDraft } from './model';
import {
  addDays,
  formatWeight,
  gymDayText,
  historyRangeStart,
  isGymDayEditable,
  parseFiniteDecimal,
  resolveRestSeconds,
  scheduledDate,
  selectWeightSuggestion,
} from './policy';
import { readRestPreference } from '@/features/settings/storage';
import { restSecondsForRPE } from '@/features/settings/rest-timer';
import { ReadinessSheet } from './ReadinessSheet';
import { RestTimer } from './RestTimer';
import { GYM_DAY_SAVE_ERROR, saveErrorCopy } from './save-errors';
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

function matchingPlan(plans: readonly { start_date: string; end_date: string; total_shift_days: number; id: string }[], date: string) {
  return plans.find((plan) => date >= plan.start_date && date <= addDays(plan.end_date, plan.total_shift_days));
}

function planDayForDate(plan: PlanDetail | undefined, date: string): PlanDay | undefined {
  return plan?.days.find((day) => scheduledDate(plan.start_date, day) === date);
}

function stateForDay(plan: PlanDetail | undefined, logs: readonly SetLog[], date: string): CalendarDayStatus {
  const day = planDayForDate(plan, date);
  if (!day) return 'noPlan';
  const drafts = synthesizeDrafts(day, logs.filter((log) => log.logged_date === date));
  if (!drafts.length || drafts.every((draft) => draft.status === 'pending')) return 'notStarted';
  return drafts.every(isDraftTerminal) ? 'complete' : 'partial';
}

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
      <Text style={styles.prTitle}>{/* TODO(i18n:missing) */}🎉 今天你的{exerciseName} {/* TODO(i18n:missing) */}e1RM 突破!</Text>
      <Text style={styles.prValue}>
        {formatWeight(event.breakthroughE1RMKg)} kg
        {event.previousMaxE1RMKg > 0
          ? /* TODO(i18n:missing) */ ` (此前 ${formatWeight(event.previousMaxE1RMKg)} kg)`
          : /* TODO(i18n:missing) */ ',第一个纪录点'}
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
  const [selectedDate, setSelectedDate] = useState(today);
  const [draftOverrides, setDraftOverrides] = useState<Record<string, WorkoutSetDraft>>({});
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
  const reviewKey = `${studentId}:${selectedDate}`;
  const review = reviewState.key === reviewKey && reviewState.status === 'loaded'
    ? reviewState.value
    : null;
  const reviewLoaded =
    reviewState.key === reviewKey && reviewState.status === 'loaded';
  const collarOn =
    collarState.studentId === studentId ? collarState.value : false;
  const readinessSkipKey = `${studentId}:${today}`;
  const readinessSkipped =
    readinessSkipState.key === readinessSkipKey && readinessSkipState.value;

  const plansQuery = usePlans(studentId);
  const selectedPlan = matchingPlan(plansQuery.data?.plans ?? [], selectedDate);
  const planQuery = usePlan(selectedPlan?.id ?? '');
  const rangeFrom = historyRangeStart(selectedDate);
  const rangeTo = selectedPlan
    ? (addDays(selectedPlan.end_date, selectedPlan.total_shift_days) > selectedDate
        ? addDays(selectedPlan.end_date, selectedPlan.total_shift_days)
        : selectedDate)
    : selectedDate;
  const logsQuery = useSetLogs(selectedPlan ? studentId : '', { from: rangeFrom, to: rangeTo, scope: 'plan' });
  const readinessQuery = useReadiness(studentId, today);
  const upsert = useUpsertSetLog();
  const plan = planQuery.data;
  const logs = useMemo(() => logsQuery.data?.logs ?? [], [logsQuery.data?.logs]);
  const planDay = planDayForDate(plan, selectedDate);
  const e1rmKey = `${studentId}:${planDay?.id ?? ''}`;
  const e1rmByExercise =
    e1rmState.key === e1rmKey
      ? e1rmState.values
      : EMPTY_E1RM_BY_EXERCISE;
  const synthesizedDrafts = useMemo(
    () =>
      planDay
        ? synthesizeDrafts(
            planDay,
            logs.filter((log) => log.logged_date === selectedDate),
          )
        : [],
    [logs, planDay, selectedDate],
  );
  const liveDrafts = useMemo(
    () =>
      synthesizedDrafts.map(
        (draft) => draftOverrides[draft.stableSetId] ?? draft,
      ),
    [draftOverrides, synthesizedDrafts],
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
        void trainingE1RMRepository.unacknowledgedPRs(studentId).then((events) => {
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
    const timer = setTimeout(() => setPREvent(null), TRAINING_LIMITS.transientBannerMs);
    return () => clearTimeout(timer);
  }, [prEvent]);

  useEffect(() => {
    const generation = loadGeneration.current.begin('review');
    const key = `${studentId}:${selectedDate}`;
    if (!studentId) return;
    void readReview(studentId, selectedDate).then((storedReview) => {
      if (!loadGeneration.current.isCurrent('review', generation)) return;
      setReviewState({ key, status: 'loaded', value: storedReview });
    });
  }, [selectedDate, studentId]);

  useEffect(() => {
    const generation = loadGeneration.current.begin('readiness-skip');
    if (!studentId) return;
    void readBoolean(STORAGE_KEYS.readinessSkip(studentId, today)).then(
      (skipped) => {
        if (
          loadGeneration.current.isCurrent('readiness-skip', generation)
        ) {
          setReadinessSkipState({ key: `${studentId}:${today}`, value: skipped });
        }
      },
    );
  }, [studentId, today]);

  useEffect(() => {
    const generation = loadGeneration.current.begin('e1rm');
    if (!studentId || !planDay) return;
    const key = `${studentId}:${planDay.id}`;
    const exerciseIds = planDay.exercises.map((exercise) => exercise.exercise_id);
    void trainingE1RMRepository.fetchHistories(studentId, exerciseIds).then((histories) => {
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

  const refresh = useCallback(async () => {
    await Promise.all([
      plansQuery.refetch(),
      selectedPlan ? planQuery.refetch() : Promise.resolve(),
      selectedPlan ? logsQuery.refetch() : Promise.resolve(),
    ]);
    setDraftOverrides({});
  }, [logsQuery, planQuery, plansQuery, selectedPlan]);

  useEffect(() => {
    if (jumpToken === previousJump.current) return;
    previousJump.current = jumpToken;
    void Promise.resolve().then(() => {
      setSelectedDate(gymDayText());
      return refresh();
    });
  }, [jumpToken, refresh]);

  useEffect(() => {
    if (planRevision === previousRevision.current) return;
    previousRevision.current = planRevision;
    void refresh();
  }, [planRevision, refresh]);

  const selectedDraft = liveDrafts.find((draft) => draft.stableSetId === recordingSetId) ?? null;
  const state: TrainingLoadState = plansQuery.isLoading || (selectedPlan && (planQuery.isLoading || logsQuery.isLoading))
    ? { kind: 'loading' }
    : plansQuery.isError || planQuery.isError || logsQuery.isError
      ? { kind: 'error', error: plansQuery.error ?? planQuery.error ?? logsQuery.error }
      : !planDay
        ? { kind: 'rest' }
        : selectedDraft
          ? { kind: 'recording', planDay, drafts: liveDrafts, rowIndex: liveDrafts.indexOf(selectedDraft) }
          : { kind: 'loaded', planDay, drafts: liveDrafts };

  const suggestion: WeightSuggestion = useMemo(() => {
    if (!selectedDraft) return null;
    const index = liveDrafts.indexOf(selectedDraft);
    return selectWeightSuggestion({
      planSet: selectedDraft.planSet,
      exercise: selectedDraft.exercise,
      priorDrafts: liveDrafts.slice(0, index),
      sameDayLogs: logs.filter((log) => log.logged_date === selectedDate),
      historyLogs: logs.filter((log) => log.logged_date < selectedDate),
      e1RMKg: e1rmByExercise[selectedDraft.exercise.exercise_id] ?? null,
    });
  }, [e1rmByExercise, liveDrafts, logs, selectedDate, selectedDraft]);

  const openDraft = (draft: WorkoutSetDraft) => {
    setRecordingSetId(draft.stableSetId);
  };

  const selectDate = (date: string) => {
    loadGeneration.current.begin('review');
    loadGeneration.current.begin('e1rm');
    setReviewState({
      key: `${studentId}:${date}`,
      status: 'loading',
      value: null,
    });
    setSummaryVisible(false);
    setE1rmState({ key: '', values: {} });
    setRecordingSetId(null);
    setSelectedDate(date);
  };

  const commit = (
    input: { stableSetId: string; weightText: string; repsText: string; rpeText: string; failed: boolean; completed?: boolean },
  ): Promise<void> => {
    const operation = async () => {
      const draft = liveDrafts.find((candidate) => candidate.stableSetId === input.stableSetId);
      if (!draft) return;
      if (!isGymDayEditable(selectedDate, new Date())) {
        Alert.alert(t('student.setEntrySheet.copy010'), GYM_DAY_SAVE_ERROR, [{ text: t('student.restTimerExplanationView.copy005') }]);
        throw new Error('Gym day changed before save');
      }
      const completed = input.completed ?? true;
      const weight = parseFiniteDecimal(input.weightText);
      const reps = Number(input.repsText);
      const rpe = input.rpeText ? parseFiniteDecimal(input.rpeText) : null;
      if (weight === null || weight < 0 || !Number.isInteger(reps) || reps < 0 || reps > 99 || (rpe !== null && (rpe < 0 || rpe > 10))) {
        Alert.alert(t('student.setEntrySheet.copy010'), t('student.todayWorkoutViewModelRecordingError.copy004'), [{ text: t('student.restTimerExplanationView.copy005') }]);
        throw new Error('Invalid set input');
      }
      try {
        const response = await upsert.mutateAsync({
          plan_exercise_id: draft.exercise.id,
          logged_date: selectedDate,
          set_index: draft.setIndex,
          weight_kg: String(weight),
          reps,
          rpe: rpe === null ? null : String(rpe),
          completed: completed && !input.failed,
          failed: input.failed,
        });
        const nextStatus = input.failed ? 'failed' : completed ? 'complete' : 'pending';
        const nextDrafts = liveDrafts.map((candidate) => candidate.stableSetId === draft.stableSetId ? {
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
            logged_date: selectedDate,
            logged_at: response.logged_at,
          },
        } satisfies WorkoutSetDraft : candidate);
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
        void track(AnalyticsEvent.SetLogged, { failed: input.failed, set_index: draft.setIndex, date: selectedDate });

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
          if (draft.status !== 'complete' && nextDrafts.some((candidate) => !isDraftTerminal(candidate))) {
            const preference = restSecondsForRPE(await readRestPreference(studentId).catch(() => ({ mode: 'automatic' } as const)), rpe);
            setRestSeconds(resolveRestSeconds({ prescribed: draft.planSet.rest_seconds, preference, rpe }));
          }
        }
      } catch (error) {
        Alert.alert(t('student.setEntrySheet.copy010'), saveErrorCopy(error), [{ text: t('student.restTimerExplanationView.copy005') }]);
        throw error;
      }
    };
    return saveQueue.current.enqueue(operation);
  };

  const allTerminal = liveDrafts.length > 0 && liveDrafts.every(isDraftTerminal);
  const editable = isGymDayEditable(selectedDate);
  const historical = selectedDate < today;
  const readinessDone = Boolean(readinessQuery.data?.checkin);
  const readinessGate: ReadinessGateState = readinessQuery.isLoading
    ? 'unknown'
    : readinessDone
      ? 'done'
      : readinessSkipped
        ? 'skippedToday'
        : 'needed';
  const readinessLabel = readinessGate === 'done'
    ? /* TODO(i18n:drift) */ '今日状态已填写'
    : readinessGate === 'skippedToday'
      ? /* TODO(i18n:drift) */ '今日状态已跳过'
      : t('coach.detail.todayStatus');

  return (
    <Screen style={styles.screen}>
      <View style={styles.nav}>
        <View><Text style={styles.navTitle}>{planDay ? `W${planDay.week_number}D${planDay.day_of_week} · ${exerciseTitle(resolveExerciseMetadata((planDay.exercises.find((exercise) => exercise.is_main_lift) ?? planDay.exercises[0])?.exercise_id ?? ''))}` : t('student.todayWorkoutView.copy011')}</Text><Text style={styles.navDate}>{selectedDate}</Text></View>
        <View style={styles.navActions}>
          <Pressable accessibilityLabel={readinessLabel} onPress={() => setReadinessVisible(true)}>
            <MaterialCommunityIcons color={readinessDone ? colors.success : colors.textSecondary} name={readinessDone ? 'heart' : 'heart-outline'} size={25} />
          </Pressable>
          <Pressable accessibilityLabel={/* TODO(i18n:missing) */ "刷新训练"} onPress={() => void refresh()}><MaterialCommunityIcons color={colors.textSecondary} name="refresh" size={25} /></Pressable>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <TrainingCalendarView selectedDate={selectedDate} statusForDate={(date) => stateForDay(plan, logs, date)} today={today} onSelectDate={selectDate} />
        {prEvent ? <PRBanner event={prEvent} exerciseName={exerciseTitle(resolveExerciseMetadata(prEvent.exerciseId))} /> : null}
        {state.kind === 'loading' ? <ActivityIndicator color={colors.gold500} size="large" style={styles.center} /> : null}
        {state.kind === 'error' ? <Card style={styles.empty}><Text style={styles.emptyTitle}>{t('student.todayWorkoutScreen.copy001')}</Text><Pressable onPress={() => void refresh()}><Text style={styles.retry}>{t('student.bindGateView.copy003')}</Text></Pressable></Card> : null}
        {state.kind === 'rest' ? <Card style={styles.empty}><Text style={styles.emptyTitle}>{selectedDate === today ? /* TODO(i18n:drift) */ '今日休息' : /* TODO(i18n:drift) */ '这天休息'}</Text><Text style={styles.emptySub}>{/* TODO(i18n:drift) */}看本周计划</Text></Card> : null}
        {(state.kind === 'loaded' || state.kind === 'recording') ? (
          <>
            {!editable ? <View style={styles.readOnly}><Text style={styles.readOnlyText}>{historical ? /* TODO(i18n:drift) */ '历史记录 · 不可修改' : /* TODO(i18n:drift) */ '未到训练日 · 仅预览'}</Text></View> : null}
            <WorkoutBody
              drafts={state.drafts}
              editable={editable}
              historyLogs={logs.filter((log) => log.logged_date < selectedDate)}
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
            {reviewLoaded && allTerminal && review ? <DayCompletionBanner count={liveDrafts.length} onPress={() => setSummaryVisible(true)} /> : null}
            {reviewLoaded && allTerminal && editable && !review ? <SlideToCompleteButton onComplete={() => setSummaryVisible(true)} /> : null}
          </>
        ) : null}
      </ScrollView>
      {selectedDraft ? (
        <SetEntrySheet
          key={selectedDraft.stableSetId}
          collarOn={collarOn}
          draft={selectedDraft}
          editable={editable}
          exerciseName={exerciseTitle(resolveExerciseMetadata(selectedDraft.exercise.exercise_id))}
          suggestion={suggestion}
          onChangeCollar={(value) => {
            setCollarState({ studentId, value });
            void writeBoolean(STORAGE_KEYS.collar(studentId), value);
          }}
          onClose={() => setRecordingSetId(null)}
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
            await writeReview(studentId, selectedDate, next);
            setReviewState({ key: reviewKey, status: 'loaded', value: next });
            setSummaryVisible(false);
            await track(AnalyticsEvent.WorkoutLogSave, {
              date: selectedDate,
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

const createStyles = (colors: Colors) => StyleSheet.create({
  screen: { flex: 1 },
  nav: { alignItems: 'center', borderBottomColor: colors.borderDefault, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', minHeight: 64, paddingHorizontal: spacing.base },
  navTitle: { color: colors.textPrimary, ...typography.bodyEmphasis },
  navDate: { color: colors.textTertiary, marginTop: 2, ...typography.caption },
  navActions: { flexDirection: 'row', gap: spacing.base },
  content: { gap: spacing.md, padding: spacing.base, paddingBottom: 120 },
  center: { marginVertical: spacing.xxl },
  empty: { alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  emptyTitle: { color: colors.textPrimary, ...typography.headline },
  emptySub: { color: colors.textSecondary, ...typography.body },
  retry: { color: colors.gold500, ...typography.bodyEmphasis },
  readOnly: { backgroundColor: colors.bgInset, borderRadius: 8, padding: spacing.md },
  readOnlyText: { color: colors.textSecondary, textAlign: 'center', ...typography.footnote },
  prBanner: { backgroundColor: colors.successTint, borderColor: colors.success, gap: spacing.xs, padding: spacing.base },
  prTitle: { color: colors.textPrimary, ...typography.bodyEmphasis },
  prValue: { color: colors.success, ...typography.footnote },
});
