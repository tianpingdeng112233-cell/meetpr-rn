import { SessionResumeSheet, ResumeCompletionNotice, resumeDateLabel } from './SessionResumeSheet';
import { pinResumeDate, releaseResumeDate, storedResumeDate, useSessionResume, visitKey } from './session-resume';
import { CycleOutlookSheet } from './CycleOutlookSheet';
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
  sequenceDays,
  workoutDayState,
} from '@/domain/plan/sequence';
import { trainingWeekStrip } from '@/domain/plan/week-strip';
import { dayRange, localDateText } from '@/domain/plan/workout-date-policy';
import { ExerciseNoteSheet } from '@/features/chat/ExerciseNoteSheet';
import { StudentEmptyState } from './StudentEmptyState';
import { studentEmptyState } from './student-empty-state';
import { MeetWeightStrip } from './MeetWeightStrip';
import { useQueryClient } from '@tanstack/react-query';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
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
import { useHandoffNotice } from './handoff-notice';
import { PlanPreviewBody } from './PlanPreviewBody';
import { TrainingWeekStrip } from './TrainingWeekStrip';
import { completionVideoSummary } from './video-upload/completion-delivery';
import { hydrateRemoteVideoAttachments, hydrateVideoUploads, useVideoUploadStore, type VideoAttachmentSet } from './video-upload/store';
import { VideoCompletionControl } from './video-upload/VideoCompletionControl';

import { AnalyticsEvent, AnalyticsScreen, track } from '@/analytics';
import { plansRepository, planKeys, useDayCompletion, usePlan, usePlanHandoff, currentPlanSummary, type PlanHandoff, type PlanSummary, type PlanDetail, type PlanExercise } from '@/api/domains/plans';
import { setKeys, useSetLogs, useUpsertSetLog, useWeightSuggestions } from '@/api/domains/sets';
import { useSessionStore } from '@/api/session';
import { Card, Screen, font, radius, spacing, typography, useColors, type Colors } from '@/design';
import { showToast } from '@/design/Toast';
import { E1RMRecorder, buildE1RMSeries } from '@/domain/e1rm';
import { useStudentTabsStore } from '@/features/student-tabs';
import { t } from '@/i18n';
import { localNoon } from './quick-log';

import { workoutCompletionPresentation, type CompletionReference } from './completion-presentation';
import { DayCompletionBanner, WorkoutCompletionFlowView, type WorkoutCompletionFlowPhase } from './CompletionControls';
import { HISTORY_WEIGHT_PREFILL_ENABLED, TRAINING_LIMITS } from './constants';
import { addExtraDraft, addWarmupDraft, addStudentExercise, addStudentSet, studentAddedDrafts, synthesizeDrafts } from './drafts';
import { recordTrainingSetE1RM } from './e1rm-live';
import { createExerciseMetadataResolver, exerciseTitle } from './exercise-metadata';
import { LoadGeneration } from './load-generation';
import type { SessionReview, TrainingLoadState, WorkoutSetDraft } from './model';
import { RestTimer } from './RestTimer';
import { currentRestExercise, gymDayText, parseFiniteDecimal } from './policy';
import { saveErrorCopy } from './save-errors';
import { SerialTaskQueue } from './serial-task-queue';
import { readReview, trainingE1RMRepository, writeReview } from './storage';
import { trackTrainingTabVisit } from './training-analytics';

const EMPTY_E1RM_BY_EXERCISE: Record<string, number | null> = {};

