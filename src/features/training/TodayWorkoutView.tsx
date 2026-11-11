import { useEffortChoices, historicalEffortChoices } from './effort-preferences';
import { decodePrescription } from '@/domain/plan/prescription';
import { weightSuggestionOutcome } from './suggestion-gating';
import { useMineBindRequest } from '@/api/domains/bind';
import { useExerciseCatalog } from '@/api/domains/exercises';
import { useOnboardingProfile } from '@/api/domains/onboarding';
import type { SetLog, SetLogUpsertRequest } from '@/api/domains/sets';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import {
  canWriteTrainingDay,
  completedToday,
  cursorDay,
  dayCode,
  planLogRange,
  recommendedDate,
  selectCurrentPlan,
  sequenceDays,
  workoutDayState,
} from '@/domain/plan/sequence';
import { trainingWeekStrip } from '@/domain/plan/week-strip';
import { localDateText } from '@/domain/plan/workout-date-policy';
import { ExerciseNoteSheet } from '@/features/chat/ExerciseNoteSheet';
import { StudentEmptyState } from './StudentEmptyState';
import { studentEmptyState } from './student-empty-state';
import { MeetWeightStrip } from './MeetWeightStrip';
import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, Alert, AppState, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { isAccessoryExercise } from './accessory-quick-log';
import { effortFields, type EffortKind } from './actual-effort';
import { allDayLogRequest, buildAllDaySheet, completionWrites } from './all-day-sheet';
import { AllDayBody, useAllDayEditor } from './AllDayBody';
import { completionError } from './completion-errors';
import { StudentTodayRefreshThrottle } from './refresh-throttle';
import { SetCompletionCoordinator } from './set-sync/completion';
import { overlaySetLogs } from './set-sync/overlay';
import { isLocalSetId } from './set-sync/queue';
import { onSyncedDayCompletion, useSetSync } from './set-sync/runtime';
import { SetSyncCompletionControl } from './set-sync/SetSyncCompletionControl';
import { saveWorkoutSnapshot, useWorkoutSnapshot } from './set-sync/workout-snapshot';
import { StudentExercisePicker } from './StudentExercisePicker';
import { TrainingWeekStrip } from './TrainingWeekStrip';
import { completionVideoSummary } from './video-upload/completion-delivery';
import { hydrateRemoteVideoAttachments, hydrateVideoUploads, useVideoUploadStore, type VideoAttachmentSet } from './video-upload/store';
import { VideoCompletionControl } from './video-upload/VideoCompletionControl';

import { AnalyticsEvent, track } from '@/analytics';
import { planKeys, useDayCompletion, usePlan, usePlans, type PlanDetail } from '@/api/domains/plans';
import { setKeys, useSetLogs, useUpsertSetLog, useWeightSuggestions } from '@/api/domains/sets';
import { useSessionStore } from '@/api/session';
import { AppButton, Card, Screen, font, radius, spacing, typography, useColors, type Colors } from '@/design';
import { showToast } from '@/design/Toast';
import { E1RMRecorder, buildE1RMSeries } from '@/domain/e1rm';
import { useStudentTabsStore } from '@/features/student-tabs';
import { t } from '@/i18n';
import { localNoon } from './quick-log';

import { workoutCompletionPresentation, type CompletionReference } from './completion-presentation';
import { DayCompletionBanner, WorkoutCompletionFlowView, type WorkoutCompletionFlowPhase } from './CompletionControls';
import { HISTORY_WEIGHT_PREFILL_ENABLED, TRAINING_LIMITS } from './constants';
import { addExtraDraft, addStudentExercise, addStudentSet, studentAddedDrafts, synthesizeDrafts } from './drafts';
import { recordTrainingSetE1RM } from './e1rm-live';
import { createExerciseMetadataResolver, exerciseTitle } from './exercise-metadata';
import { LoadGeneration } from './load-generation';
import type { SessionReview, TrainingLoadState, WorkoutSetDraft } from './model';
import { gymDayText, parseFiniteDecimal } from './policy';
import { saveErrorCopy } from './save-errors';
import { SerialTaskQueue } from './serial-task-queue';
import { readReview, trainingE1RMRepository, writeReview } from './storage';
import { trackTrainingTabVisit } from './training-analytics';

const EMPTY_E1RM_BY_EXERCISE: Record<string, number | null> = {};

