import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import { useMemo, useSyncExternalStore } from 'react';
import { useSessionStore } from '@/api/session';
import { plansRepository, type PlanDetail } from '@/api/domains/plans';
import { setsRepository, type SetLogUpsertRequest } from '@/api/domains/sets';
import { trainingE1RMRepository } from '../storage';
import { gymDayText } from '../policy';
import { SetSyncQueue, type PendingSet } from './queue';
import { createSetSender } from './sender';
import { CompletionGate, type VideoCompletionContext } from './completion';
import { hydrateVideoUploads, useVideoUploadStore, videoUploadsForCompletion } from '../video-upload/store';
import { completionVideoSummary, dayCompletionVideos } from '../video-upload/completion-delivery';

type AccountSync = { dayVideos: (dayId: string, context?: VideoCompletionContext) => ReturnType<typeof dayCompletionVideos>; retryWaitingVideos: (dayId: string) => Promise<void>; queue: SetSyncQueue; gate: CompletionGate; stop: () => void; setCompletionHandler: (handler: (dayId: string) => Promise<unknown>) => () => void };
const accounts = new Map<string, AccountSync>();
const completionListeners = new Set<(studentId: string, dayId: string) => void>();
export const onSyncedDayCompletion = (fn: (studentId: string, dayId: string) => void) => { completionListeners.add(fn); return () => { completionListeners.delete(fn); }; };
async function publishedPlans(studentId: string): Promise<PlanDetail[]> {
  const { plans } = await plansRepository.list(studentId);
  return Promise.all(plans.filter(plan => plan.status === 'published').map(plan => plansRepository.detail(plan.id)));
}
export function accountSetSync(studentId: string): AccountSync {
  const existing = accounts.get(studentId);
  if (existing) return existing;
  let online = true;
  let internetReachable: boolean | null = null;
  let disposed = false;
  const networkListeners = new Set<() => void>();
  const active = () => !disposed && Boolean(studentId) && useSessionStore.getState().user?.id === studentId;
  const send = createSetSender({
    upsert: request => { if (!active()) throw new Error('Set sync stopped'); return setsRepository.upsert(request); },
    remove: id => { if (!active()) throw new Error('Set sync stopped'); return setsRepository.remove(id); },
    missingExercise: async entry => {
      const plans = await publishedPlans(studentId);
      const day = plans.flatMap(plan => plan.days).find(day => day.id === entry.dayId);
      return Boolean(day && !day.exercises.some(exercise => exercise.id === entry.log.plan_exercise_id));
    },
    nextAddedIndex: async entry => {
      const nextDate = new Date(`${entry.loggedDate}T12:00:00Z`); nextDate.setUTCDate(nextDate.getUTCDate() + 1);
      const { logs } = await setsRepository.range(studentId, { from: entry.loggedDate, to: nextDate.toISOString().slice(0, 10), scope: 'all' });
      const local = [...queue.snapshot().pending, ...Object.values(queue.snapshot().confirmed)].filter(item => !item.remove).map(item => item.log);
      return Math.max(-1, ...[...logs, ...local].filter(log => log.adhoc && log.exercise_id === entry.exerciseId && log.logged_date === entry.loggedDate).map(log => log.set_index)) + 1;
    },
  });
  const queue = new SetSyncQueue(studentId, { storage: AsyncStorage, isActive: active, send,
    network: { isOnline: () => online, subscribe: fn => { networkListeners.add(fn); return () => { networkListeners.delete(fn); }; } } });
  let completionHandler: (dayId: string) => Promise<unknown> = dayId => plansRepository.completeDay(dayId);
  const defaultCompletionHandler = completionHandler;
  const dayVideos = (dayId: string, context?: VideoCompletionContext): ReturnType<typeof dayCompletionVideos> => {
    const snapshot = queue.snapshot();
    return dayCompletionVideos(studentId, dayId, context ?? gate.videoIntent(dayId) ?? { sets: [], exerciseIds: [] },
      videoUploadsForCompletion(), [
        ...Object.values(snapshot.drafts ?? {}).map(draft => ({ stableSetId: draft.stableSetId, dayId: draft.exercise.plan_day_id, remove: false, log: { id: draft.sourceLog?.id ?? '' } })),
        ...Object.values(snapshot.confirmed), ...snapshot.pending]);
  };
  const notify = async (dayId: string, count: number, kind: 'complete' | 'timeout') => {
    if (!active()) return;
    const { notifyVideoCompletion } = await import('../video-upload/failure-notifier');
    if (active()) await notifyVideoCompletion(kind, count, studentId, dayId);
  };
  const gate = new CompletionGate(studentId, AsyncStorage, async dayId => {
    await hydrateVideoUploads();
    if (!active() || queue.pending(dayId).length || !completionVideoSummary(dayVideos(dayId).map(row => row.upload)).delivered) throw new Error('Completion conditions changed');
    await completionHandler(dayId);
    if (!active()) return;
    completionListeners.forEach(fn => fn(studentId, dayId));
  }, { summary: (dayId, context) => completionVideoSummary(dayVideos(dayId, context).map(row => row.upload)),
    timeout: (dayId, count) => notify(dayId, count, 'timeout'), delivered: (dayId, count) => notify(dayId, count, 'complete') });
  const retryWaitingVideos = async (dayId: string) => {
    await Promise.all([queue.ready, gate.ready, hydrateVideoUploads()]);
    if (!active() || !gate.videoIntent(dayId)) return;
    const { videoUploadManager } = await import('../video-upload/manager');
    if (active()) await videoUploadManager.retryAll(studentId, dayVideos(dayId).map(row => row.stableSetId));
  };
  const resumeGate = async () => {
    await Promise.all([queue.ready, gate.ready]);
    if (!active() || !gate.pendingDays().length) return;
    await hydrateVideoUploads();
    if (!active()) return;
    for (const dayId of gate.pendingDays()) await gate.updateConditions(dayId, { setsSynchronized: queue.pending(dayId).length === 0, videosDelivered: completionVideoSummary(dayVideos(dayId).map(row => row.upload)).delivered });
  };
  const reconcileIds = () => {
    for (const [stableId, entry] of Object.entries(queue.snapshot().confirmed)) {
      if (!entry.remove) void trainingE1RMRepository.resolveSetLogId(studentId, `local:${stableId}`, entry.log.id).catch(() => {});
    }
  };
  const stopVideos = useVideoUploadStore.subscribe(() => { void resumeGate().catch(() => {}); });
  const retryWaiting = () => { for (const dayId of gate.pendingDays()) void retryWaitingVideos(dayId).catch(() => {}); };
  const stopReceipts = queue.subscribe(() => { reconcileIds(); void resumeGate().catch(() => {}); });
  const stopNetwork = NetInfo.addEventListener(state => {
    const wasOnline = online;
    // Platform internet probes can fail while our API remains reachable (for example on CN networks).
    online = state.isConnected !== false;
    const internetRecovered = internetReachable === false && state.isInternetReachable === true;
    internetReachable = state.isInternetReachable;
    if (online && (!wasOnline || internetRecovered)) { networkListeners.forEach(fn => fn()); retryWaiting(); void resumeGate().catch(() => {}); }
  });
  const appState = AppState.addEventListener('change', state => { if (state === 'active' && active()) { queue.sendNow(); retryWaiting(); void resumeGate().catch(() => {}); } });
  const stopSession = useSessionStore.subscribe(state => { if (state.user?.id !== studentId) { accounts.get(studentId)?.stop(); accounts.delete(studentId); } });
  const account = { queue, gate, dayVideos, retryWaitingVideos, setCompletionHandler: (handler: (dayId: string) => Promise<unknown>) => {
    completionHandler = handler; return () => { if (completionHandler === handler) completionHandler = defaultCompletionHandler; };
  }, stop: () => { disposed = true; queue.dispose(); gate.dispose(); stopVideos(); stopReceipts(); stopNetwork(); appState.remove(); stopSession(); } };
  accounts.set(studentId, account);
  void resumeGate().then(retryWaiting).catch(() => {});
  return account;
}
export function useSetSync(studentId: string) {
  const account = useMemo(() => accountSetSync(studentId), [studentId]);
  const snapshot = useSyncExternalStore(account.queue.subscribe, account.queue.snapshot);
  useSyncExternalStore(account.gate.subscribe, account.gate.snapshot);
  return { ...account, snapshot };
}

