export const VIDEO_UPLOAD_CONSENT_KEY = 'video_upload_consent_v1';
export const VIDEO_MAX_DURATION_SECONDS = 120;
export const VIDEO_PART_SIZE_BYTES = 5 * 1024 * 1024;
export const VIDEO_UPLOAD_CONCURRENCY = 3;
export const VIDEO_PART_RETRY_COUNT = 2;
export const VIDEO_PART_RETRY_DELAY_MS = 1_000;

export const VIDEO_UPLOAD_ERRORS = Object.freeze({
  tooLong: (seconds: number) =>
    `视频超过 ${seconds} 秒上限,请截短后再上传`,
  transcode: '视频转码失败,请重试',
  processing: '视频处理失败,请重试',
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
  | 'failed';

export type VideoUploadRecord = {
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
  | { type: 'attach'; source: SelectedVideo; previousAttachmentId?: string | null }
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
    case 'attach':
      return {
        ...EMPTY_VIDEO_UPLOAD,
        status: 'pending',
        source: event.source,
        attachmentId: event.previousAttachmentId ?? null,
      };
    case 'setLogReady':
      return { ...state, setLogId: event.setLogId };
    case 'prepared':
      return {
        ...state,
        status: 'preparing',
        prepared: true,
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
        localUri: null,
        sizeBytes: null,
        prepared: false,
        attachmentId: event.attachmentId,
        errorMessage: null,
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
        attachmentId: null,
        errorMessage: null,
      };
    case 'remove':
      return EMPTY_VIDEO_UPLOAD;
  }
}

export function recoverInterruptedVideoUploads(
  records: Record<string, VideoUploadRecord>,
): Record<string, VideoUploadRecord> {
  return Object.fromEntries(
    Object.entries(records).map(([key, record]) => {
      if (
        record.status === 'pending' ||
        record.status === 'preparing' ||
        record.status === 'uploading'
      ) {
        return [
          key,
          videoUploadReducer(record, {
            type: 'failed',
            message: VIDEO_UPLOAD_ERRORS.processing,
          }),
        ];
      }
      return [key, record];
    }),
  );
}

export type VideoMetadata = {
  codec: string | null;
  width: number;
  height: number;
  rotationDegrees?: number;
};

function isH264(codec: string | null): boolean {
  if (!codec) return false;
  const normalized = codec.toLowerCase().replace(/[._ -]/g, '');
  return normalized === 'h264' || normalized === 'avc' || normalized.startsWith('avc1');
}

export function displayDimensions(metadata: VideoMetadata): {
  width: number;
  height: number;
} {
  const rotation = Math.abs(metadata.rotationDegrees ?? 0) % 180;
  return rotation === 90
    ? { width: metadata.height, height: metadata.width }
    : { width: metadata.width, height: metadata.height };
}

export function shouldPassthroughVideo(metadata: VideoMetadata): boolean {
  const dimensions = displayDimensions(metadata);
  const longEdge = Math.max(dimensions.width, dimensions.height);
  const shortEdge = Math.min(dimensions.width, dimensions.height);
  return (
    isH264(metadata.codec) &&
    longEdge > 0 &&
    shortEdge > 0 &&
    longEdge <= 1920 &&
    shortEdge <= 1080
  );
}

/** react-native-compressor exposes only one maxSize edge. This value preserves
 * aspect ratio while satisfying both the 1920 long-edge and 1080 short-edge caps. */
export function transcodeMaxSize(width: number, height: number): number {
  const longEdge = Math.max(width, height);
  const shortEdge = Math.min(width, height);
  if (longEdge <= 0 || shortEdge <= 0) return 1080;
  return Math.max(1, Math.round(Math.min(1920, (1080 * longEdge) / shortEdge)));
}

export function videoPartCount(sizeBytes: number): number {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    throw new Error('Video size must be positive');
  }
  return Math.ceil(sizeBytes / VIDEO_PART_SIZE_BYTES);
}
