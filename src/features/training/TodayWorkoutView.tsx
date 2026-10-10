import { isAccessoryExercise } from './accessory-quick-log';
import { readRestPreference } from '@/features/settings/storage';
import type { SetLogUpsertRequest } from '@/api/domains/sets';
import { localDateText } from '@/domain/plan/workout-date-policy';
import { chatRepository, type Conversation } from '@/api/domains/chat';
import { SetRefEntryVisibility } from '@/features/chat/set-ref';
import { SetRefSharePicker, loadTodaySetRefCandidates } from '@/features/chat/SetRefSharePicker';
import {
  cursorDay,
  recommendedDate,
  sequenceDays,
  selectCurrentPlan,
  planLogRange,
  workoutDayState,
  dayCode,
} from '@/domain/plan/sequence';
import { dayName, recommendedDateText } from '@/domain/plan/presentation';
import { trainingWeekStrip } from '@/domain/plan/week-strip';
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
import { MeetPRMark } from '@/features/dashboard/MeetPRMark';
import { TrainingWeekStrip } from './TrainingWeekStrip';
import { studentChatKeys, useOpenCoachChat } from '@/features/chat/open-coach-chat';
import { StudentTodayRefreshThrottle } from './refresh-throttle';
import {
  hydrateRemoteVideoAttachments,
  type VideoAttachmentSet,
} from './video-upload/store';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Keyboard, ScrollView, TextInput, StyleSheet, Text, View, type LayoutRectangle } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';

import { t } from '@/i18n';
import { showToast } from '@/design/Toast';
import { QuickLogSheet } from './QuickLogSheet';
import { QuickLogAttempt, makeQuickLogPlan, localNoon, type QuickLogPlan } from './quick-log';
import { training22 } from './build22-strings';
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
  font,
  radius,
  useColors,
  type Colors,
  Screen,
  spacing,
  typography,
} from '@/design';
import {
  buildE1RMSeries,
  E1RMRecorder,
} from '@/domain/e1rm';
import { useStudentTabsStore } from '@/features/student-tabs';

import { DayCompletionBanner, WorkoutCompletionFlowView, type WorkoutCompletionFlowPhase } from './CompletionControls';
import { workoutCompletionPresentation, type CompletionReference } from './completion-presentation';
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
  gymDayText,
  historyRangeStart,
  parseFiniteDecimal,
  resolveRestSeconds,
  resolveAccessoryRestSeconds,
} from './policy';
import { ReadinessSheet } from './ReadinessSheet';
import { RestTimer } from './RestTimer';
import { saveErrorCopy } from './save-errors';
import { SerialTaskQueue } from './serial-task-queue';
import { SetEntrySheet } from './SetEntrySheet';
import {
  readBoolean,
  readNumber,
  readReview,
  trainingE1RMRepository,
  writeBoolean,
  writeReview,
} from './storage';
import { trackTrainingTabVisit } from './training-analytics';
import { WorkoutBody } from './WorkoutBody';
import { useReducedMotion } from '@/design/useReducedMotion';

const EMPTY_E1RM_BY_EXERCISE: Record<string, number | null> = {};

