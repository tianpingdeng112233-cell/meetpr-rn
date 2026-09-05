import { t } from '@/i18n';
import { SerialTaskQueue } from '../serial-task-queue';
import { setsRepository, type SetLogUpsertRequest } from '@/api/domains/sets';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { AnalyticsEvent, track } from '@/analytics';
import { ApiError } from '@/api/client';
import { uploadsRepository } from '@/api/domains/uploads';
import type {
  SelectedVideo,
  VideoUploadEvent,
  VideoUploadRecord,
} from './model';
import { VIDEO_UPLOAD_ERRORS } from './model';
import {
  cancelVideoCompression,
  deleteLocalVideo,
  prepareTrainingVideo,
  retainVideoSource,
  localVideoSize,
  cleanOrphanVideos,
  VideoNativeError,
} from './native';
import {
  PartUploadError,
  UploadCancelledError,
  cleanInterruptedParts,
} from './multipart';
import { runPreparedVideoUpload } from './upload-runner';
import { useVideoUploadStore, flushVideoUploads } from './store';
import {
  UploadRetryScheduler,
  UPLOAD_RETRY_WINDOW_MS,
  type UploadFailure,
} from './retry-scheduler';
import { localRetentionRemovals, removedVideoUris } from './local-retention';
import { notifyUploadFailures } from './failure-notifier';

type UploadIdentity = { studentId: string; stableSetId: string };
type EnsureSetLog = () => Promise<string>;
type ActiveJob = {
  controller: AbortController;
  compressionId: string | null;
  done: Promise<void>;
};
const attachments = new Map<
  string,
  { sourceUri: string; done: Promise<void> }
>();
const mutations = new Map<string, SerialTaskQueue>();
const jobs = new Map<string, ActiveJob>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const ensureCallbacks = new Map<string, EnsureSetLog>();
let activeStudent: string | null = null;
let activeSession: symbol | null = null;
const keyFor = (id: UploadIdentity) => `${id.studentId}:${id.stableSetId}`;
const recordFor = (id: UploadIdentity) =>
  useVideoUploadStore.getState().records[keyFor(id)];