export function TodayWorkoutView() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const workoutScroll = useRef<ScrollView>(null);
  const [outlookOwner, setOutlookOwner] = useState<string | null>(null);
  const [restTop, setRestTop] = useState(160);
  const [restCompletionSignal, setRestCompletionSignal] = useState(0);
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
  const [explicitEntry, setExplicitEntry] = useState(handoff?.plan.trainee_id === studentId);
  const [entryDay, setEntryDay] = useState(() => gymDayText(new Date()));
  const [foreground, setForeground] = useState(AppState.currentState !== 'background');
  const [resumeMessage, setResumeMessage] = useState<{ owner: string; text: string } | null>(null);
  const clearResumeMessage = useCallback(() => setResumeMessage(null), []);
  const resumeSubmitting = useRef(false);
  const [resumeBusy, setResumeBusy] = useState(false);
  const notificationDay = useStudentTabsStore(store => store.videoNotificationDay);
  useEffect(() => {
    if (notificationDay?.studentId !== studentId) return;
    void Promise.resolve().then(() => {
      setExplicitEntry(true);
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
    setExplicitEntry(false); setResumeMessage(null);
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
  const savingSets = useRef(0);
  const videoInteractions = useRef(new Set<string>());
  const weightEditing = useRef(false);
  const [trainingModalVisible, setTrainingModalVisible] = useState(false);
  const onWeightEditing = useCallback((active: boolean) => {
    weightEditing.current = active;
    setTrainingModalVisible(active || videoInteractions.current.size > 0);
  }, []);
  const onVideoActivity = useCallback((id: string, active: boolean) => {
    if (active) videoInteractions.current.add(id); else videoInteractions.current.delete(id);
    setTrainingModalVisible(weightEditing.current || videoInteractions.current.size > 0);
  }, []);
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
  const { queue: setSyncQueue, gate: completionGate, snapshot: syncSnapshot, setCompletionHandler, dayVideos, retryWaitingVideos } = useSetSync(studentId);
  const [syncReadyOwner, setSyncReadyOwner] = useState<string | null>(null);
  useEffect(() => { let active = true; void Promise.all([setSyncQueue.ready, completionGate.ready]).then(() => { if (active) setSyncReadyOwner(studentId); }); return () => { active = false; }; }, [studentId, setSyncQueue, completionGate]);
  const plansQuery = usePlanHandoff(studentId);
  const currentSummary = currentPlanSummary(plansQuery.data);
  const [retained, setRetained] = useState<{ owner: string; summary: PlanSummary | null } | null>(null);
  const pendingSync = syncSnapshot.pending.length > 0 || completionGate.pendingDays().length > 0;
  // A cycle the server has fully settled is over: leftover outbox or upload state must not keep it on screen.
  const settledCycle = (handoff: PlanHandoff | undefined, planId: string | undefined) => {
    const summary = handoff?.plans.find(item => item.id === planId);
    return Boolean(summary && handoff?.current_plan_id && handoff.current_plan_id !== planId &&
      summary.total_training_days > 0 && summary.completed_training_days === summary.total_training_days);
  };
  const activeSummary = retained?.owner === studentId ? retained.summary : pendingSync && savedWorkout.snapshot && !settledCycle(plansQuery.data, savedWorkout.snapshot.plan.id) ? savedWorkout.snapshot.plan : currentSummary ?? (!plansQuery.data ? savedWorkout.snapshot?.plan ?? null : null);
  if (syncReadyOwner === studentId && savedWorkout.ready && (plansQuery.data || activeSummary) && retained?.owner !== studentId) setRetained({ owner: studentId, summary: activeSummary });
  const enterPlan = useRef<() => void>(() => {});
  const reenterAfterGymDay = useRef<() => void>(() => {});
  const lastEntryDay = useRef(entryDay);
  useEffect(() => { lastEntryDay.current = entryDay; }, [entryDay]);
  const [browsing, setBrowsing] = useState<{ summary: PlanSummary; edge: 'first' | 'last' } | null>(null);
  const selectedPlan = (browsing?.summary.trainee_id === studentId ? browsing.summary : null) ?? (editingPlan?.trainee_id === studentId ? editingPlan : activeSummary ?? (plansQuery.data ? null : savedWorkout.snapshot?.plan));
  const activeIndex = plansQuery.data?.plans.findIndex(item => item.id === activeSummary?.id) ?? -1;
  const activeProgress = plansQuery.data?.plans[activeIndex];
  const selectedIndex = plansQuery.data?.plans.findIndex(item => item.id === selectedPlan?.id) ?? -1;
  const preview = Boolean(selectedPlan && selectedPlan.id !== activeSummary?.id && (selectedIndex > activeIndex || plansQuery.data?.plans[selectedIndex]?.handoff_status === 'upcoming'));
  const notice = useHandoffNotice(studentId, activeSummary?.id ?? null, plansQuery.data, savedWorkout.snapshot?.plan.id);
  const planQuery = usePlan(selectedPlan?.id ?? '');
  const savedPlan = savedWorkout.snapshot?.plan.id === selectedPlan?.id ? savedWorkout.snapshot : null;
  const plan = editingPlan && editingPlan.id === selectedPlan?.id ? editingPlan : planQuery.data ?? savedPlan?.plan;
  const outlookKey = `${studentId}:${plan?.id}`;
  const outlookOpen = outlookOwner === outlookKey;
  const hasOutlook = plan?.status === 'published' && plan.days.some(day => day.week_number >= 1 && day.week_number <= plan.plan_weeks && day.exercises.some(exercise => resolveExerciseMetadata(exercise.exercise_id)?.competitionFamily && exercise.sets.some(set => set.set_type !== 'warmup')));
  const navigablePlans = plansQuery.data?.plans.filter(item => item.total_training_days > 0 || item.id === activeSummary?.id) ?? [];
  const planIndex = navigablePlans.findIndex(item => item.id === selectedPlan?.id);
  const nextPlan = planIndex >= 0 ? navigablePlans[planIndex + 1] : undefined;
  const previousPlan = planIndex > 0 ? navigablePlans[planIndex - 1] : undefined;
  const range = plan
    ? { ...planLogRange(plan), scope: 'all' as const }
    : { from: today, to: today, scope: 'all' as const };
  const logsQuery = useSetLogs(studentId, range, Boolean(plan));
  const serverLogs = logsQuery.data?.logs ?? savedPlan?.logs;
  useEffect(() => {
    if (!preview && planQuery.data && planQuery.data.id === currentSummary?.id && logsQuery.data && catalogQuery.data && profileQuery.isSuccess) void saveWorkoutSnapshot(studentId, planQuery.data, logsQuery.data.logs, catalogQuery.data.exercises, profileQuery.data).catch(() => {});
    else if (plansQuery.data && !plansQuery.data.current_plan_id) void saveWorkoutSnapshot(studentId, null).catch(() => {});
  }, [studentId, planQuery.data, logsQuery.data, plansQuery.data, catalogQuery.data, profileQuery.data, profileQuery.isSuccess, preview, currentSummary?.id]);
  useEffect(() => {
    if (logsQuery.data) void setSyncQueue.reconcileServerLogs(logsQuery.data.logs).catch(() => {});
  }, [setSyncQueue, logsQuery.data]);
  const logs = useMemo(
    () => overlaySetLogs(serverLogs ?? [], syncSnapshot),
    [serverLogs, syncSnapshot],
  );
  const orderedDays = sequenceDays(plan?.days ?? []);
  const cursor = cursorDay(orderedDays);
  const initialDayID = browsing ? (browsing.edge === 'last' ? orderedDays.at(-1)?.id : orderedDays[0]?.id) : cursor?.id ?? completedToday(orderedDays, clockNow)?.id;
  if (trainingVisible && requestedDayID === null && serverLogs && initialDayID) setRequestedDayID(initialDayID);
  const weekStrip = trainingWeekStrip(plan, requestedDayID ?? initialDayID, today);
  const viewedWeek = weekStrip.week;
  const planDay = weekStrip.selectedDay;
  const selectedDayID = planDay?.id ?? null;
  const dayState = planDay
    ? workoutDayState(orderedDays, planDay, clockNow)
    : null;
  const editable = Boolean(!preview && selectedPlan?.id === activeSummary?.id && plan && selectedDayID && canWriteTrainingDay(plan, selectedDayID));
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
    { from: '1970-01-01', to: localDateText(dayRange(today).end), scope: 'all' },
    Boolean(plan),
  );
  const upsert = useUpsertSetLog();
  const completion = useDayCompletion(plan?.id ?? '');
  const submitCompletion = completion.mutateAsync;
  const completionPlanId = plan?.id;
  useEffect(() => {
    if (preview || !completionPlanId || selectedPlan?.id !== activeSummary?.id) return;
    return setCompletionHandler(async (id, actualDate) => {
      const receipt = await submitCompletion(actualDate ? { dayId: id, actualDate } : id);
      // A different device may have completed the following day before this receipt.
      if (actualDate) await queryClient.fetchQuery({ queryKey: planKeys.detail(completionPlanId),
        queryFn: () => plansRepository.detail(completionPlanId), staleTime: 0 });
      return receipt;
    });
  }, [preview, completionPlanId, selectedPlan?.id, activeSummary?.id, setCompletionHandler, submitCompletion, queryClient]);
  const undoCompletion = useDayCompletion(plan?.id ?? '', true);
  const e1rmKey = `${studentId}:${planDay?.id ?? ''}`;
  const e1rmByExercise =
    e1rmState.key === e1rmKey ? e1rmState.values : EMPTY_E1RM_BY_EXERCISE;
  const availableLogs = logs.filter(log => !removedLogs.has(log.id));
  const synthesizedDrafts = planDay && !preview ? [...synthesizeDrafts(planDay, availableLogs), ...studentAddedDrafts(planDay.id, availableLogs)] : [];
  const synthesizedIDs = new Set(synthesizedDrafts.map(draft => draft.stableSetId));
  synthesizedDrafts.push(...Object.values({ ...syncSnapshot.drafts, ...draftOverrides }).filter(draft => !preview && draft.kind && draft.exercise.plan_day_id === selectedDayID && !synthesizedIDs.has(draft.stableSetId) && (syncSnapshot.drafts?.[draft.stableSetId] || (!syncSnapshot.pending.some(entry => entry.stableSetId === draft.stableSetId && entry.remove) && !syncSnapshot.confirmed[draft.stableSetId]?.remove)) &&
    (draft.kind === 'added' || planDay?.exercises.some(exercise => exercise.id === draft.exercise.id))));
  const effortChoices = useEffortChoices(studentId, synthesizedDrafts.map(row => row.exercise.exercise_id));
  const rememberEffort = (row: WorkoutSetDraft) => effortChoices.remember(row.exercise.exercise_id, row.effortKind ?? 'rpe');
  const baseDrafts = synthesizedDrafts.map(draft => {
    const local = draftOverrides[draft.stableSetId];
    const original = syncSnapshot.originalWeights?.[draft.stableSetId];
    if (original?.loggedDate === (draft.sourceLog?.logged_date ?? today)) draft = { ...draft, originalWeightText: original.weightText };
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
  const sheet = planDay && !preview ? buildAllDaySheet(planDay, availableLogs, HISTORY_WEIGHT_PREFILL_ENABLED ? suggestionsQuery.data?.suggestions ?? [] : [], {
    effortPreferences: { ...historicalEffortChoices(historyQuery.data?.logs ?? [], studentId, today), ...effortChoices.choices },
    accessoryHistory: editable ? { logs: historyQuery.data?.logs ?? [], studentId, throughDate: today,
      isAccessory: id => resolveExerciseMetadata(id)?.exerciseType === 'accessory' } : undefined,
    drafts: prefilledDrafts, completedExercises: checkedExercises[reviewKey], expandedExerciseId: expandedExercises[reviewKey],
  }) : { exercises: [] };
  const liveDrafts = sheet.exercises.flatMap(block => block.rows);
  const restExercise = currentRestExercise(sheet.exercises);
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
    if (!studentId || !planDay || preview) return;
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
  }, [planDay, resolveExerciseMetadata, studentId, preview]);

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
      enterPlan.current();
      setTrainingVisible(true);
      setEntryDay(gymDayText(new Date()));
      setClockNow(new Date());
      let active = true;
      void refreshRef.current(throttle.current.refreshWhenReturning()).then(() => { if (active) enterPlan.current(); });
      return () => {
        active = false;
        setTrainingVisible(false);
        setExplicitEntry(false);
        setOutlookOwner(null);
        setRequestedDayID(null);
      };
    }, [setRequestedDayID]),
  );
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      setForeground(state === 'active');
      if (state === 'active') {
        const currentDay = gymDayText(new Date());
        if (currentDay !== lastEntryDay.current) reenterAfterGymDay.current();
        setEntryDay(currentDay);
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
        setExplicitEntry(true);
        setRequestedDayID(handoff.dayID);
      } else { setExplicitEntry(false); setRequestedDayID(null); }
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
    (syncReadyOwner !== studentId) || (!savedWorkout.ready && !plansQuery.data) ||
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
    setExplicitEntry(id !== null);
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
    try { await refresh(); enterPlan.current(); }
    finally { setRefreshing(false); }
  };
  const videoContext = { sets: liveDrafts.map(draft => ({ stableSetId: draft.stableSetId, setLogId: draft.sourceLog?.id })),
    exerciseIds: planDay?.exercises.map(exercise => exercise.id) ?? [] };
  const videoContextKey = JSON.stringify(videoContext);
  useEffect(() => {
    if (!preview && selectedDayID) void completionGate.updateVideoContext(selectedDayID, JSON.parse(videoContextKey)).catch(() => {});
  }, [completionGate, selectedDayID, videoContextKey, preview]);
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
    reward: actualDate => { if (!actualDate) setCompletionPhase('celebration'); },
    prepareVideos: hydrateVideoUploads,
    videosDelivered: (dayId, context) => completionVideoSummary(dayVideos(dayId, context).map(row => row.upload)).delivered,
    error: error => { setCompletionPhase(null); Alert.alert(t('student.todayWorkoutScreen.copy001'), completionError(error, false)); },
  }), [setSyncQueue, completionGate, setCompletionPhase, dayVideos]);
  const syncCompletionState = useSyncExternalStore(completionCoordinator.subscribe, completionCoordinator.snapshot);
  useEffect(() => () => completionCoordinator.reset(), [completionCoordinator, selectedDayID]);
  useFocusEffect(useCallback(() => () => completionCoordinator.reset(), [completionCoordinator]));
  const resumeKey = state.kind === 'loaded' && editable && trainingVisible && foreground && plan?.actual_completion_date_enabled && planDay && !planDay.completed_at && !browsing && !completionGate.pendingDays().includes(planDay.id)
    ? visitKey(studentId, plan.id, planDay.id) : null;
  const resume = useSessionResume(resumeKey, entryDay, !explicitEntry && !notificationDay && selectedDayID === cursor?.id);
  useEffect(() => onSyncedDayCompletion((owner, dayId, actualDate) => {
    if (owner !== studentId) return;
    if (actualDate !== undefined && plan && selectedDayID === dayId && trainingVisible) {
      const refreshed = queryClient.getQueryData<PlanDetail>(planKeys.detail(plan.id)) ?? plan;
      const done = refreshed.days.find(day => day.id === dayId);
      const next = cursorDay(refreshed.days.filter(day => day.id !== dayId));
      if (done) {
        const args = [dayCode(done, refreshed.days)];
        if (actualDate) args.push(resumeDateLabel(actualDate, gymDayText(new Date())));
        if (next) args.push(dayCode(next, refreshed.days));
        setResumeMessage({ owner, text: t(actualDate === null ? 'training.resume.already' : next ? 'training.resume.advanced' : 'training.resume.finished', args) });
      }
      setExplicitEntry(false); setEditingPlan(null); setRequestedDayID(next?.id ?? null); setBrowsing(null); setRetained(null);
    }
    bumpCompletion();
    void queryClient.invalidateQueries({ queryKey: planKeys.all });
    void queryClient.invalidateQueries({ queryKey: setKeys.all });
  }), [studentId, queryClient, bumpCompletion, plan, selectedDayID, trainingVisible]);
  const completeDay = async (undo = false, actualDate?: string) => {
    if (preview || !planDay || completion.isPending || undoCompletion.isPending || resumeSubmitting.current) return;
    if (actualDate && (!plan?.actual_completion_date_enabled || !resume.previous || actualDate < resume.previous || actualDate > gymDayText(new Date()))) return;
    if (!undo && !actualDate) {
      actualDate = completionGate.datedIntent(planDay.id) ?? resume.selected;
      if (!actualDate && resumeKey && !resume.ready) actualDate = await storedResumeDate(resumeKey);
    }
    setRequestedDayID(planDay.id);
    if (!undo) {
      if (actualDate) { resumeSubmitting.current = true; setResumeBusy(true); }
      setRestCompletionSignal(value => value + 1);
      try {
        const writes = completionWrites(sheet).filter(({ row }) => !actualDate || !row.sourceLog);
        editor.close();
        for (const row of liveDrafts.filter(item => item.kind === 'warmup' && !item.weightText.trim() && (!actualDate || !item.sourceLog))) {
          if (row.sourceLog) await setSyncQueue.remove({ stableSetId: row.stableSetId, dayId: planDay.id, log: row.sourceLog });
          await setSyncQueue.discardDraft(row.stableSetId);
          accessoryDraftsRef.current = accessoryDraftsRef.current.filter(item => item.stableSetId !== row.stableSetId);
          setDraftOverrides(current => { const next = { ...current }; delete next[row.stableSetId]; return next; });
        }
        if (actualDate && resumeKey && resume.previous) await pinResumeDate(resumeKey, resume.previous, actualDate, writes.length > 0);
        let filled = 0;
        for (const { row, request } of writes) {
          try { await saveRow(row, request, actualDate); }
          catch (error) {
            const snapshot = setSyncQueue.snapshot();
            const accepted = snapshot.confirmed[row.stableSetId] || snapshot.pending.some(item => item.stableSetId === row.stableSetId);
            if (actualDate && resumeKey && !resume.fillsSets && !filled && !accepted) await releaseResumeDate(resumeKey);
            throw error;
          }
          filled++;
        }
        await completionCoordinator.begin(planDay.id, syncCompletionState === 'failed', videoContext, actualDate, resumeKey ?? undefined);
      } catch (error) { Alert.alert(t('student.setEntrySheet.copy010'), saveErrorCopy(error)); }
      finally { if (actualDate) { resumeSubmitting.current = false; setResumeBusy(false); } }
      return;
    }
    try {
      await undoCompletion.mutateAsync(planDay.id);
      await completionGate.forget(planDay.id);
      completionCoordinator.reset();
      bumpCompletion();
      setRetained(null); setBrowsing(null); setEditingPlan(null); setRequestedDayID(null);
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
    completionDate?: string;
    originalWeightText?: string;
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
      const logDate = input.completionDate ?? (!input.quickLogDate && draft.sourceLog && !isLocalSetId(draft.sourceLog.id)
        ? draft.sourceLog.logged_date
        : draft.kind === 'added'
          ? draft.loggedDate ?? pinnedDates.current.get(draft.exercise.id) ?? gymDayText(new Date())
          : input.quickLogDate ?? gymDayText(new Date()));
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
        if (!input.quickLogDate && input.originalWeightText != null) {
          await setSyncQueue.rememberOriginalWeight(draft.stableSetId, logDate, input.originalWeightText);
        }
        const response = input.quickLogDate ? await upsert.mutateAsync(request) : await setSyncQueue.enqueue({
          stableSetId: draft.stableSetId, dayId: draft.exercise.plan_day_id, exerciseId: draft.exercise.exercise_id, loggedDate: logDate,
          request: { ...request, logged_date: logDate },
        });
        if (completed && !input.failed && !input.quickLogDate) void notice.dismiss().catch(() => {});
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
                  is_warmup: draft.kind === 'warmup',
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

        if (draft.kind !== 'warmup' && !input.failed && completed && weight !== null) {
          const e1rm = await recordTrainingSetE1RM({
            recorder: input.quickLogDate || input.completionDate ? new E1RMRecorder(trainingE1RMRepository, { now: () => localNoon((input.quickLogDate ?? input.completionDate)!), resolveFamily: resolveE1RMFamily }) : recorder,
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
    savingSets.current++;
    const saved = saveQueue.current.enqueue(operation).finally(() => { savingSets.current--; });
    return input.attachmentOnly ? saved.then(id => id ? setSyncQueue.waitForSet(input.stableSetId) : undefined) : saved;
  };

  const saveRow = async (row: WorkoutSetDraft, request = allDayLogRequest(row), completionDate?: string) => {
    if (row.kind === 'warmup' && !row.weightText.trim()) {
      accessoryDraftsRef.current = accessoryDraftsRef.current.map(item => item.stableSetId === row.stableSetId ? row : item);
      setDraftOverrides(current => ({ ...current, [row.stableSetId]: row }));
      await setSyncQueue.saveDraft(row);
      return `local:${row.stableSetId}`;
    }
    const id = await commit({ stableSetId: row.stableSetId, weightText: row.weightText, repsText: row.repsText,
      rpeText: row.rpeText, effortKind: row.effortKind, failed: false, completed: true,
      originalWeightText: row.originalWeightText, completionDate, accessory: { request, mode: 'all' } });
    if (!id) throw new Error('Set unavailable');
    return id;
  };
  const addSet = (exercise: PlanExercise, warmup = false) => {
    if (!editable) return null;
    const rows = accessoryDraftsRef.current;
    let next = warmup ? addWarmupDraft(exercise, rows) : exercise.id.startsWith('added:') ? addStudentSet(exercise, rows) : addExtraDraft(exercise, rows);
    if (!next) return null;
    if (!warmup) {
      const previous = rows.filter(row => row.exercise.id === exercise.id && row.kind !== 'warmup').at(-1);
      next = { ...next, weightText: previous?.weightText ?? '', repsText: previous?.repsText ?? '' };
    }
    accessoryDraftsRef.current = [...rows, next];
    setDraftOverrides(current => ({ ...current, [next.stableSetId]: next! }));
    void setSyncQueue.saveDraft(next);
    return next;
  };
  const editor = useAllDayEditor(row => { void saveRow(row).catch(() => undefined); }, id => exerciseTitle(resolveExerciseMetadata(id)), onAccessoryPadLayout, `${reviewKey}:${trainingVisible}:${editable}:${workoutProfile?.unit_preference}`, workoutProfile?.unit_preference === 'lb' ? 'lb' : 'kg', rememberEffort, liveDrafts, addSet);
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
  const showEmpty = !preview && !browsing && (state.kind === 'noPlan' || (state.kind === 'loaded' && emptyState !== null && !completedToday(orderedDays, clockNow) && requestedDayID === null));
  const realDrafts = liveDrafts.filter(
    (draft) => draft.kind !== 'warmup' && draft.sourceLog && !draft.sourceLog.assumed,
  );
  const stickyCompletion = !preview && (editable || waitingForVideos || (!showEmpty && dayState?.kind === 'completed')) && (state.kind === 'loaded');
  const contentBottomPadding = stickyCompletion || preview
    ? completionDockHeight + spacing.md
    : styles.content.paddingBottom;
  const uploadsIn = (statuses: readonly string[]) => Object.entries(useVideoUploadStore.getState().records).some(([key, record]) => key.startsWith(`${studentId}:`) && statuses.includes(record.status));
  // On-screen work and uploads actually in flight always hold the page; both end on their own.
  const interactionLocked = (ignoreOutlook = false) => Boolean((outlookOpen && !ignoreOutlook) || weightEditing.current || videoInteractions.current.size > 0 || savingSets.current > 0 || completionPhase || editor.editing || pickerVisible || noteRow || uploadsIn(['preparing', 'uploading']));
  // Queued sync and waiting uploads can outlive the session, so they only hold a cycle that is not settled yet.
  const transitionLocked = (ignoreOutlook = false) => interactionLocked(ignoreOutlook) || pendingSync || uploadsIn(['pending', 'waiting']);
  useEffect(() => { enterPlan.current = () => {
    const fresh = queryClient.getQueryData<PlanHandoff>(planKeys.handoff(studentId));
    if (!fresh || (settledCycle(fresh, activeSummary?.id) ? interactionLocked() : transitionLocked())) return;
    if (settledCycle(fresh, activeSummary?.id) && transitionLocked()) {
      const kind = syncSnapshot.pending.length ? 'outbox' : completionGate.pendingDays().length ? 'gate' : uploadsIn(['waiting']) ? 'upload_waiting' : 'upload_pending';
      void track(AnalyticsEvent.ClientError, { domain: 'persistence', code: `handoff.settled_skip.${kind}`, screen: AnalyticsScreen.TodayWorkout });
    }
    setRetained({ owner: studentId, summary: currentPlanSummary(fresh) }); setBrowsing(null); setEditingPlan(null); setRequestedDayID(null);
  }; });
  useEffect(() => {
    reenterAfterGymDay.current = () => {
      if (transitionLocked() || resumeBusy) return;
      setExplicitEntry(false); setBrowsing(null); setEditingPlan(null); setRequestedDayID(null);
    };
  });
  const browsePlan = (summary: PlanSummary, edge: 'first' | 'last', dayId: string | null = null) => {
    if (transitionLocked(Boolean(outlookOpen && dayId))) return;
    editor.close(); setEditingPlan(null); setRequestedDayID(dayId); setBrowsing({ summary, edge });
  };
  const backToCurrent = () => { editor.close(); setBrowsing(null); setEditingPlan(null); setRequestedDayID(null); };
  return (
    <Screen style={styles.screen}>
      <View style={[styles.nav, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <View style={{ flex: 1, gap: spacing.xs }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}><Text style={{ ...font.display(30), color: preview ? colors.textSecondary : colors.textPrimary }}>{showEmpty ? emptyState?.kind === 'next' ? `W${emptyState.week}` : t('student.studentRootView.copy002') : `W${viewedWeek?.number ?? '—'}`}</Text>{hasOutlook ? <Pressable testID="cycle-outlook-entry" accessibilityRole="button" accessibilityLabel={t('cycleOutlook.title')} onPress={() => { editor.close(); setOutlookOwner(outlookKey); }} hitSlop={8} style={{ flexShrink: 1, borderRadius: radius.pill, backgroundColor: colors.goldSoft, paddingHorizontal: spacing.sm, paddingVertical: spacing.point2 }}><Text numberOfLines={1} adjustsFontSizeToFit style={{ ...font.body(12, 'semibold'), color: colors.goldText }}>{t('cycleOutlook.title')} ›</Text></Pressable> : null}{preview ? <Text style={styles.weekBadge}>{t('training.handoff.newCycle')}</Text> : null}</View>
        {plan ? <Text style={{ ...font.body(13), color: colors.textSecondary }}>{t('training.handoff.subtitle', [plan.name, plan.plan_weeks])}{preview ? ` · ${t('training.handoff.startsAfter')}` : ''}</Text> : null}</View>

      </View>
      <View style={{ flex: 1 }} onTouchEnd={() => editor.pad.current?.dismiss()}><ScrollView key={`${studentId}:${plan?.id}:${preview}:${selectedDayID}`} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refreshToday()} tintColor={colors.gold500} />} ref={workoutScroll} innerViewRef={workoutContent}
        onScrollBeginDrag={() => { userScrolling.current = true; completedRowToReveal.current = null; }}
        onScrollEndDrag={() => { userScrolling.current = false; }}
        onMomentumScrollBegin={() => { userScrolling.current = true; completedRowToReveal.current = null; }}
        onMomentumScrollEnd={() => { userScrolling.current = false; }}
        onContentSizeChange={revealAccessoryRow}
        onLayout={revealAccessoryRow}
        contentContainerStyle={[styles.content, { paddingBottom: contentBottomPadding + (accessoryPadHeight > 0 ? accessoryPadHeight + spacing.lg : 0) }]}>
        {!preview && !browsing && notice.visible ? <View testID="handoff-notice" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.control, backgroundColor: colors.goldSoft }}>
          <Text style={{ ...font.body(13), color: colors.goldText, flex: 1 }}>{t('training.handoff.notice')}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={t('training.handoff.dismiss')} onPress={() => void notice.dismiss().catch(() => {})} style={{ minWidth: spacing.minimumHitTarget, minHeight: spacing.minimumHitTarget, alignItems: 'center', justifyContent: 'center' }}><MaterialCommunityIcons name="close" size={spacing.base} color={colors.goldText} /></Pressable>
        </View> : null}
        <MeetWeightStrip readOnly={preview} onEditingChange={onWeightEditing} studentId={studentId} profile={profileQuery.data} today={localDateText(clockNow)} />
        {state.kind !== 'loading' && !showEmpty && plan ? (
          <View style={{ marginHorizontal: -spacing.base }} onLayout={event => setRestTop(event.nativeEvent.layout.y + event.nativeEvent.layout.height + 12)}><TrainingWeekStrip plan={plan} strip={weekStrip} onSelect={selectDay} preview={preview}
            onPreviousPlan={previousPlan ? () => browsePlan(previousPlan, 'last') : undefined}
            onNextPlan={nextPlan ? () => browsePlan(nextPlan, 'first') : undefined} /></View>
        ) : null}
        {resumeMessage?.owner === studentId && <ResumeCompletionNotice message={resumeMessage.text} onHide={clearResumeMessage} />}
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
        {state.kind === 'loaded' && !showEmpty && preview && planDay ? <PlanPreviewBody day={planDay} title={dayCode(planDay, orderedDays)} exerciseName={id => exerciseTitle(resolveExerciseMetadata(id))} unit={workoutProfile?.unit_preference === 'lb' ? 'lb' : 'kg'} /> : null}
        {state.kind === 'loaded' && !showEmpty && !preview ? (
          <>
            <AllDayBody onVideoActivity={onVideoActivity} key={startKey} sheet={sheet} editable={editable} studentId={studentId} unit={workoutProfile?.unit_preference === 'lb' ? 'lb' : 'kg'}
              title={planDay && recommendedDate(plan!, planDay) !== today ? dayCode(planDay, orderedDays) : t('training.allDay.today')}
              exerciseName={id => exerciseTitle(resolveExerciseMetadata(id))}
              allowsRIR={id => isAccessoryExercise(resolveExerciseMetadata(id)?.exerciseType)}
              editor={editor}
              onEffortChoice={rememberEffort}
              onSave={row => { void saveRow(row).catch(() => undefined); }}
              onExpand={id => { setExpandedExercises(current => ({ ...current, [reviewKey]: sheet.exercises.find(block => block.exercise.id === id)?.collapsed ? id : null })); }}
              onToggle={id => void toggleExercise(id)}
              onNote={binding.data?.bind_request?.status === 'accepted' ? row => setNoteRow(row) : undefined}
              onAddSet={exercise => { editor.close(); const next = addSet(exercise); if (next) editor.edit(next); }}
              onAddWarmup={exercise => { editor.close(); const next = addSet(exercise, true); if (next) editor.edit(next); }}
              onRemoveSet={row => requestRemoval([row], false)}
              onRemoveExercise={exercise => requestRemoval(liveDrafts.filter(row => row.exercise.id === exercise.id), true)}
              onAddExercise={() => setPickerVisible(true)}
              ensureSetLog={async row => {
                if (setSyncQueue.pending().some(entry => entry.stableSetId === row.stableSetId)) return setSyncQueue.waitForSet(row.stableSetId);
                if (row.sourceLog && !isLocalSetId(row.sourceLog.id)) return row.sourceLog.id;
                await saveRow(row); return setSyncQueue.waitForSet(row.stableSetId);
              }} />
          </>
        ) : null}
      </ScrollView>
      <RestTimer key={studentId} studentId={studentId} exerciseName={restExercise ? exerciseTitle(resolveExerciseMetadata(restExercise.exercise_id)) : ''}
        prescribed={restExercise?.sets.slice().sort((a, b) => a.set_number - b.set_number).find(set => set.rest_seconds !== null)?.rest_seconds}
        accessory={isAccessoryExercise(restExercise ? resolveExerciseMetadata(restExercise.exercise_id)?.exerciseType : undefined)}
        startupBlocked={!resume.ready || Boolean(resume.previous || resumeBusy || resumeMessage || (selectedDayID && completionGate.datedIntent(selectedDayID))) || outlookOpen || trainingModalVisible || !notice.ready || (!preview && !browsing && notice.visible)}
        visible={trainingVisible && editable && state.kind === 'loaded' && !showEmpty && Boolean(restExercise) && !editor.editing && accessoryPadHeight === 0 && !completionPhase && !pickerVisible && !noteRow}
        top={restTop} bottom={completionDockHeight - spacing.md} completionSignal={restCompletionSignal} />
      </View>
      {preview ? <View testID="handoff-preview-dock" onLayout={event => setCompletionDockHeight(event.nativeEvent.layout.height)} style={{ padding: spacing.base, gap: spacing.sm, backgroundColor: colors.bgBase }}>
        <Text style={{ ...font.body(13), color: colors.textSecondary, textAlign: 'center' }}>{t('training.handoff.remaining', [Math.max(0, (activeProgress?.total_training_days ?? 0) - (activeProgress?.completed_training_days ?? 0))])}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t('training.handoff.back')} onPress={backToCurrent} style={{ minHeight: spacing.minimumHitTarget, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: radius.control, alignItems: 'center', justifyContent: 'center', padding: spacing.sm }}><Text style={{ ...font.body(15, 'semibold'), color: colors.textPrimary }}>{t('training.handoff.back')}</Text></Pressable>
      </View> : null}
      {stickyCompletion ? <View testID="workout-completion-dock"
        onLayout={event => setCompletionDockHeight(event.nativeEvent.layout.height)}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0,
          paddingVertical: spacing.md, paddingHorizontal: spacing.base, borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.borderDefault, backgroundColor: colors.bgBase }}>
        {dayState?.kind === 'completed' ? <View testID="training.completedDay">
          <DayCompletionBanner count={realDrafts.length} onPress={() => setCompletionPhase('review')} />
          {dayState.canUndo ? <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('student.todayWorkoutScreen.copy023')}
            accessibilityState={{ disabled: undoCompletion.isPending }}
            disabled={undoCompletion.isPending}
            onPress={() => void completeDay(true)}
            style={styles.undoCompletion}>
            <MaterialCommunityIcons name="undo-variant" size={spacing.point14} color={colors.textMuted} />
            <Text style={styles.undoCompletionText}>{t('student.todayWorkoutScreen.copy023')}</Text>
          </Pressable> : null}
        </View> : <VideoCompletionControl studentId={studentId} videos={completionVideos} waiting={waitingForVideos}
          showSummary={syncCompletionState === 'idle'}>
          <SetSyncCompletionControl state={syncCompletionState} disabled={completion.isPending} onComplete={() => void completeDay()} />
        </VideoCompletionControl>}
      </View> : null}
      {resume.previous && plan && planDay && <SessionResumeSheet key={`${resumeKey}:${resume.previous}`}
        previous={resume.previous} lockedDate={resume.selected} today={today} code={dayCode(planDay, plan.days)}
        recorded={liveDrafts.filter(row => row.kind !== 'warmup' && row.sourceLog && !row.sourceLog.assumed).length}
        total={liveDrafts.filter(row => row.kind !== 'warmup').length} busy={resumeBusy || syncCompletionState === 'syncing'}
        onContinue={() => { void resume.resume(gymDayText(new Date())).catch(error => Alert.alert(t('student.setEntrySheet.copy010'), saveErrorCopy(error))); }}
        onComplete={date => { void completeDay(false, date); }} />}
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
            drafts: liveDrafts.filter(row => row.kind !== 'warmup'),
            weekCode: dayCode(planDay, orderedDays),
            date: recommendedDate(plan, planDay),
            coachName: binding.data?.bind_request?.coach_display_name ?? null,
            exerciseNames: new Map(planDay.exercises.map(exercise => [exercise.exercise_id, exerciseTitle(resolveExerciseMetadata(exercise.exercise_id))])),
            references: (historyQuery.data?.logs ?? []).filter(log => log.logged_date < localDateText(clockNow)).reduce((best, log) => {
              if (!log.completed || log.failed || log.assumed || log.is_warmup ||
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
      {outlookOpen && hasOutlook && plan ? <CycleOutlookSheet key={outlookKey} studentId={studentId} resolveExercise={resolveExerciseMetadata}
        input={{ plan, resolveExercise: resolveExerciseMetadata, logs: availableLogs, unit: workoutProfile?.unit_preference === 'lb' ? 'lb' : 'kg', currentWeek: cursor?.week_number ?? null, preview,
          registeredOneRM: { squat: parseFiniteDecimal(workoutProfile?.squat_1rm_kg ?? ''), bench: parseFiniteDecimal(workoutProfile?.bench_1rm_kg ?? ''), deadlift: parseFiniteDecimal(workoutProfile?.deadlift_1rm_kg ?? '') } }}
        onClose={() => setOutlookOwner(null)} onSelect={id => {
          setOutlookOwner(null);
          if (preview && selectedPlan) browsePlan(selectedPlan, 'first', id);
          else selectDay(id);
        }} /> : null}
      {editor.panel}
    </Screen>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    screen: { flex: 1 },
    undoCompletion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, minHeight: spacing.minimumHitTarget },
    undoCompletionText: { ...font.body(12), color: colors.textMuted },
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