export function TodayWorkoutView() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const workoutScroll = useRef<ScrollView>(null);
  const accessoryPad = useRef<{ row: View; top: number; height: number } | null>(null);
  const workoutContent = useRef<View>(null!);
  const [accessoryPadHeight, setAccessoryPadHeight] = useState(0);
  const userScrolling = useRef(false);
  const completedRowToReveal = useRef<string | null>(null);
  const [completionDockHeight, setCompletionDockHeight] = useState(spacing.completionControlHeight + spacing.md * 2 + StyleSheet.hairlineWidth);
  const revealAccessoryRow = useCallback(() => {
    const target = accessoryPad.current;
    const scroll = workoutScroll.current;
    const content = workoutContent.current;
    const viewport = scroll?.getNativeScrollRef();
    if (!target || !scroll || !content || !viewport) return;
    const stillActive = () => accessoryPad.current === target;
    target.row.measureInWindow((_x, y, _width, height) => {
      if (!stillActive()) return;
      viewport.measureInWindow((_left, viewportTop) => {
        if (!stillActive() || (y >= viewportTop && y + height + spacing.lg <= target.top)) return;
        target.row.measureLayout(content, (_rowX, contentY, _rowWidth, rowHeight) => {
          if (!stillActive()) return;
          const offset = y < viewportTop ? contentY - spacing.lg : viewportTop + contentY + rowHeight + spacing.lg - target.top;
          scroll.scrollTo({ y: Math.max(0, offset), animated: false });
        });
      });
    });
  }, []);
  const onAccessoryPadLayout = useCallback((row: View | null, panel: { top: number; height: number } | null) => {
    accessoryPad.current = row && panel ? { row, ...panel } : null;
    setAccessoryPadHeight(row && panel ? panel.height : 0);
    if (row) completedRowToReveal.current = null;
    revealAccessoryRow();
  }, [revealAccessoryRow]);
  const studentId = useSessionStore((state) => state.user?.id ?? '');
  const savedWorkout = useWorkoutSnapshot(studentId);
  const catalogQuery = useExerciseCatalog(Boolean(studentId));
  const [clockNow, setClockNow] = useState(() => new Date());
  const today = gymDayText(clockNow);
  const handoff = useStudentTabsStore((state) => state.trainingHandoff);
  const [requestedDayID, setRequestedDayID] = useState<string | null>(() =>
    handoff?.plan.trainee_id === studentId ? handoff.dayID : null,
  );
  const notificationDay = useStudentTabsStore(store => store.videoNotificationDay);
  useEffect(() => {
    if (notificationDay?.studentId !== studentId) return;
    void Promise.resolve().then(() => {
      setRequestedDayID(notificationDay.dayId);
      useStudentTabsStore.setState({ videoNotificationDay: null });
    });
  }, [notificationDay, studentId]);
  const throttle = useRef(new StudentTodayRefreshThrottle());
  const bumpCompletion = useStudentTabsStore(
    (state) => state.bumpCompletionRevision,
  );
  const profileQuery = useOnboardingProfile(studentId);
  const workoutProfile = profileQuery.data !== undefined ? profileQuery.data : savedWorkout.snapshot?.profile;
  const binding = useMineBindRequest();
  const coachName =
    binding.data?.bind_request?.coach_display_name ??
    t('student.dashboardView.copy003');
  const [noteRow, setNoteRow] = useState<WorkoutSetDraft | null>(null);
  const [checkedExercises, setCheckedExercises] = useState<Record<string, ReadonlySet<string>>>({});
  const [draftOverrides, setDraftOverrides] = useState<
    Record<string, WorkoutSetDraft>
  >({});
  const pinnedDates = useRef(new Map<string, string>());
  const [removedLogs, setRemovedLogs] = useState<ReadonlySet<string>>(new Set());
  const [pickerVisible, setPickerVisible] = useState(false);
  const [draftOwner, setDraftOwner] = useState(studentId);
  if (draftOwner !== studentId) {
    setDraftOwner(studentId); setRequestedDayID(null); setDraftOverrides({}); setRemovedLogs(new Set()); setPickerVisible(false);
  }
  useEffect(() => { pinnedDates.current.clear(); }, [studentId]);
  const [editingPlan, setEditingPlan] = useState<PlanDetail | null>(handoff?.plan.trainee_id === studentId ? handoff.plan : null);
  const [trainingVisible, setTrainingVisible] = useState(true);
  const [reviewState, setReviewState] = useState<{
    key: string;
    status: 'loading' | 'loaded';
    value: SessionReview | null;
  }>(() => ({ key: '', status: 'loading', value: null }));
  const [completionPhase, setCompletionPhase] = useState<WorkoutCompletionFlowPhase | null>(null);
  const [e1rmState, setE1rmState] = useState<{
    key: string;
    values: Record<string, number | null>;
  }>({ key: '', values: {} });
  const [videoRefresh, setVideoRefresh] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const saveQueue = useRef(new SerialTaskQueue());
  const jumpToken = useStudentTabsStore((state) => state.trainingJumpToken);
  const planRevision = useStudentTabsStore((state) => state.planRevision);
  const previousJump = useRef(jumpToken);
  const previousRevision = useRef(planRevision);
  const loadGeneration = useRef(new LoadGeneration());
  const queryClient = useQueryClient();
  const resolveExerciseMetadata = useMemo(() => createExerciseMetadataResolver(
    catalogQuery.data?.exercises ?? savedWorkout.snapshot?.exercises, workoutProfile,
  ), [catalogQuery.data, savedWorkout.snapshot?.exercises, workoutProfile]);
  const resolveE1RMFamily = useCallback((exerciseId: string) =>
    resolveExerciseMetadata(exerciseId)?.competitionFamily ?? null, [resolveExerciseMetadata]);
  const recorder = useMemo(() => new E1RMRecorder(trainingE1RMRepository, {
    resolveFamily: resolveE1RMFamily,
  }), [resolveE1RMFamily]);
  const plansQuery = usePlans(studentId);
  const selectedPlan =
    editingPlan?.trainee_id === studentId
      ? editingPlan
      : selectCurrentPlan(plansQuery.data?.plans ?? (savedWorkout.snapshot ? [savedWorkout.snapshot.plan] : []));
  const planQuery = usePlan(selectedPlan?.id ?? '');
  const savedPlan = savedWorkout.snapshot?.plan.id === selectedPlan?.id ? savedWorkout.snapshot : null;
  const plan =
    editingPlan?.trainee_id === studentId ? editingPlan : planQuery.data ?? savedPlan?.plan;
  const range = plan
    ? { ...planLogRange(plan), scope: 'all' as const }
    : { from: today, to: today, scope: 'all' as const };
  const logsQuery = useSetLogs(studentId, range, Boolean(plan));
  const serverLogs = logsQuery.data?.logs ?? savedPlan?.logs;
  useEffect(() => {
    if (planQuery.data && logsQuery.data && catalogQuery.data && profileQuery.isSuccess) void saveWorkoutSnapshot(studentId, planQuery.data, logsQuery.data.logs, catalogQuery.data.exercises, profileQuery.data).catch(() => {});
    else if (plansQuery.data && !selectCurrentPlan(plansQuery.data.plans)) void saveWorkoutSnapshot(studentId, null).catch(() => {});
  }, [studentId, planQuery.data, logsQuery.data, plansQuery.data, catalogQuery.data, profileQuery.data, profileQuery.isSuccess]);
  const { queue: setSyncQueue, gate: completionGate, snapshot: syncSnapshot, setCompletionHandler, dayVideos, retryWaitingVideos } = useSetSync(studentId);
  useEffect(() => {
    if (logsQuery.data) void setSyncQueue.reconcileServerLogs(logsQuery.data.logs).catch(() => {});
  }, [setSyncQueue, logsQuery.data]);
  const logs = useMemo(
    () => overlaySetLogs(serverLogs ?? [], syncSnapshot),
    [serverLogs, syncSnapshot],
  );
  const orderedDays = sequenceDays(plan?.days ?? []);
  const cursor = cursorDay(orderedDays);
  const initialDayID = cursor?.id ?? completedToday(orderedDays, clockNow)?.id;
  if (trainingVisible && requestedDayID === null && serverLogs && initialDayID) setRequestedDayID(initialDayID);
  const weekStrip = trainingWeekStrip(plan, requestedDayID ?? initialDayID, today);
  const viewedWeek = weekStrip.week;
  const planDay = weekStrip.selectedDay;
  const selectedDayID = planDay?.id ?? null;
  const dayState = planDay
    ? workoutDayState(orderedDays, planDay, clockNow)
    : null;
  const editable = Boolean(plan && selectedDayID && canWriteTrainingDay(plan, selectedDayID));
  const reviewKey = `${studentId}:${selectedDayID}`;
  const [expandedExercises, setExpandedExercises] = useState<Record<string, string | null>>({});
  const exerciseCheckVersions = useRef<Record<string, number>>({});
  const exerciseCheckOperations = useRef<Record<string, number>>({});
  const review =
    reviewState.key === reviewKey && reviewState.status === 'loaded'
      ? reviewState.value
      : null;
  const reviewLoaded =
    reviewState.key === reviewKey && reviewState.status === 'loaded';
  const historyQuery = useSetLogs(
    studentId,
    { from: '1970-01-01', to: localDateText(clockNow), scope: 'all' },
    Boolean(plan),
  );
  const upsert = useUpsertSetLog();
  const completion = useDayCompletion(plan?.id ?? '');
  useEffect(() => setCompletionHandler(completion.mutateAsync), [setCompletionHandler, completion.mutateAsync]);
  const undoCompletion = useDayCompletion(plan?.id ?? '', true);
  const e1rmKey = `${studentId}:${planDay?.id ?? ''}`;
  const e1rmByExercise =
    e1rmState.key === e1rmKey ? e1rmState.values : EMPTY_E1RM_BY_EXERCISE;
  const availableLogs = logs.filter(log => !removedLogs.has(log.id));
  const synthesizedDrafts = planDay ? [...synthesizeDrafts(planDay, availableLogs), ...studentAddedDrafts(planDay.id, availableLogs)] : [];
  const synthesizedIDs = new Set(synthesizedDrafts.map(draft => draft.stableSetId));
  synthesizedDrafts.push(...Object.values({ ...syncSnapshot.drafts, ...draftOverrides }).filter(draft => draft.kind && draft.exercise.plan_day_id === selectedDayID && !synthesizedIDs.has(draft.stableSetId) && (syncSnapshot.drafts?.[draft.stableSetId] || (!syncSnapshot.pending.some(entry => entry.stableSetId === draft.stableSetId && entry.remove) && !syncSnapshot.confirmed[draft.stableSetId]?.remove)) &&
    (draft.kind === 'added' || planDay?.exercises.some(exercise => exercise.id === draft.exercise.id))));
  const effortChoices = useEffortChoices(studentId, synthesizedDrafts.map(row => row.exercise.exercise_id));
  const rememberEffort = (row: WorkoutSetDraft) => effortChoices.remember(row.exercise.exercise_id, row.effortKind ?? 'rpe');
  const baseDrafts = synthesizedDrafts.map(draft => {
    const local = draftOverrides[draft.stableSetId];
    if (local && !local.sourceLog && !draft.sourceLog) return local;
    // Empty effort has no RPE/RIR discriminator on the wire; retain this session's choice.
    return local && !local.rpeText && !draft.rpeText
      ? { ...draft, effortKind: local.effortKind } : draft;
  });
  const suggestionsQuery = useWeightSuggestions(studentId, selectedDayID ?? '', HISTORY_WEIGHT_PREFILL_ENABLED && editable);
  const prefilledDrafts = baseDrafts.map(draft => {
    const prescription = decodePrescription(draft.planSet);
    if (draft.sourceLog || draft.kind || draft.weightText || prescription.intensity?.kind !== 'pct') return draft;
    const family = resolveExerciseMetadata(draft.exercise.exercise_id)?.competitionFamily ?? null;
    const registered = family ? workoutProfile?.[`${family}_1rm_kg`] : null;
    const outcome = weightSuggestionOutcome({ planSet: draft.planSet, exercise: draft.exercise,
      priorDrafts: baseDrafts.slice(0, baseDrafts.indexOf(draft)), sameDayLogs: availableLogs,
      historyLogs: historyQuery.data?.logs ?? [], e1RMKg: e1rmByExercise[draft.exercise.exercise_id] ?? null,
      registeredOneRMKg: registered == null ? null : Number(registered), family });
    return outcome.suggestion ? { ...draft, weightText: String(outcome.suggestion.weightKg) } : draft;
  });
  const sheet = planDay ? buildAllDaySheet(planDay, availableLogs, HISTORY_WEIGHT_PREFILL_ENABLED ? suggestionsQuery.data?.suggestions ?? [] : [], {
    effortPreferences: { ...historicalEffortChoices(historyQuery.data?.logs ?? [], studentId, today), ...effortChoices.choices },
    drafts: prefilledDrafts, completedExercises: checkedExercises[reviewKey], expandedExerciseId: expandedExercises[reviewKey],
  }) : { exercises: [] };
  const liveDrafts = sheet.exercises.flatMap(block => block.rows);
  const accessoryDraftsRef = useRef(liveDrafts);
  useEffect(() => { accessoryDraftsRef.current = liveDrafts; }, [liveDrafts]);
  // Drafts are rebuilt each render; only changes to log identities need a fetch.
  const videoSetKey = JSON.stringify(
    liveDrafts.flatMap((draft) =>
      draft.sourceLog?.id && !isLocalSetId(draft.sourceLog.id)
        ? [{ stableSetId: draft.stableSetId, setLogId: draft.sourceLog.id }]
        : [],
    ),
  );
  useEffect(() => {
    const sets: VideoAttachmentSet[] = JSON.parse(videoSetKey);
    void hydrateRemoteVideoAttachments(studentId, sets);
  }, [studentId, selectedDayID, videoSetKey, videoRefresh]);

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

  useFocusEffect(
    useCallback(() => {
      void trackTrainingTabVisit();
      if (!studentId) return undefined;
      let active = true;
      const timer = setTimeout(() => {
        void trainingE1RMRepository
          .unacknowledgedPRs(studentId)
          .then((events) => {
            if (!active || useSessionStore.getState().user?.id !== studentId) return;
            return Promise.all(events.map(event => trainingE1RMRepository.acknowledgePR(event.id)));
          }).catch(() => {
            // Keep failed acknowledgements pending for the next visit.
          });
      }, TRAINING_LIMITS.prReplayDelayMs);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }, [studentId]),
  );

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
      const requests: Promise<unknown>[] = [];
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
      // Also refresh attachments on throttled tab returns and manual refreshes.
      setVideoRefresh((value) => value + 1);
    },
    [
      historyQuery,
      logsQuery,
      planQuery,
      plansQuery,
      selectedPlan,
    ],
  );
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);
  useFocusEffect(
    useCallback(() => {
      setTrainingVisible(true);
      setClockNow(new Date());
      void refreshRef.current(throttle.current.refreshWhenReturning());
      return () => {
        setTrainingVisible(false);
        setRequestedDayID(null);
      };
    }, [setRequestedDayID]),
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
      setEditingPlan(handoff?.plan.trainee_id === studentId ? handoff.plan : null);
      void refreshRef.current(throttle.current.refreshWhenReturning());
    });
  }, [handoff, jumpToken, queryClient, studentId]);
  useEffect(() => {
    if (planRevision === previousRevision.current) return;
    previousRevision.current = planRevision;
    void refreshRef.current();
  }, [planRevision]);
  const startKey = `${studentId}:${selectedDayID}`;
  const state: TrainingLoadState =
    (!savedWorkout.ready && !plansQuery.data) ||
    (!selectedPlan && plansQuery.isLoading) ||
    (selectedPlan && ((!plan && planQuery.isLoading) || (!serverLogs && logsQuery.isLoading)))
      ? { kind: 'loading' }
      // A failed background refetch keeps the loaded day; only a load with nothing to show is an error.
      : (!selectedPlan && plansQuery.isLoadingError) || (!plan && planQuery.isLoadingError) || (!serverLogs && logsQuery.isLoadingError)
        ? {
            kind: 'error',
            error: plansQuery.error ?? planQuery.error ?? logsQuery.error,
          }
        : !planDay
          ? { kind: 'noPlan' }
          : { kind: 'loaded', planDay, drafts: liveDrafts };
  const removeRecordedE1RM = async (draft: WorkoutSetDraft, setLogId: string) => {
    await trainingE1RMRepository.removeSetLog(studentId, setLogId);
    const exerciseId = draft.exercise.exercise_id;
    const history = await trainingE1RMRepository.fetchHistory(studentId, exerciseId);
    const metadata = resolveExerciseMetadata(exerciseId);
    const value = metadata ? buildE1RMSeries(history, metadata.competitionFamily).currentKg : null;
    const key = `${studentId}:${draft.exercise.plan_day_id}`;
    setE1rmState(current => current.key === key ? { key, values: { ...current.values, [exerciseId]: value } } : current);
  };
  const selectDay = (id: string | null) => {
    // Re-selecting the current day must not clear data whose load key is unchanged.
    if ((id ?? weekStrip.todayDay?.id) === selectedDayID) {
      setRequestedDayID(id ?? cursor?.id ?? null);
      return;
    }
    loadGeneration.current.begin('review');
    loadGeneration.current.begin('e1rm');
    setReviewState({
      key: `${studentId}:${id}`,
      status: 'loading',
      value: null,
    });
    setCompletionPhase(null);
    setPickerVisible(false);
    setE1rmState({ key: '', values: {} });
    setEditingPlan(null);
    setRequestedDayID(id ?? cursor?.id ?? null);
  };
  const refreshToday = async () => {
    if (refreshing) return;
    selectDay(null);
    setRefreshing(true);
    try { await refresh(); }
    finally { setRefreshing(false); }
  };
  const videoContext = { sets: liveDrafts.map(draft => ({ stableSetId: draft.stableSetId, setLogId: draft.sourceLog?.id })),
    exerciseIds: planDay?.exercises.map(exercise => exercise.id) ?? [] };
  const videoContextKey = JSON.stringify(videoContext);
  useEffect(() => {
    if (selectedDayID) void completionGate.updateVideoContext(selectedDayID, JSON.parse(videoContextKey)).catch(() => {});
  }, [completionGate, selectedDayID, videoContextKey]);
  useVideoUploadStore(store => store.records);
  useVideoUploadStore(store => store.attachmentEditRevision);
  const completionVideos = selectedDayID ? dayVideos(selectedDayID, videoContext).map(row => {
    const draft = liveDrafts.find(draft => draft.stableSetId === row.stableSetId || draft.sourceLog?.id === row.upload.setLogId);
    return { ...row, badge: draft ? { exerciseName: exerciseTitle(resolveExerciseMetadata(draft.exercise.exercise_id)),
      setOrdinal: draft.setIndex + 1, weightKg: Number(draft.weightText) || null, reps: Number(draft.repsText) || null, rpe: Number(draft.rpeText) || null } : undefined };
  }) : [];
  const waitingForNetwork = Boolean(selectedDayID && completionGate.awaitingNetwork(selectedDayID)) && dayState?.kind !== 'completed';
  const waitingForVideos = (Boolean(selectedDayID && completionGate.videoIntent(selectedDayID)) && dayState?.kind !== 'completed') || waitingForNetwork;
  const completionCoordinator = useMemo(() => new SetCompletionCoordinator(setSyncQueue, completionGate, {
    reward: () => { setCompletionPhase('celebration'); },
    prepareVideos: hydrateVideoUploads,
    videosDelivered: (dayId, context) => completionVideoSummary(dayVideos(dayId, context).map(row => row.upload)).delivered,
    error: error => { setCompletionPhase(null); Alert.alert(t('student.todayWorkoutScreen.copy001'), completionError(error, false)); },
  }), [setSyncQueue, completionGate, setCompletionPhase, dayVideos]);
  const syncCompletionState = useSyncExternalStore(completionCoordinator.subscribe, completionCoordinator.snapshot);
  useEffect(() => () => completionCoordinator.reset(), [completionCoordinator, selectedDayID]);
  useFocusEffect(useCallback(() => () => completionCoordinator.reset(), [completionCoordinator]));
  useEffect(() => onSyncedDayCompletion((owner) => {
    if (owner !== studentId) return;
    bumpCompletion();
    void queryClient.invalidateQueries({ queryKey: planKeys.all });
    void queryClient.invalidateQueries({ queryKey: setKeys.all });
  }), [studentId, queryClient, bumpCompletion]);
  const completeDay = async (undo = false) => {
    if (!planDay || completion.isPending || undoCompletion.isPending) return;
    setRequestedDayID(planDay.id);
    if (!undo) {
      try {
        for (const { row, request } of completionWrites(sheet)) await saveRow(row, request);
        await completionCoordinator.begin(planDay.id, syncCompletionState === 'failed', videoContext);
      } catch (error) { Alert.alert(t('student.setEntrySheet.copy010'), saveErrorCopy(error)); }
      return;
    }
    try {
      await undoCompletion.mutateAsync(planDay.id);
      await completionGate.forget(planDay.id);
      completionCoordinator.reset();
      bumpCompletion();
    } catch (error) { Alert.alert(t('student.todayWorkoutScreen.copy001'), completionError(error, true)); }
  };
  const commit = (input: {
    stableSetId: string;
    weightText: string;
    repsText: string;
    rpeText: string;
    effortKind?: EffortKind;
    failed: boolean;
    completed?: boolean;
    attachmentOnly?: boolean;
    accessory?: { request: SetLogUpsertRequest; mode: 'single' | 'all' };
    quickLogDate?: string;
  }): Promise<string | undefined> => {
    const operation = async () => {
      const currentDrafts = input.accessory ? accessoryDraftsRef.current : liveDrafts;
      const draft = currentDrafts.find(
        (candidate) => candidate.stableSetId === input.stableSetId,
      );
      if (!draft) return;
      if (useSessionStore.getState().user?.id !== studentId) throw new Error('Session changed');
      const latestPlan = queryClient.getQueryData<PlanDetail>(
        planKeys.detail(plan?.id ?? ''),
      );
      if (
        !editable ||
        (latestPlan &&
          (latestPlan.status !== 'published' ||
            !canWriteTrainingDay(latestPlan, selectedDayID ?? '')))
      ) {
        if (!input.attachmentOnly && !input.quickLogDate) Alert.alert(
          t('student.setEntrySheet.copy010'),
          t('student.todayWorkoutScreen.copy024'),
        );
        throw new Error('Selected day is no longer writable');
      }
      const logDate = !input.quickLogDate && draft.sourceLog && !isLocalSetId(draft.sourceLog.id)
        ? draft.sourceLog.logged_date
        : draft.kind === 'added'
          ? draft.loggedDate ?? pinnedDates.current.get(draft.exercise.id) ?? gymDayText(new Date())
          : input.quickLogDate ?? gymDayText(new Date());
      if (draft.kind === 'added') pinnedDates.current.set(draft.exercise.id, logDate);
      const completed = input.completed ?? true;
      const weight = parseFiniteDecimal(input.weightText);
      const reps = Number(input.repsText);
      const actualEffort = input.accessory?.request ?? effortFields(input.effortKind ?? 'rpe', input.rpeText);
      const rpe = actualEffort.rpe == null ? null : Number(actualEffort.rpe);
      const actualRIR = actualEffort.actual_rir ?? null;
      if (
        (input.weightText.trim() !== '' && weight === null) ||
        (weight !== null && weight < 0) ||
        !Number.isInteger(reps) ||
        reps < 0 ||
        reps > 99 ||
        (rpe !== null && (rpe < 0 || rpe > 10)) ||
        (actualRIR !== null && (!Number.isInteger(actualRIR) || actualRIR < 0 || actualRIR > 9))
      ) {
        if (!input.attachmentOnly && !input.quickLogDate) Alert.alert(
          t('student.setEntrySheet.copy010'),
          t('student.todayWorkoutViewModelRecordingError.copy004'),
          [{ text: t('student.restTimerExplanationView.copy005') }],
        );
        throw new Error('Invalid set input');
      }
      try {
        const inlineRequest = input.accessory?.request;
        const request: SetLogUpsertRequest = inlineRequest ? { ...inlineRequest, ...(draft.kind === 'added' ? { logged_date: logDate } : {}) } : {
          plan_exercise_id: draft.exercise.id,
          ...(input.quickLogDate ? { logged_date: input.quickLogDate } : {}),
          set_index: draft.setIndex,
          weight_kg: weight === null ? null : String(weight),
          reps,
          rpe: rpe === null ? null : String(rpe),
          actual_rir: actualRIR,
          completed: completed && !input.failed,
          failed: input.failed,
        };
        const response = input.quickLogDate ? await upsert.mutateAsync(request) : await setSyncQueue.enqueue({
          stableSetId: draft.stableSetId, dayId: draft.exercise.plan_day_id, exerciseId: draft.exercise.exercise_id, loggedDate: logDate,
          request: { ...request, logged_date: logDate },
        });
        const nextStatus = input.failed
          ? 'failed'
          : completed
            ? 'complete'
            : 'pending';
        const nextDrafts = currentDrafts.map((candidate) =>
          candidate.stableSetId === draft.stableSetId
            ? ({
                ...candidate,
                ...(draft.kind === 'added' ? { loggedDate: logDate } : {}),
                status: nextStatus,
                weightText: input.weightText,
                repsText: input.repsText,
                rpeText: actualRIR == null ? input.rpeText : String(actualRIR),
                effortKind: input.effortKind ?? (actualRIR == null ? 'rpe' : 'rir'),
                sourceLog: {
                  id: response.id,
                  student_id: studentId,
                  plan_exercise_id: draft.kind === 'added' ? null : draft.exercise.id,
                  plan_day_id: draft.kind === 'added' ? draft.exercise.plan_day_id : null,
                  exercise_id: draft.exercise.exercise_id,
                  set_index: draft.setIndex,
                  weight_kg: weight === null ? null : String(weight),
                  reps,
                  rpe: rpe === null ? null : String(rpe),
                  actual_rir: actualRIR,
                  completed: completed && !input.failed,
                  failed: input.failed,
                  assumed: false,
                  adhoc: draft.kind === 'added',
                  logged_date: logDate,
                  logged_at: input.quickLogDate ? localNoon(input.quickLogDate).toISOString() : response.logged_at,
                },
              } satisfies WorkoutSetDraft)
            : draft.kind === 'added' && candidate.exercise.id === draft.exercise.id ? { ...candidate, loggedDate: logDate } : candidate,
        );
        accessoryDraftsRef.current = nextDrafts;
        const updatedDraft = nextDrafts.find(
          (candidate) => candidate.stableSetId === draft.stableSetId,
        );
        if (updatedDraft) {
          setDraftOverrides((current) => ({
            ...current,
            ...Object.fromEntries(nextDrafts.filter(candidate => candidate.stableSetId === updatedDraft.stableSetId || (draft.kind === 'added' && candidate.exercise.id === draft.exercise.id)).map(candidate => [candidate.stableSetId, candidate])),
          }));
        }
        if (weight === null || (draft.kind && (!completed || input.failed))) {
          if (draft.sourceLog) await removeRecordedE1RM(draft, draft.sourceLog.id);
          await removeRecordedE1RM(draft, response.id);
          await removeRecordedE1RM(draft, `local:${draft.stableSetId}`);
        }
        if (input.attachmentOnly) return response.id;
          setEditingPlan(null);
        void track(AnalyticsEvent.SetLogged, {
          failed: input.failed,
          set_index: draft.setIndex,
          date: logDate,
        });

        if (!input.failed && completed && weight !== null) {
          const e1rm = await recordTrainingSetE1RM({
            recorder: input.quickLogDate ? new E1RMRecorder(trainingE1RMRepository, { now: () => localNoon(input.quickLogDate!), resolveFamily: resolveE1RMFamily }) : recorder,
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
          const confirmedId = setSyncQueue.snapshot().confirmed[draft.stableSetId]?.log.id;
          if (confirmedId && !input.quickLogDate) await trainingE1RMRepository.resolveSetLogId(studentId, `local:${draft.stableSetId}`, confirmedId);
          if (e1rm.refreshed) {
            setE1rmState((current) => ({
              key: e1rmKey,
              values: {
                ...(current.key === e1rmKey ? current.values : {}),
                [draft.exercise.exercise_id]: e1rm.currentKg,
              },
            }));
          }
          if (e1rm.pr && !input.quickLogDate) {
            await trainingE1RMRepository.acknowledgePR(e1rm.pr.id).catch(() => undefined);
          }

        }
        return response.id;
      } catch (error) {
        if (!input.attachmentOnly && !input.quickLogDate) Alert.alert(t('student.setEntrySheet.copy010'), saveErrorCopy(error), [
          { text: t('student.restTimerExplanationView.copy005') },
        ]);
        throw error;
      }
    };
    const saved = saveQueue.current.enqueue(operation);
    return input.attachmentOnly ? saved.then(id => id ? setSyncQueue.waitForSet(input.stableSetId) : undefined) : saved;
  };

  const saveRow = async (row: WorkoutSetDraft, request = allDayLogRequest(row)) => {
    const id = await commit({ stableSetId: row.stableSetId, weightText: row.weightText, repsText: row.repsText,
      rpeText: row.rpeText, effortKind: row.effortKind, failed: false, completed: true,
      accessory: { request, mode: 'all' } });
    if (!id) throw new Error('Set unavailable');
    return id;
  };
  const editor = useAllDayEditor(row => { void saveRow(row).catch(() => undefined); }, id => exerciseTitle(resolveExerciseMetadata(id)), onAccessoryPadLayout, `${reviewKey}:${trainingVisible}:${editable}:${workoutProfile?.unit_preference}`, workoutProfile?.unit_preference === 'lb' ? 'lb' : 'kg', rememberEffort);
  const toggleExercise = async (id: string) => {
    const version = (exerciseCheckVersions.current[reviewKey] ?? 0) + 1;
    exerciseCheckVersions.current[reviewKey] = version;
    const checkKey = `${reviewKey}:${id}`;
    exerciseCheckOperations.current[checkKey] = version;
    const old = checkedExercises[reviewKey] ?? new Set<string>();
    const next = new Set(old);
    if (next.has(id)) { next.delete(id); setCheckedExercises(current => ({ ...current, [reviewKey]: next })); setExpandedExercises(current => ({ ...current, [reviewKey]: id })); return; }
    next.add(id); setCheckedExercises(current => ({ ...current, [reviewKey]: next }));
    try {
      for (const { row, request } of completionWrites(sheet, id)) await saveRow(row, request);
      if (exerciseCheckVersions.current[reviewKey] !== version) return;
      const index = sheet.exercises.findIndex(block => block.exercise.id === id);
      const following = index < 0 ? null : sheet.exercises[index + 1]?.exercise.id ?? null;
      setExpandedExercises(current => ({ ...current, [reviewKey]: following }));
    }
    catch {
      if (exerciseCheckOperations.current[checkKey] === version) {
        setCheckedExercises(current => {
          const remaining = new Set(current[reviewKey]);
          remaining.delete(id);
          return { ...current, [reviewKey]: remaining };
        });
      }
    }
  };
  const requestRemoval = (rows: readonly WorkoutSetDraft[], wholeExercise: boolean) => {
    if (!editable || rows.some(row => !row.kind)) return;
    const remove = async () => {
      try {
        await saveQueue.current.enqueue(async () => {
          for (const original of rows) {
            if (useSessionStore.getState().user?.id !== studentId) throw new Error('Session changed');
            const latest = queryClient.getQueryData<PlanDetail>(planKeys.detail(plan?.id ?? ''));
            if (!latest || !canWriteTrainingDay(latest, original.exercise.plan_day_id)) throw new Error('Selected day is no longer writable');
            const draft = accessoryDraftsRef.current.find(row => row.stableSetId === original.stableSetId) ?? original;
            const attachment = useVideoUploadStore.getState().records[`${studentId}:${draft.stableSetId}`];
            if (attachment && attachment.status !== 'none') { showToast(t('student.added.hasVideo')); return; }
            if (draft.sourceLog) {
              await setSyncQueue.remove({ stableSetId: draft.stableSetId, dayId: draft.exercise.plan_day_id, log: draft.sourceLog });
              await removeRecordedE1RM(draft, draft.sourceLog.id);
              await removeRecordedE1RM(draft, `local:${draft.stableSetId}`);
              setRemovedLogs(current => new Set([...current, draft.sourceLog!.id]));
              queryClient.setQueriesData<{ logs: SetLog[] }>({ queryKey: setKeys.all }, previous => previous ? { ...previous, logs: previous.logs.filter(log => log.id !== draft.sourceLog!.id) } : previous);
            }
            await setSyncQueue.discardDraft(draft.stableSetId);
            accessoryDraftsRef.current = accessoryDraftsRef.current.filter(row => row.stableSetId !== draft.stableSetId);
            if (draft.kind === 'added' && !accessoryDraftsRef.current.some(row => row.exercise.id === draft.exercise.id)) pinnedDates.current.delete(draft.exercise.id);
            setDraftOverrides(current => { const next = { ...current }; delete next[draft.stableSetId]; return next; });
          }
        });
      } catch (error) { Alert.alert(t('student.setEntrySheet.copy010'), saveErrorCopy(error)); }
      finally { void queryClient.invalidateQueries({ queryKey: setKeys.all }); }
    };
    if (!wholeExercise && rows.every(row => !row.sourceLog)) { void remove(); return; }
    Alert.alert(t(wholeExercise ? 'student.added.confirmExercise' : 'student.added.confirmSet'), undefined, [
      { text: t('student.added.cancel'), style: 'cancel' },
      { text: t('student.added.remove'), style: 'destructive', onPress: () => void remove() },
    ]);
  };

  const emptyState = studentEmptyState(plan);
  // Keep an explicitly selected completed day and its undo visible after finishing.
  const showEmpty = state.kind === 'noPlan' || (state.kind === 'loaded' && emptyState !== null && !completedToday(orderedDays, clockNow) && requestedDayID === null);
  const realDrafts = liveDrafts.filter(
    (draft) => draft.sourceLog && !draft.sourceLog.assumed,
  );
  const stickyCompletion = (editable || waitingForVideos) && (state.kind === 'loaded');
  const contentBottomPadding = stickyCompletion
    ? completionDockHeight + spacing.md
    : styles.content.paddingBottom;
  return (
    <Screen style={styles.screen}>
      <View style={[styles.nav, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <Text style={{ ...font.display(30), color: colors.textPrimary }}>{showEmpty ? emptyState?.kind === 'next' ? `W${emptyState.week}` : t('student.studentRootView.copy002') : `W${viewedWeek?.number ?? '—'}`}</Text>

      </View>
      <View style={{ flex: 1 }} onTouchEnd={() => editor.pad.current?.dismiss()}><ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refreshToday()} tintColor={colors.gold500} />} ref={workoutScroll} innerViewRef={workoutContent}
        onScrollBeginDrag={() => { userScrolling.current = true; completedRowToReveal.current = null; }}
        onScrollEndDrag={() => { userScrolling.current = false; }}
        onMomentumScrollBegin={() => { userScrolling.current = true; completedRowToReveal.current = null; }}
        onMomentumScrollEnd={() => { userScrolling.current = false; }}
        onContentSizeChange={revealAccessoryRow}
        onLayout={revealAccessoryRow}
        contentContainerStyle={[styles.content, { paddingBottom: contentBottomPadding + (accessoryPadHeight > 0 ? accessoryPadHeight + spacing.lg : 0) }]}>
        <MeetWeightStrip studentId={studentId} profile={profileQuery.data} today={localDateText(clockNow)} />
        {state.kind !== 'loading' && !showEmpty && plan ? (
          <TrainingWeekStrip plan={plan} strip={weekStrip} onSelect={selectDay} />
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
            <Pressable onPress={() => void refreshToday()}>
              <Text style={styles.retry}>
                {t('student.bindGateView.copy003')}
              </Text>
            </Pressable>
          </Card>
        ) : null}
        {showEmpty && emptyState ? <StudentEmptyState state={emptyState} coachName={coachName} hasCoach={binding.data?.bind_request?.status === 'accepted'} /> : null}
        {state.kind === 'loaded' && !showEmpty ? (
          <>
            {dayState?.kind === 'completed' ? <View testID="training.completedDay"><Text style={styles.emptySub}>{t('student.trainingWeekStrip.completed')}</Text>{dayState.canUndo ? <AppButton variant="link" label={t('student.todayWorkoutScreen.copy023')} disabled={undoCompletion.isPending} onPress={() => void completeDay(true)} /> : null}</View> : null}
            <AllDayBody key={startKey} sheet={sheet} editable={editable} studentId={studentId} unit={workoutProfile?.unit_preference === 'lb' ? 'lb' : 'kg'}
              title={planDay && recommendedDate(plan!, planDay) !== today ? dayCode(planDay, orderedDays) : t('training.allDay.today')}
              exerciseName={id => exerciseTitle(resolveExerciseMetadata(id))}
              allowsRIR={id => isAccessoryExercise(resolveExerciseMetadata(id)?.exerciseType)}
              editor={editor}
              onEffortChoice={rememberEffort}
              onSave={row => { void saveRow(row).catch(() => undefined); }}
              onExpand={id => { editor.close(); setExpandedExercises(current => ({ ...current, [reviewKey]: sheet.exercises.find(block => block.exercise.id === id)?.collapsed ? id : null })); }}
              onToggle={id => void toggleExercise(id)}
              onNote={binding.data?.bind_request?.status === 'accepted' ? row => setNoteRow(row) : undefined}
              onAddSet={exercise => { if (!editable) return; const next = exercise.id.startsWith('added:') ? addStudentSet(exercise, liveDrafts) : addExtraDraft(exercise, liveDrafts); if (next) { setDraftOverrides(current => ({ ...current, [next.stableSetId]: next })); void setSyncQueue.saveDraft(next); } }}
              onRemoveSet={row => requestRemoval([row], false)}
              onRemoveExercise={exercise => requestRemoval(liveDrafts.filter(row => row.exercise.id === exercise.id), true)}
              onAddExercise={() => setPickerVisible(true)}
              ensureSetLog={async row => {
                if (setSyncQueue.pending().some(entry => entry.stableSetId === row.stableSetId)) return setSyncQueue.waitForSet(row.stableSetId);
                if (row.sourceLog && !isLocalSetId(row.sourceLog.id)) return row.sourceLog.id;
                await saveRow(row); return setSyncQueue.waitForSet(row.stableSetId);
              }} />
            {dayState?.kind === 'completed' ? (
              <DayCompletionBanner
                count={realDrafts.length}
                onPress={() => setCompletionPhase('review')}
              />
            ) : null}
          </>
        ) : null}
      </ScrollView></View>
      {stickyCompletion ? <View testID="workout-completion-dock"
        onLayout={event => setCompletionDockHeight(event.nativeEvent.layout.height)}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0,
          paddingVertical: spacing.md, paddingHorizontal: spacing.base, borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.borderDefault, backgroundColor: colors.bgBase }}>
        <VideoCompletionControl studentId={studentId} videos={completionVideos} waiting={waitingForVideos}
          showSummary={syncCompletionState === 'idle'}>
          <SetSyncCompletionControl state={syncCompletionState} disabled={completion.isPending} onComplete={() => void completeDay()} />
        </VideoCompletionControl>
      </View> : null}
      {noteRow && binding.data?.bind_request?.status === 'accepted' ? <ExerciseNoteSheet studentId={studentId} coachId={binding.data.bind_request.coach_id}
        reference={{ v: 1, exercise_name: exerciseTitle(resolveExerciseMetadata(noteRow.exercise.exercise_id)), day_date: noteRow.sourceLog?.logged_date ?? today, plan_day_id: noteRow.exercise.plan_day_id, plan_exercise_id: noteRow.kind === 'added' ? null : noteRow.exercise.id, exercise_id: noteRow.exercise.exercise_id }} onClose={() => setNoteRow(null)} /> : null}
      {pickerVisible && editable && planDay ? <StudentExercisePicker planned={planDay.exercises.map(exercise => exercise.exercise_id)} added={liveDrafts.filter(draft => draft.kind === 'added').map(draft => draft.exercise.exercise_id)} onClose={() => setPickerVisible(false)} onSelect={exerciseId => {
        if (availableLogs.some(log => log.adhoc && log.exercise_id === exerciseId && log.logged_date === today && log.plan_day_id && log.plan_day_id !== planDay.id)) { showToast(t('student.added.dayConflict')); return; }
        const draft = addStudentExercise(planDay, exerciseId, liveDrafts);
        if (draft) { setDraftOverrides(current => ({ ...current, [draft.stableSetId]: draft })); void setSyncQueue.saveDraft(draft); setPickerVisible(false); }
      }} /> : null}
      {completionPhase && reviewLoaded && planDay && plan ? (
        <WorkoutCompletionFlowView
          key={reviewKey}
          initialPhase={completionPhase}
          sending={completion.isPending}
          presentation={workoutCompletionPresentation({
            planDay,
            drafts: liveDrafts,
            weekCode: dayCode(planDay, orderedDays),
            date: recommendedDate(plan, planDay),
            coachName: binding.data?.bind_request?.coach_display_name ?? null,
            exerciseNames: new Map(planDay.exercises.map(exercise => [exercise.exercise_id, exerciseTitle(resolveExerciseMetadata(exercise.exercise_id))])),
            references: (historyQuery.data?.logs ?? []).reduce((best, log) => {
              if (!log.completed || log.failed || log.assumed ||
                planDay.exercises.some(exercise => exercise.id === log.plan_exercise_id)) return best;
              const weightKg = Number(log.weight_kg);
              const previous = best.get(log.exercise_id);
              if (!previous || weightKg > previous.weightKg || (weightKg === previous.weightKg && log.reps > previous.reps)) {
                best.set(log.exercise_id, { weightKg, reps: log.reps });
              }
              return best;
            }, new Map<string, CompletionReference>()),
            previousVolumeChangePercent: null,
          })}
          initialReflection={review?.reflection}
          onReflectionChange={async (reflection) => {
            const next = { completedAt: review?.completedAt ?? '', reflection };
            await writeReview(studentId, selectedDayID!, next);
            setReviewState({ key: reviewKey, status: 'loaded', value: next });
          }}
          onFinish={async (reflection) => {
            const next = { completedAt: new Date().toISOString(), reflection };
            await writeReview(studentId, selectedDayID!, next);
            setReviewState({ key: reviewKey, status: 'loaded', value: next });
            setCompletionPhase(null);
            if (completionGate.videoIntent(selectedDayID!)) {
              void retryWaitingVideos(selectedDayID!).catch(() => {});
              return;
            }
            await track(AnalyticsEvent.WorkoutLogSave, {
              date: today,
              sets: liveDrafts.length,
            });
          }}
        />
      ) : null}
      {editor.panel}
    </Screen>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    screen: { flex: 1 },
    nav: {
      borderBottomColor: colors.borderDefault,
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: 1,
      paddingHorizontal: spacing.base,
    },
    navRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    historyLink: {
      alignSelf: 'flex-end',
      marginLeft: 'auto',
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.xs,
      minHeight: spacing.minimumHitTarget,
      flexShrink: 0,
    },
    weekHistoryRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs },
    weekHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 0 },
    weekNumber: { ...font.display(14), color: colors.textPrimary },
    weekBadge: { ...font.body(11, 'semibold'), color: colors.textSecondary, backgroundColor: colors.bgStack, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.point2, flexShrink: 0, textAlign: 'center' },
    currentWeekBadge: { color: colors.goldText, backgroundColor: colors.goldSoft },
    weekCount: { ...font.mono(11), color: colors.textMuted },
    historyLabel: { color: colors.goldText, ...typography.footnote, flexShrink: 0 },
    navTitle: { color: colors.textPrimary, ...font.display(20), flexShrink: 1 },
    navActions: { alignItems: 'center', flexDirection: 'row', gap: 9 },
    navButton: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 44,
      height: 44,
    },
    navButtonFace: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surfaceCard,
    },
    unreadBadge: {
      position: 'absolute',
      right: -2,
      top: -2,
      minWidth: 16,
      minHeight: 16,
      paddingHorizontal: 3,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 999,
      backgroundColor: colors.dangerFill,
    },
    unreadCount: { color: '#FFFFFF', ...font.mono(9, 'bold') },
    content: { gap: 13, paddingHorizontal: spacing.base, paddingTop: 6, paddingBottom: 28 },
    center: { marginVertical: spacing.xxl },
    empty: { alignItems: 'center', gap: spacing.md, padding: spacing.xl },
    emptyTitle: { color: colors.textPrimary, ...typography.headline },
    emptySub: { color: colors.textSecondary, ...typography.body },
    retry: { color: colors.gold500, ...typography.bodyEmphasis },
  });
