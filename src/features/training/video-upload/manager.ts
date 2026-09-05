import { AnalyticsEvent, track } from '@/analytics';
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
  VideoNativeError,
} from './native';
import { UploadCancelledError } from './multipart';
import { runPreparedVideoUpload } from './upload-runner';
import { useVideoUploadStore } from './store';

type UploadIdentity = { studentId: string; stableSetId: string };
type EnsureSetLog = () => Promise<string>;

type ActiveJob = {
  abortController: AbortController;
  compressionCancellationId: string | null;
};

const jobs = new Map<string, ActiveJob>();

function jobKey(identity: UploadIdentity): string {
  return `${identity.studentId}:${identity.stableSetId}`;
}

function recordFor(identity: UploadIdentity): VideoUploadRecord | undefined {
  return useVideoUploadStore.getState().records[jobKey(identity)];
}

function dispatch(
  identity: UploadIdentity,
  event: VideoUploadEvent,
): VideoUploadRecord {
  return useVideoUploadStore
    .getState()
    .dispatch(identity.studentId, identity.stableSetId, event);
}

async function execute(
  identity: UploadIdentity,
  ensureSetLog: EnsureSetLog,
  previousAttachmentId: string | null,
): Promise<void> {
  const key = jobKey(identity);
  const job: ActiveJob = {
    abortController: new AbortController(),
    compressionCancellationId: null,
  };
  jobs.get(key)?.abortController.abort();
  jobs.set(key, job);

  try {
    let record = recordFor(identity);
    if (!record) throw new Error('Video upload state is missing');
    let setLogId = record.setLogId;
    if (!setLogId) {
      setLogId = await ensureSetLog();
      dispatch(identity, { type: 'setLogReady', setLogId });
    }
    if (job.abortController.signal.aborted) throw new UploadCancelledError();

    record = recordFor(identity);
    if (!record) throw new Error('Video upload state is missing');
    let localUri = record.localUri;
    let sizeBytes = record.sizeBytes;
    if (!record.prepared || !localUri || !sizeBytes) {
      if (!record.source) throw new Error('Video source is missing');
      const prepared = await prepareTrainingVideo(record.source, {
        signal: job.abortController.signal,
        setCompressionCancellationId: (id) => {
          job.compressionCancellationId = id;
        },
      });
      localUri = prepared.localUri;
      sizeBytes = prepared.sizeBytes;
      dispatch(identity, { type: 'prepared', localUri, sizeBytes });
    } else {
      dispatch(identity, { type: 'preparing' });
    }

    let lastReportedPercent = -1;
    const attachmentId = await runPreparedVideoUpload({
      localUri,
      setLogId,
      sizeBytes,
      signal: job.abortController.signal,
      onInitiated: (id) => dispatch(identity, { type: 'uploadStarted', attachmentId: id }),
      onProgress: (progress) => {
        const percent = Math.floor(progress * 100);
        if (percent === lastReportedPercent) return;
        lastReportedPercent = percent;
        dispatch(identity, { type: 'progress', progress });
      },
    });
    deleteLocalVideo(localUri);
    dispatch(identity, { type: 'succeeded', attachmentId });
    if (previousAttachmentId && previousAttachmentId !== attachmentId) {
      await uploadsRepository.remove(previousAttachmentId).catch(() => undefined);
    }
    await track(AnalyticsEvent.MediaUpload, {
      status: 'succeeded',
      kind: 'set_video',
      attachment_id: attachmentId,
    });
  } catch (error) {
    if (error instanceof UploadCancelledError || job.abortController.signal.aborted) {
      return;
    }
    const message =
      error instanceof VideoNativeError
        ? error.copy
        : VIDEO_UPLOAD_ERRORS.processing;
    dispatch(identity, { type: 'failed', message });
    await track(AnalyticsEvent.MediaUpload, {
      status: 'failed',
      kind: 'set_video',
      reason: message,
    });
  } finally {
    if (jobs.get(key) === job) jobs.delete(key);
  }
}

export const videoUploadManager = {
  async attach(
    identity: UploadIdentity,
    source: SelectedVideo,
    ensureSetLog: EnsureSetLog,
  ): Promise<void> {
    const previousAttachmentId = recordFor(identity)?.attachmentId ?? null;
    dispatch(identity, { type: 'attach', source, previousAttachmentId });
    await track(AnalyticsEvent.MediaUpload, {
      status: 'started',
      kind: 'set_video',
    });
    await execute(identity, ensureSetLog, previousAttachmentId);
  },

  async retry(
    identity: UploadIdentity,
    ensureSetLog: EnsureSetLog,
  ): Promise<void> {
    const record = recordFor(identity);
    if (!record || record.status !== 'failed') return;
    const previousAttachmentId = record.attachmentId;
    dispatch(identity, { type: 'retry' });
    await track(AnalyticsEvent.MediaUpload, {
      status: 'started',
      kind: 'set_video',
      retry: true,
    });
    await execute(identity, ensureSetLog, previousAttachmentId);
  },

  async cancel(identity: UploadIdentity): Promise<void> {
    const key = jobKey(identity);
    const record = recordFor(identity);
    const job = jobs.get(key);
    job?.abortController.abort();
    cancelVideoCompression(job?.compressionCancellationId ?? null);
    if (record?.attachmentId && record.status !== 'uploaded') {
      await uploadsRepository.abort(record.attachmentId).catch(() => undefined);
    }
    deleteLocalVideo(record?.localUri ?? record?.source?.uri ?? null);
    dispatch(identity, { type: 'remove' });
  },

  async remove(identity: UploadIdentity): Promise<void> {
    const record = recordFor(identity);
    if (!record) return;
    if (record.attachmentId) {
      await uploadsRepository.remove(record.attachmentId);
    }
    deleteLocalVideo(record.localUri ?? record.source?.uri ?? null);
    dispatch(identity, { type: 'remove' });
  },
};