/** Recovery for videos retained before 102 and for a sheet unmounted mid-upload. */
export async function ensureVideoSet(studentId: string, stableSetId: string, request?: SetLogUpsertRequest | null, existingId?: string | null): Promise<string> {
  const { queue } = accountSetSync(studentId); await queue.ready;
  if (queue.pending().some(entry => entry.stableSetId === stableSetId)) return queue.waitForSet(stableSetId);
  const receipt = queue.snapshot().confirmed[stableSetId];
  if (receipt && !receipt.remove) return receipt.log.id;
  if (existingId && !existingId.startsWith('local:')) return existingId;
  if (!request) throw new Error('Set log unavailable');
  let dayId: string; let exerciseId: string;
  if ('plan_exercise_id' in request) {
    const exercise = (await publishedPlans(studentId)).flatMap(plan => plan.days).flatMap(day => day.exercises).find(exercise => exercise.id === request.plan_exercise_id);
    if (!exercise) throw new Error('Set metadata unavailable');
    dayId = exercise.plan_day_id; exerciseId = exercise.exercise_id;
  } else {
    if (!request.plan_day_id) throw new Error('Set metadata unavailable');
    dayId = request.plan_day_id; exerciseId = request.exercise_id;
  }
  // A UI edit may have arrived while recovery was loading the plan.
  if (!queue.pending().some(entry => entry.stableSetId === stableSetId)) {
    await queue.enqueue({ stableSetId, dayId, exerciseId, loggedDate: request.logged_date ?? gymDayText(new Date()), request });
  }
  return queue.waitForSet(stableSetId);
}

export function pendingSetCount(entries: readonly PendingSet[]): number { return new Set(entries.map(entry => entry.stableSetId)).size; }