function dispatch(
  id: UploadIdentity,
  event: VideoUploadEvent,
): VideoUploadRecord {
  return useVideoUploadStore
    .getState()
    .dispatch(id.studentId, id.stableSetId, event);
}
function classify(error: unknown): UploadFailure {
  if (error instanceof PartUploadError && error.status === 403)
    return 'network';
  if (
    (error instanceof ApiError || error instanceof PartUploadError) &&
    error.status &&
    error.status >= 400 &&
    error.status < 500 &&
    ![408, 429].includes(error.status)
  )
    return 'deterministic';
  if (error instanceof VideoNativeError && error.deterministic)
    return 'deterministic';
  return 'network';
}
function notify(studentId: string) {
  notifyUploadFailures(() =>
    activeStudent === studentId
      ? Object.entries(useVideoUploadStore.getState().records).filter(
          ([key, record]) =>
            key.startsWith(`${studentId}:`) && record.status === 'failed',
        ).length
      : 0,
  );
}
function terminal(
  id: UploadIdentity,
  message = VIDEO_UPLOAD_ERRORS.processing,
) {
  dispatch(id, { type: 'failed', message });
  notify(id.studentId);
}
function resume(id: UploadIdentity, networkRestored = false): void {
  const key = keyFor(id);
  clearTimeout(timers.get(key));
  timers.delete(key);
  const record = recordFor(id);
  if (
    !record ||
    ['none', 'uploaded', 'failed'].includes(record.status) ||
    id.studentId !== activeStudent ||
    jobs.has(key)
  )
    return;
  if (record.retry) {
    const decision = UploadRetryScheduler({
      ...record.retry,
      now: Date.now(),
      networkRestored,
    });
    if (decision.kind === 'terminal') {
      terminal(id);
      return;
    }
    if (decision.kind === 'scheduled') {
      timers.set(
        key,
        setTimeout(
          () => resume(id),
          Math.max(0, decision.retryAt - Date.now()),
        ),
      );
      return;
    }
  }
  const ensure =
    ensureCallbacks.get(key) ??
    (async () => {
      const setLogId = recordFor(id)?.setLogId;
      if (setLogId) return setLogId;
      const request = recordFor(id)?.logRequest;
      if (!request)
        throw new VideoNativeError(VIDEO_UPLOAD_ERRORS.processing, {
          deterministic: true,
        });
      return (await setsRepository.upsert(request)).id;
    });
  void execute(id, ensure).catch(() => terminal(id));
}
async function run(
  id: UploadIdentity,
  ensureSetLog: EnsureSetLog,
  job: ActiveJob,
): Promise<void> {
  const signal = job.controller.signal;
  const check = () => {
    if (signal.aborted) throw new UploadCancelledError();
  };
  try {
    let record = recordFor(id);
    if (!record) return;
    let setLogId = record.setLogId;
    if (!setLogId) {
      try {
        setLogId = await ensureSetLog();
      } catch (cause) {
        // These are local validation failures from the sheet's save queue.
        // API/transport errors keep their original retry classification.
        if (
          cause instanceof Error &&
          [
            'Set log unavailable',
            'Invalid set input',
            'Selected day is no longer current',
          ].includes(cause.message)
        ) {
          throw new VideoNativeError(
            t(
              cause.message === 'Selected day is no longer current'
                ? 'student.todayWorkoutScreen.copy024'
                : 'student.todayWorkoutViewModelRecordingError.copy004',
            ),
            { cause, deterministic: true },
          );
        }
        throw cause;
      } finally {
        ensureCallbacks.delete(keyFor(id));
      }
    }
    check();
    dispatch(id, { type: 'setLogReady', setLogId });
    await flushVideoUploads();
    check();
    record = recordFor(id)!;
    if (!record.prepared || !record.localUri || !record.sizeBytes) {
      if (!record.source)
        throw new VideoNativeError(VIDEO_UPLOAD_ERRORS.processing, {
          deterministic: true,
        });
      const prepared = await prepareTrainingVideo(record.source, {
        signal,
        setCompressionCancellationId: (value) => {
          job.compressionId = value;
          if (signal.aborted) cancelVideoCompression(value);
        },
      });
      if (signal.aborted) {
        if (prepared.localUri !== record.source.uri)
          deleteLocalVideo(prepared.localUri);
        check();
      }
      const sourceUri = record.source.uri;
      record = dispatch(id, { type: 'prepared', ...prepared });
      await flushVideoUploads();
      if (sourceUri !== prepared.localUri) deleteLocalVideo(sourceUri);
    }
    check();
    const attachmentId = await runPreparedVideoUpload({
      localUri: record.localUri!,
      setLogId,
      sizeBytes: record.sizeBytes!,
      signal,
      session: record.session,
      parts: record.parts,
      onSession: async (session) => {
        dispatch(
          id,
          session
            ? { type: 'uploadSession', session }
            : { type: 'sessionExpired' },
        );
        await flushVideoUploads();
      },
      onPart: async (part) => {
        check();
        dispatch(id, { type: 'partCompleted', part });
        await flushVideoUploads();
      },
      onInitiated: () => {},
      onProgress: () => {},
    });
    check();
    const original = recordFor(id)?.source?.uri;
    dispatch(id, { type: 'succeeded', attachmentId });
    await flushVideoUploads();
    if (original && original !== record.localUri) deleteLocalVideo(original);
    void track(AnalyticsEvent.MediaUpload, {
      status: 'succeeded',
      kind: 'set_video',
      attachment_id: attachmentId,
    });
  } catch (error) {
    if (signal.aborted || error instanceof UploadCancelledError) return;
    const record = recordFor(id);
    if (!record) return;
    const now = Date.now();
    const retry = {
      firstFailureAt: record.retry?.firstFailureAt ?? now,
      lastFailureAt: now,
      failureCount: (record.retry?.failureCount ?? 0) + 1,
      failure: classify(error),
    };
    dispatch(id, { type: 'waiting', retry });
    if (UploadRetryScheduler({ ...retry, now }).kind === 'terminal')
      terminal(id, error instanceof VideoNativeError ? error.copy : undefined);
    await flushVideoUploads();
    void track(AnalyticsEvent.MediaUpload, {
      status: 'failed',
      kind: 'set_video',
    });
  }
}
async function execute(
  id: UploadIdentity,
  ensure: EnsureSetLog,
): Promise<void> {
  const key = keyFor(id);
  if (jobs.has(key)) return jobs.get(key)!.done;
  const job: ActiveJob = {
    controller: new AbortController(),
    compressionId: null,
    done: Promise.resolve(),
  };
  jobs.set(key, job);
  const firstFailure = recordFor(id)?.retry?.firstFailureAt;
  const deadline =
    firstFailure === undefined
      ? undefined
      : setTimeout(
          () => {
            job.controller.abort();
            cancelVideoCompression(job.compressionId);
            terminal(id);
          },
          Math.max(0, firstFailure + UPLOAD_RETRY_WINDOW_MS - Date.now()),
        );
  job.done = run(id, ensure, job);
  try {
    await job.done;
  } finally {
    clearTimeout(deadline);
    if (jobs.get(key) === job) jobs.delete(key);
    if (!job.controller.signal.aborted) resume(id);
  }
}
async function stop(id: UploadIdentity): Promise<void> {
  const key = keyFor(id);
  clearTimeout(timers.get(key));
  timers.delete(key);
  const job = jobs.get(key);
  job?.controller.abort();
  cancelVideoCompression(job?.compressionId ?? null);
  await job?.done;
}
async function removeRecord(id: UploadIdentity): Promise<void> {
  await stop(id);
  const record = recordFor(id);
  if (!record) return;
  if (record.attachmentId)
    await uploadsRepository.remove(record.attachmentId).catch((error) => {
      if (!(error instanceof ApiError && error.status === 404)) throw error;
    });
  removedVideoUris(record).forEach(deleteLocalVideo);
  dispatch(id, { type: 'remove' });
  ensureCallbacks.delete(keyFor(id));
  await flushVideoUploads();
}
async function sweep(): Promise<void> {
  const entries = Object.entries(useVideoUploadStore.getState().records);
  const files = entries.map(([key, record]) => ({
    key,
    createdAt: record.createdAt,
    sizeBytes: removedVideoUris(record).reduce(
      (sum, uri) => sum + localVideoSize(uri),
      0,
    ),
    uploaded: record.status === 'uploaded',
    prepared: record.prepared,
  }));
  for (const key of localRetentionRemovals(files, Date.now())) {
    const separator = key.indexOf(':');
    const id = {
      studentId: key.slice(0, separator),
      stableSetId: key.slice(separator + 1),
    };
    await stop(id);
    const record = recordFor(id);
    if (!record) continue;
    removedVideoUris(record).forEach(deleteLocalVideo);
    dispatch(id, { type: 'localCleared' });
    if (record.status !== 'uploaded') terminal(id);
  }
  await flushVideoUploads();
}
function mutate<T>(
  id: UploadIdentity,
  operation: () => Promise<T>,
): Promise<T> {
  const key = keyFor(id);
  let queue = mutations.get(key);
  if (!queue) {
    queue = new SerialTaskQueue();
    mutations.set(key, queue);
  }
  return queue.enqueue(operation);
}
const remove = (id: UploadIdentity) => mutate(id, () => removeRecord(id));

