import type { SetLogUpsertRequest } from '@/api/domains/sets';
import type {
  UploadInitiateResponse,
  UploadCompleteRequest,
} from '@/api/domains/uploads';
import type { RetryState } from './retry-scheduler';
import { t } from '@/i18n';
export const VIDEO_UPLOAD_CONSENT_KEY = 'video_upload_consent_v1';
export const VIDEO_MAX_DURATION_SECONDS = 120;
export const VIDEO_PART_SIZE_BYTES = 5 * 1024 * 1024;
export const VIDEO_UPLOAD_CONCURRENCY = 3;

export const VIDEO_UPLOAD_ERRORS = Object.freeze({
  tooLong: (seconds: number) =>
    t('student.videoAttachmentViewModel.copy003', [seconds]),
  get transcode() {
    return t('student.videoAttachmentViewModel.copy004');
  },
  get processing() {
    return t('student.videoAttachmentViewModel.copy001');
  },
});

export type SelectedVideo = {
  uri: string;
  width: number;
  height: number;
  durationMs: number | null;
  mimeType: string | null;
  fileName: string | null;
  codec: string | null;
  rotationDegrees: number;
};

export type VideoUploadStatus =
  | 'none'
  | 'pending'
  | 'preparing'
  | 'uploading'
  | 'uploaded'
  | 'failed'
  | 'waiting';

export type VideoUploadRecord = {
  logRequest: SetLogUpsertRequest | null;
  createdAt: number;
  retry: RetryState | null;
  session: UploadInitiateResponse | null;
  parts: UploadCompleteRequest['parts'];
  status: VideoUploadStatus;
  progress: number;
  source: SelectedVideo | null;
  setLogId: string | null;
  localUri: string | null;
  sizeBytes: number | null;
  prepared: boolean;
  attachmentId: string | null;
  errorMessage: string | null;
};

export type VideoUploadEvent =
  | { type: 'uploadSession'; session: UploadInitiateResponse }
  | { type: 'partCompleted'; part: UploadCompleteRequest['parts'][number] }
  | { type: 'sessionExpired' }
  | { type: 'waiting'; retry: RetryState }
  | { type: 'localCleared' }
  | {
      type: 'attach';
      source: SelectedVideo;
      logRequest?: SetLogUpsertRequest;
      previousAttachmentId?: string | null;
    }
  | { type: 'setLogReady'; setLogId: string }
  | { type: 'prepared'; localUri: string; sizeBytes: number }
  | { type: 'preparing' }
  | { type: 'uploadStarted'; attachmentId: string }
  | { type: 'progress'; progress: number }
  | { type: 'succeeded'; attachmentId: string }
  | { type: 'failed'; message: string }
  | { type: 'retry' }
  | { type: 'remove' };

export const EMPTY_VIDEO_UPLOAD: VideoUploadRecord = Object.freeze({
  logRequest: null,
  createdAt: 0,
  retry: null,
  session: null,
  parts: [],
  status: 'none',
  progress: 0,
  source: null,
  setLogId: null,
  localUri: null,
  sizeBytes: null,
  prepared: false,
  attachmentId: null,
  errorMessage: null,
});

function clampProgress(progress: number): number {
  return Math.max(0, Math.min(1, progress));
}

export function videoUploadReducer(
  state: VideoUploadRecord,
  event: VideoUploadEvent,
): VideoUploadRecord {
  switch (event.type) {
    case 'uploadSession':
      return {
        ...state,
        status: 'uploading',
        session: event.session,
        attachmentId: event.session.attachment_id,
        parts: [],
      };
    case 'partCompleted':
      return {
        ...state,
        parts: [
          ...state.parts.filter(
            (part) => part.part_number !== event.part.part_number,
          ),
          event.part,
        ].sort((a, b) => a.part_number - b.part_number),
      };
    case 'sessionExpired':
      return { ...state, session: null, parts: [], attachmentId: null };
    case 'waiting':
      return { ...state, status: 'waiting', retry: event.retry };
    case 'localCleared':
      return {
        ...state,
        localUri: null,
        source: null,
        sizeBytes: null,
        prepared: false,
      };
    case 'attach':
      return {
        ...EMPTY_VIDEO_UPLOAD,
        status: 'pending',
        createdAt: Date.now(),
        source: event.source,
        logRequest: event.logRequest ?? null,
        attachmentId: event.previousAttachmentId ?? null,
      };
    case 'setLogReady':
      return { ...state, setLogId: event.setLogId };
    case 'prepared':
      return {
        ...state,
        status: 'preparing',
        prepared: true,
        source: null,
        localUri: event.localUri,
        sizeBytes: event.sizeBytes,
      };
    case 'preparing':
      return { ...state, status: 'preparing', progress: 0 };
    case 'uploadStarted':
      return {
        ...state,
        status: 'uploading',
        progress: 0,
        attachmentId: event.attachmentId,
      };
    case 'progress':
      return state.status === 'uploading'
        ? { ...state, progress: clampProgress(event.progress) }
        : state;
    case 'succeeded':
      return {
        ...state,
        status: 'uploaded',
        progress: 1,
        source: null,
        attachmentId: event.attachmentId,
        errorMessage: null,
        retry: null,
        session: null,
        parts: [],
      };
    case 'failed':
      return {
        ...state,
        status: 'failed',
        progress: 0,
        errorMessage: event.message,
      };
    case 'retry':
      return {
        ...state,
        status: state.prepared ? 'preparing' : 'pending',
        progress: 0,
        retry: null,
        errorMessage: null,
      };
    case 'remove':
      return EMPTY_VIDEO_UPLOAD;
  }
}

/** Interrupted records keep their session and retry window for automatic resumption. */
export function recoverInterruptedVideoUploads(
  records: Record<string, VideoUploadRecord>,
): Record<string, VideoUploadRecord> {
  return records;
}

export function videoPartCount(sizeBytes: number): number {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    throw new Error('Video size must be positive');
  }
  return Math.ceil(sizeBytes / VIDEO_PART_SIZE_BYTES);
}