export function TodayWorkoutView() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const workoutScroll = useRef<ScrollView>(null);
  const focusedAccessoryInput = useRef<TextInput | null>(null);
  const reducedMotion = useReducedMotion();
  const keyboardVisible = useRef(false);
  const userScrolling = useRef(false);
  const completedRowToReveal = useRef<string | null>(null);
  const [completionDockHeight, setCompletionDockHeight] = useState(spacing.completionControlHeight + spacing.md * 2 + StyleSheet.hairlineWidth);
  const [restOverlayHeight, setRestOverlayHeight] = useState<number>(spacing.xxxl);
  const markExerciseCompleted = useCallback((exerciseId: string) => {
    completedRowToReveal.current = !keyboardVisible.current && !Keyboard.isVisible() && !userScrolling.current ? exerciseId : null;
  }, []);
  const revealCompletedRow = useCallback((exerciseId: string, layout: LayoutRectangle) => {
    if (completedRowToReveal.current !== exerciseId) return;
    completedRowToReveal.current = null;
    if (keyboardVisible.current || Keyboard.isVisible() || userScrolling.current) return;
    workoutScroll.current?.scrollTo({ y: Math.max(0, layout.y - spacing.md), animated: !reducedMotion });
  }, [reducedMotion]);
  const revealAccessoryInput = useCallback(() => {
    if (focusedAccessoryInput.current) workoutScroll.current?.scrollResponderScrollNativeHandleToKeyboard(focusedAccessoryInput.current, spacing.lg, true);
  }, []);
  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidShow', () => {
      keyboardVisible.current = true;
      completedRowToReveal.current = null;
      revealAccessoryInput();
    });
    const hidden = Keyboard.addListener('keyboardDidHide', () => { keyboardVisible.current = false; focusedAccessoryInput.current = null; });
    return () => { subscription.remove(); hidden.remove(); };
  }, [revealAccessoryInput]);
  const studentId = useSessionStore((state) => state.user?.id ?? '');
  const { totalUnread: unreadCount, openCoachChat, isOpening } = useOpenCoachChat(studentId);
  const [shareRoute, setShareRoute] = useState<{ conversationId: string; initialSetLogID?: string; coachName: string } | null>(null);
  const [preparingShare, setPreparingShare] = useState(false);
  const preparingShareRef = useRef(false);
  const shareGeneration = useRef(0);
  useFocusEffect(useCallback(() => () => { shareGeneration.current += 1; setShareRoute(null); }, []));
  const loadShareCandidates = useCallback(() => loadTodaySetRefCandidates(studentId), [studentId]);
  const [clockNow, setClockNow] = useState(() => new Date());
  const today = gymDayText(clockNow);
  const handoff = useStudentTabsStore((state) => state.trainingHandoff);
  const [requestedDayID, setRequestedDayID] = useState<string | null>(() =>
    handoff?.plan.trainee_id === studentId ? handoff.dayID : null,
  );
  const [quickLogPlan, setQuickLogPlan] = useState<QuickLogPlan | null>(null);
  const quickLogAttempt = useRef<QuickLogAttempt | null>(null);
  const [quickLogContext, setQuickLogContext] = useState({ dayCode: '', subtitle: '' });
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
  const [accessoryRest, setAccessoryRest] = useState(false);
  const [restExerciseName, setRestExerciseName] = useState('');
  const [restGeneration, setRestGeneration] = useState(0);
  const trainingFocused = useRef(true);
  const restRevision = useRef(0);
  const endRest = useCallback(() => {
    restRevision.current += 1;
    setRestSeconds(null);
  }, []);
  const [reviewState, setReviewState] = useState<{
    key: string;
    status: 'loading' | 'loaded';
    value: SessionReview | null;
  }>(() => ({ key: '', status: 'loading', value: null }));
  const [completionPhase, setCompletionPhase] = useState<WorkoutCompletionFlowPhase | null>(null);
  const [readinessVisible, setReadinessVisible] = useState(false);
  const [readinessSkipState, setReadinessSkipState] = useState({
    key: '',
    value: false,
  });
  const [e1rmState, setE1rmState] = useState<{
    key: string;
    values: Record<string, number | null>;
  }>({ key: '', values: {} });
  const [initialCamera, setInitialCamera] = useState(false);
  const [videoRefresh, setVideoRefresh] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const saveQueue = useRef(new SerialTaskQueue());
  const jumpToken = useStudentTabsStore((state) => state.trainingJumpToken);
  const planRevision = useStudentTabsStore((state) => state.planRevision);
  const previousJump = useRef(jumpToken);
  const previousRevision = useRef(planRevision);
  const loadGeneration = useRef(new LoadGeneration());
  const queryClient = useQueryClient();
  const resolveExerciseMetadata = useExerciseMetadataResolver(studentId);
  const resolveE1RMFamily = useCallback((exerciseId: string) =>
    resolveExerciseMetadata(exerciseId)?.competitionFamily ?? null, [resolveExerciseMetadata]);
  const recorder = useMemo(() => new E1RMRecorder(trainingE1RMRepository, {
    resolveFamily: resolveE1RMFamily,
  }), [resolveE1RMFamily]);
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
  const weekStrip = trainingWeekStrip(plan, requestedDayID, today);
  const viewedWeek = weekStrip.week;
  const weekIsBehind = viewedWeek?.status === 'current' && weekStrip.daysBehind > 0;
  const weekStatus = weekIsBehind ? t('student.trainingWeekStrip.daysBehind', [weekStrip.daysBehind])
    : t(viewedWeek?.status === 'current' ? 'student.trainingWeekStrip.current'
      : viewedWeek?.status === 'upcoming' ? 'student.trainingWeekStrip.upcoming' : 'student.trainingWeekStrip.completed');
  const planDay = weekStrip.selectedDay;
  const selectedDayID = planDay?.id ?? null;
  const previousSelectedDayID = useRef<string | null>(null);
  useEffect(() => {
    if (previousSelectedDayID.current !== null && previousSelectedDayID.current !== selectedDayID) {
      // RN Android does not clamp out-of-range scroll positions while the ScrollView is hidden.
      workoutScroll.current?.scrollTo({ y: 0, animated: false });
    }
    previousSelectedDayID.current = selectedDayID;
  }, [selectedDayID]);
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
    { from: '1970-01-01', to: localDateText(clockNow) },
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
  const accessoryDraftsRef = useRef(liveDrafts);
  useEffect(() => { accessoryDraftsRef.current = liveDrafts; }, [liveDrafts]);
  // Drafts are rebuilt each render; only changes to log identities need a fetch.
  const videoSetKey = JSON.stringify(
    liveDrafts.flatMap((draft) =>
      draft.sourceLog?.id
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
      // Also refresh attachments on throttled tab returns and manual refreshes.
      setVideoRefresh((value) => value + 1);
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
      trainingFocused.current = true;
      setClockNow(new Date());
      void refreshRef.current(throttle.current.refreshWhenReturning());
      return () => {
        trainingFocused.current = false;
        endRest();
        setRequestedDayID(null);
      };
    }, [endRest, setRequestedDayID]),
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
      endRest();
      setRecordingSetId(null);
      setEditingPlan(null);
      void refreshRef.current(throttle.current.refreshWhenReturning());
    });
  }, [endRest, handoff, jumpToken, queryClient, studentId]);
  useEffect(() => {
    if (planRevision === previousRevision.current) return;
    previousRevision.current = planRevision;
    void refreshRef.current();
  }, [planRevision]);
  const startKey = `${studentId}:${selectedDayID}`;
  useEffect(() => {
    completedRowToReveal.current = null;
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
      endRest();
      setEditingPlan(plan);
      setRequestedDayID(draft.exercise.plan_day_id);
      setRecordingSetId(draft.stableSetId);
    }
  };
  const selectDay = (id: string | null) => {
    // Re-selecting the current day must not clear data whose load key is unchanged.
    if ((id ?? weekStrip.todayDay?.id) === selectedDayID) {
      setRequestedDayID(id);
      return;
    }
    endRest();
    loadGeneration.current.begin('review');
    loadGeneration.current.begin('e1rm');
    setReviewState({
      key: `${studentId}:${id}`,
      status: 'loading',
      value: null,
    });
    setCompletionPhase(null);
    setE1rmState({ key: '', values: {} });
    setRecordingSetId(null);
    setEditingPlan(null);
    setRequestedDayID(id);
  };
  const refreshToday = async () => {
    if (refreshing) return;
    selectDay(null);
    setRefreshing(true);
    try { await refresh(); }
    finally { setRefreshing(false); }
  };
  const completeDay = async (undo = false) => {
    if (!planDay || completion.isPending || undoCompletion.isPending) return;
    setRequestedDayID(planDay.id);
    if (!undo) {
      endRest();
      setCompletionPhase('celebration');
    }
    try {
      await (undo ? undoCompletion : completion).mutateAsync(planDay.id);
      bumpCompletion();
    } catch (error) {
      if (!undo) setCompletionPhase(null);
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
    attachmentOnly?: boolean;
    accessory?: { request: SetLogUpsertRequest; mode: 'single' | 'all' };
    quickLogDate?: string;
  }): Promise<string | undefined> => {
    let restRevisionAtSave = restRevision.current;
    const operation = async () => {
      const currentDrafts = input.accessory ? accessoryDraftsRef.current : liveDrafts;
      const draft = currentDrafts.find(
        (candidate) => candidate.stableSetId === input.stableSetId,
      );
      if (!draft) return;
      const usesAccessoryRest = !input.quickLogDate && isAccessoryExercise(resolveExerciseMetadata(draft.exercise.exercise_id)?.exerciseType);
      if (useSessionStore.getState().user?.id !== studentId) throw new Error('Session changed');
      const latestPlan = queryClient.getQueryData<PlanDetail>(
        planKeys.detail(plan?.id ?? ''),
      );
      if (
        !editable ||
        (latestPlan &&
          (latestPlan.status !== 'published' ||
            cursorDay(latestPlan.days)?.id !== selectedDayID))
      ) {
        if (!input.attachmentOnly && !input.quickLogDate) Alert.alert(
          t('student.setEntrySheet.copy010'),
          t('student.todayWorkoutScreen.copy024'),
        );
        throw new Error('Selected day is no longer current');
      }
      if (input.accessory?.mode === 'single' && input.completed) { endRest(); restRevisionAtSave = restRevision.current; }
      const logDate = input.quickLogDate ?? gymDayText(new Date());
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
        if (!input.attachmentOnly && !input.quickLogDate) Alert.alert(
          t('student.setEntrySheet.copy010'),
          t('student.todayWorkoutViewModelRecordingError.copy004'),
          [{ text: t('student.restTimerExplanationView.copy005') }],
        );
        throw new Error('Invalid set input');
      }
      try {
        const response = await upsert.mutateAsync(input.accessory?.request ?? {
          plan_exercise_id: draft.exercise.id,
          ...(input.quickLogDate ? { logged_date: input.quickLogDate } : {}),
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
        const nextDrafts = currentDrafts.map((candidate) =>
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
                  logged_at: input.quickLogDate ? localNoon(input.quickLogDate).toISOString() : response.logged_at,
                },
              } satisfies WorkoutSetDraft)
            : candidate,
        );
        if (input.accessory) accessoryDraftsRef.current = nextDrafts;
        const updatedDraft = nextDrafts.find(
          (candidate) => candidate.stableSetId === draft.stableSetId,
        );
        if (updatedDraft) {
          setDraftOverrides((current) => ({
            ...current,
            [updatedDraft.stableSetId]: updatedDraft,
          }));
        }
        if (input.attachmentOnly) return response.id;
        setRecordingSetId(null);
        setEditingPlan(null);
        void track(AnalyticsEvent.SetLogged, {
          failed: input.failed,
          set_index: draft.setIndex,
          date: logDate,
        });

        if (!input.failed && completed) {
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
          if (
            trainingFocused.current && !input.quickLogDate && (usesAccessoryRest || draft.status !== 'complete') &&
            (usesAccessoryRest ? input.accessory?.mode !== 'all' && nextDrafts.some(candidate => candidate.exercise.id === draft.exercise.id && !isDraftTerminal(candidate)) : nextDrafts.some((candidate) => !isDraftTerminal(candidate)))
          ) {
            const accessoryPreference = usesAccessoryRest ? await readRestPreference(studentId) : null;
            const preference = usesAccessoryRest ? null : await readNumber(
              STORAGE_KEYS.restPreference(studentId),
            );
            if (!trainingFocused.current || restRevision.current !== restRevisionAtSave) return response.id;
            const restExercise = resolveExerciseMetadata(draft.exercise.exercise_id);
            setAccessoryRest(usesAccessoryRest);
            setRestExerciseName(restExercise ? exerciseTitle(restExercise) : '');
            setRestGeneration(value => value + 1);
            setRestSeconds(
              accessoryPreference ? resolveAccessoryRestSeconds({ prescribed: draft.planSet.rest_seconds, preference: accessoryPreference }) : resolveRestSeconds({
                prescribed: draft.planSet.rest_seconds,
                preference,
                rpe: prescriptionRestRPE(draft.planSet),
              }),
            );
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
    return saveQueue.current.enqueue(operation);
  };

  const openQuickLog = () => {
    if (!plan || !planDay || !editable) return;
    const initial = makeQuickLogPlan({ plan, day: planDay, drafts: liveDrafts, logs: logsQuery.data?.logs ?? [], suggestedWeight: draft => outcomeForDraft(draft).suggestion?.weightKg ?? null });
    setQuickLogContext({ dayCode: dayCode(planDay, orderedDays), subtitle: dayName(planDay, resolveExerciseMetadata) });
    quickLogAttempt.current = new QuickLogAttempt({
      persist: async (row, date) => {
        const id = await commit({ stableSetId: row.draft.stableSetId, weightText: row.draft.weightText, repsText: row.draft.repsText, rpeText: row.draft.rpeText, failed: false, quickLogDate: date });
        if (!id) throw new Error('Set unavailable');
      },
      complete: async dayId => {
        if (useSessionStore.getState().user?.id !== studentId) throw new Error('Session changed');
        await completion.mutateAsync(dayId);
        bumpCompletion();
      },
    });
    setQuickLogPlan(initial);
  };

  const showsSetRefEntry = SetRefEntryVisibility.shouldShow({ isEditable: editable, hasAvailableSet: liveDrafts.length > 0,
    hasActiveCoach: binding.data?.bind_request?.status === 'accepted', hasSharingContext: Boolean(studentId) });
  async function openSetRefPicker(draft: WorkoutSetDraft) {
    const bound = binding.data?.bind_request;
    if (preparingShareRef.current || !showsSetRefEntry || bound?.status !== 'accepted') return;
    preparingShareRef.current = true; setPreparingShare(true);
    const generation = shareGeneration.current;
    try {
      const { conversation } = await chatRepository.open(bound.coach_id);
      if (generation !== shareGeneration.current) return;
      const queryKey = studentChatKeys.conversations(studentId);
      await queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData<{ conversations: Conversation[] }>(queryKey, previous => ({ conversations: [...(previous?.conversations ?? []).filter(item => item.id !== conversation.id), conversation] }));
      if (generation === shareGeneration.current) setShareRoute({ conversationId: conversation.id, initialSetLogID: draft.sourceLog?.id ?? draft.exercise.sets.find(set => set.set_number === draft.setIndex + 1)?.id, coachName: bound.coach_display_name ?? conversation.other_party.display_name });
    } catch {
      if (generation === shareGeneration.current) Alert.alert(t('student.trainingShareConversationFailed'));
    } finally { preparingShareRef.current = false; setPreparingShare(false); }
  }
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
  const stickyCompletion = completionUI.sticky && (state.kind === 'loaded' || state.kind === 'recording');
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
        <MeetPRMark />
        <View style={styles.navRow}>
          <Text style={styles.navTitle}>
            {planDay
              ? dayCode(planDay, orderedDays)
              : plan
                ? t('student.todayWorkoutView.copy011')
                : 'W—'}
          </Text>
          <View style={styles.navActions}>
            {weekStrip.showBackToToday ? (
              <AppButton
                variant="link"
                label={t('student.trainingWeekStrip.backToToday')}
                onPress={() => selectDay(null)}
              />
            ) : <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('student.todayWorkoutScreen.copy005')}
              onPress={() => void refreshToday()}
              style={styles.navButton}
            >
              <View style={styles.navButtonFace}>
                <MaterialCommunityIcons
                  color={colors.textSecondary}
                  name="refresh"
                  size={18}
                />
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={readinessLabel}
              onPress={() => setReadinessVisible(true)}
              style={styles.navButton}
            >
              <View style={styles.navButtonFace}>
                <MaterialCommunityIcons
                  color={readinessDone ? colors.success : colors.textSecondary}
                  name={readinessDone ? 'heart' : 'heart-outline'}
                  size={18}
                />
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('student.todayWorkoutScreen.copy007')}
              disabled={isOpening}
              onPress={() => void openCoachChat()}
              style={styles.navButton}
            >
              <View style={styles.navButtonFace}>
                <MaterialCommunityIcons
                  color={colors.textPrimary}
                  name="message-outline"
                  size={18}
                />
              </View>
              {unreadCount > 0 ? (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadCount}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              ) : null}
            </Pressable>
            </>}
          </View>
        </View>
        <View style={styles.weekHistoryRow}>
          {state.kind !== 'loading' && plan && viewedWeek ? <View style={styles.weekHeading}>
            <Text numberOfLines={1} adjustsFontSizeToFit style={styles.weekNumber}>W{viewedWeek.number}</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}
              accessibilityLabel={weekIsBehind ? t('student.trainingWeekStrip.daysBehindAccessibility', [weekStrip.daysBehind]) : weekStatus}
              style={[styles.weekBadge, viewedWeek.status === 'current' && styles.currentWeekBadge]}>{weekStatus}</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit style={styles.weekCount}>{viewedWeek.completed} / {viewedWeek.cells.length}</Text>
          </View> : <View style={styles.weekHeading} />}
        <Pressable accessibilityRole="button" accessibilityLabel={t('student.trainingHistoryView.copy024')} onPress={() => router.push('/training-history')} style={styles.historyLink}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.historyLabel}>{t('student.trainingHistoryView.copy024')}</Text>
          <MaterialCommunityIcons name="chevron-right" size={spacing.base} color={colors.goldText} />
        </Pressable>
        </View>
      </View>
      <ScrollView ref={workoutScroll} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets
        onScrollBeginDrag={() => { userScrolling.current = true; completedRowToReveal.current = null; }}
        onScrollEndDrag={() => { userScrolling.current = false; }}
        onMomentumScrollBegin={() => { userScrolling.current = true; completedRowToReveal.current = null; }}
        onMomentumScrollEnd={() => { userScrolling.current = false; }}
        contentContainerStyle={[styles.content, stickyCompletion && { paddingBottom: completionDockHeight + (restSeconds !== null ? restOverlayHeight + spacing.xs : 0) + spacing.md }]}>
        {state.kind !== 'loading' && plan ? (
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
        {state.kind === 'noPlan' ? (
          <Card style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {t('student.todayWorkoutScreen.copy002')}
            </Text>
            <Text style={styles.emptySub}>
              {t('student.todayWorkoutScreen.copy003', [coachName])}
            </Text>
            <AppButton haptic="none"
              variant="secondary"
              label={t('student.todayWorkoutScreen.copy004')}
              onPress={() => router.navigate('/(student)/growth')}
            />
            <AppButton
              variant="link"
              label={t('student.todayWorkoutScreen.copy005')}
              onPress={() => void refreshToday()}
            />
          </Card>
        ) : null}
        {state.kind === 'loaded' || state.kind === 'recording' ? (
          <>
            {dayState?.kind === 'completed' ? (
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
                  {t('student.todayWorkoutScreen.copy024')}
                </Text>
                {dayState.canUndo ? (
                  <AppButton
                    variant="link"
                    label={t('student.todayWorkoutScreen.copy023')}
                    disabled={undoCompletion.isPending}
                    onPress={() => void completeDay(true)}
                  />
                ) : null}
              </View>
            ) : null}
            <WorkoutBody
              key={startKey}
              onExerciseCompleted={markExerciseCompleted}
              onCompletedRowLayout={revealCompletedRow}
              preview={dayState?.kind === 'upcoming' && plan ? {
                recommendedDate: weekStrip.week?.cells.find(cell => cell.isSelected)?.isBehind
                  ? undefined : recommendedDateText(recommendedDate(plan, state.planDay)),
                title: dayName(state.planDay, resolveExerciseMetadata),
                unlockMessage: cursor ? t('student.trainingCalendarLogic.copy012', [
                  cursor.week_number, `D${dayCode(cursor, orderedDays).split('D')[1]} · ${dayName(cursor, resolveExerciseMetadata)}`,
                ]) : undefined,
              } : undefined}
              onAskCoach={showsSetRefEntry ? draft => void openSetRefPicker(draft) : undefined}
              preparingShare={preparingShare}
              exercises={state.planDay.exercises}
              drafts={state.drafts}
              editable={editable}
              recording={recording}
              startLoading={startedLoaded !== startKey}
              onQuickLog={editable && !recording && realDrafts.length === 0 ? openQuickLog : undefined}
              onStart={() => {
                setStartedDays((current) => ({ ...current, [startKey]: true }));
                void writeBoolean(`training.started.${startKey}`, true);
              }}
              suggestionForDraft={outcomeForDraft}
              historyLogs={(historyQuery.data?.logs ?? []).filter(
                (log) => log.logged_date < today,
              )}
              studentId={studentId}
              unit={profileQuery.data?.unit_preference === 'lb' ? 'lb' : 'kg'}
              onAccessoryInputFocus={input => { focusedAccessoryInput.current = input; revealAccessoryInput(); }}
              onAccessorySave={async (draft, request, mode) => {
                const id = await commit({ stableSetId: draft.stableSetId, weightText: request.weight_kg, repsText: String(request.reps), rpeText: request.rpe ?? '', failed: request.failed ?? false, completed: request.completed, accessory: { request, mode } });
                if (!id) throw new Error('Set unavailable');
                return id;
              }}
              onRecord={(draft) => { setInitialCamera(false); openDraft(draft); }}
              onVideo={(draft) => { setInitialCamera(true); openDraft(draft); }}
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
                onPress={() => setCompletionPhase('review')}
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
            {completionUI.button && !completionUI.sticky ? (
              <HoldToCompleteButton
                disabled={completion.isPending || upsert.isPending}
                onComplete={() => void completeDay()}
              />
            ) : null}
          </>
        ) : null}
      </ScrollView>
      {stickyCompletion ? <View testID="workout-completion-dock"
        onLayout={event => setCompletionDockHeight(event.nativeEvent.layout.height)}
        style={{ position: 'absolute', left: 0, right: 0, bottom: restSeconds !== null ? restOverlayHeight + spacing.xs : 0,
          paddingVertical: spacing.md, paddingHorizontal: spacing.base, borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.borderDefault, backgroundColor: colors.bgBase }}>
        <HoldToCompleteButton disabled={completion.isPending || upsert.isPending} onComplete={() => void completeDay()} />
      </View> : null}
      {quickLogPlan ? <QuickLogSheet initialPlan={quickLogPlan} dayCode={quickLogContext.dayCode} subtitle={quickLogContext.subtitle} exerciseName={id => exerciseTitle(resolveExerciseMetadata(id))} onClose={() => { setQuickLogPlan(null); quickLogAttempt.current = null; }} onSubmit={async input => {
        const outcome = await quickLogAttempt.current!.submit(input);
        if (outcome.kind === 'completed') {
          const completed = plan?.days.find(day => day.id === input.dayId);
          setQuickLogPlan(null); quickLogAttempt.current = null;
          endRest(); setRecordingSetId(null); setCompletionPhase(null);
          const latest = queryClient.getQueryData<PlanDetail>(planKeys.detail(plan?.id ?? ''));
          setRequestedDayID(latest ? cursorDay(latest.days)?.id ?? input.dayId : null);
          showToast(training22.saved(completed ? dayCode(completed, orderedDays) : ''), true);
          await refresh();
        }
        return outcome;
      }} /> : null}
      {shareRoute ? <SetRefSharePicker conversationId={shareRoute.conversationId} initialSetLogID={shareRoute.initialSetLogID} loadCandidates={loadShareCandidates} onClose={() => setShareRoute(null)} onStaged={() => router.navigate({ pathname: '/(student)/chat', params: { conversationId: shareRoute.conversationId, coachName: shareRoute.coachName } })} /> : null}
      {selectedDraft ? (
        <SetEntrySheet
          key={selectedDraft.stableSetId}
          studentId={studentId}
          initialCamera={initialCamera}
          ensureSetLog={async (input) => {
            const id = await commit({ ...input, completed: selectedDraft.status === 'complete', attachmentOnly: true });
            if (!id) throw new Error('Set log unavailable');
            return id;
          }}
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
          onSave={async (input) => { await commit(input); }}
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
            setRequestedDayID(null);
            router.navigate('/(student)/today');
            await track(AnalyticsEvent.WorkoutLogSave, {
              date: today,
              sets: liveDrafts.length,
            });
          }}
        />
      ) : null}
      {restSeconds !== null ? (
        <RestTimer
          key={restGeneration}
          durationSeconds={restSeconds}
          onOverlayLayout={event => setRestOverlayHeight(event.nativeEvent.layout.height)}
          showRPEExplanation={!accessoryRest}
          exerciseName={restExerciseName}
          studentId={studentId}
          onClose={endRest}
        />
      ) : null}
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
  });
