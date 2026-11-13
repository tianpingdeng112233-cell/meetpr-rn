import { flushNow, track } from '@/analytics/client';
import { AnalyticsEvent, AnalyticsScreen } from '@/analytics/types';

export type VideoProcessingStage = 'picker' | 'trim_copy' | 'trim_info' | 'trim_thumbnails' | 'trim_preview' | 'trim_export'
  | 'retain_source' | 'retain_export' | 'source_file' | 'metadata' | 'tracks' | 'duration' | 'compress' | 'export_file';

// compressor 2.0.3's Nitro adapter forwards message-only Errors. Exact known
// library literals can be classified locally; arbitrary text is never copied.
const compressorErrors = new Map([
  ['Dolby Vision profile 5 has no HEVC base layer; cannot transcode', 'DOLBY_VISION_UNSUPPORTED'],
  ['Failed to extract video metadata, please try again', 'METADATA_UNAVAILABLE'],
  ['Compressed video output is invalid', 'INVALID_COMPRESSED_OUTPUT'],
  ['Failed to read the input video dimensions', 'DIMENSIONS_UNAVAILABLE'],
]);

/** A symbolic code only: native messages/stacks may contain private asset URIs. */
function errorCode(error: unknown, depth = 0): string {
  if (!error || typeof error !== 'object') return 'UNKNOWN';
  const detail = error as { code?: unknown; errorCode?: unknown; cause?: unknown; message?: unknown };
  const code = detail.code ?? detail.errorCode;
  if (typeof code === 'number' && Number.isSafeInteger(code)) return String(code);
  if (typeof code === 'string' && /^(?:[A-Z][A-Z0-9_]{0,39}|-?[0-9]{1,10})$/.test(code)) return code;
  // fbjni renders Throwable + stack as Error.message. Match only its exact first
  // line after the fixed Java prefix; the stack and any arbitrary text stay local.
  const firstLine = typeof detail.message === 'string' ? detail.message.split(/\r?\n/, 1)[0] : '';
  const knownMessage = compressorErrors.get(firstLine.replace(/^java\.lang\.Throwable: /, ''));
  if (knownMessage) return knownMessage;
  return detail.cause && depth < 3 ? errorCode(detail.cause, depth + 1) : 'UNKNOWN';
}

/** Reuses the authenticated, persisted queue and its existing consent/retry gates. */
export function reportVideoProcessingFailure(stage: VideoProcessingStage, error: unknown): void {
  const code = `video.${stage}.${errorCode(error)}`;
  console.warn('[VideoProcessing]', code);
  // Enqueue before flushing; network delivery must never delay error UI or cleanup.
  void track(AnalyticsEvent.ClientError, {
    domain: ['trim_copy', 'retain_source', 'retain_export', 'source_file', 'export_file'].includes(stage) ? 'persistence' : 'decode', code, screen: AnalyticsScreen.TodayWorkout,
  }).then(() => flushNow()).catch(() => undefined);
}