export const videoUploadManager = {
  attach(
    id: UploadIdentity,
    source: SelectedVideo,
    ensure: EnsureSetLog,
    buildLogRequest?: () => SetLogUpsertRequest,
  ): Promise<void> {
    const key = keyFor(id);
    const pending = attachments.get(key);
    if (pending?.sourceUri === source.uri) return pending.done;
    const done = (async () => {
      const retainedUri = await mutate(id, async () => {
        await useVideoUploadStore.getState().hydrate();
        const retained = await retainVideoSource(source);
        let logRequest: SetLogUpsertRequest | undefined;
        try {
          logRequest = buildLogRequest?.();
          await removeRecord(id);
        } catch (error) {
          deleteLocalVideo(retained.uri);
          throw error;
        }
        dispatch(id, { type: 'attach', source: retained, logRequest });
        ensureCallbacks.set(keyFor(id), ensure);
        await flushVideoUploads();
        return retained.uri;
      });
      void track(AnalyticsEvent.MediaUpload, {
        status: 'started',
        kind: 'set_video',
      });
      await sweep();
      if (
        recordFor(id)?.source?.uri === retainedUri &&
        recordFor(id)?.status !== 'failed'
      )
        await execute(id, ensure);
    })().finally(() => {
      if (attachments.get(key)?.done === done) attachments.delete(key);
    });
    attachments.set(key, { sourceUri: source.uri, done });
    return done;
  },
  async retry(id: UploadIdentity, ensure: EnsureSetLog): Promise<void> {
    if (recordFor(id)?.status !== 'failed') return;
    dispatch(id, { type: 'retry' });
    ensureCallbacks.set(keyFor(id), ensure);
    await execute(id, ensure);
  },
  remove,
  cancel: remove,
  start(studentId: string): () => void {
    const session = Symbol(studentId);
    activeSession = session;
    activeStudent = studentId;
    let disposed = false;
    let initialized = false;
    const resumeAll = (restored = false) => {
      if (disposed || !initialized || activeSession !== session) return;
      for (const key of Object.keys(useVideoUploadStore.getState().records)) {
        if (key.startsWith(`${studentId}:`))
          resume(
            { studentId, stableSetId: key.slice(studentId.length + 1) },
            restored,
          );
      }
    };
    void (async () => {
      await useVideoUploadStore.getState().hydrate();
      if (disposed || activeSession !== session) return;
      // Retain can be copying a file before its record is published.
      if (jobs.size === 0 && attachments.size === 0) {
        cleanInterruptedParts();
        cleanOrphanVideos(
          Object.values(useVideoUploadStore.getState().records).flatMap(
            removedVideoUris,
          ),
        );
      }
      await sweep();
      initialized = true;
      resumeAll();
    })().catch(() => undefined);
    let connected: boolean | null = null;
    const unsubscribe = NetInfo.addEventListener((state) => {
      const next =
        state.isConnected === true && state.isInternetReachable !== false;
      if (next && connected === false) resumeAll(true);
      connected = next;
    });
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') resumeAll();
    });
    return () => {
      disposed = true;
      unsubscribe();
      subscription.remove();
      if (activeSession !== session) return;
      activeSession = null;
      activeStudent = null;
      for (const [key, timer] of timers) {
        clearTimeout(timer);
        timers.delete(key);
      }
      for (const job of jobs.values()) {
        job.controller.abort();
        cancelVideoCompression(job.compressionId);
      }
      ensureCallbacks.clear();
    };
  },
};
