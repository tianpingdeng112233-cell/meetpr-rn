import { File, Paths } from 'expo-file-system';
import { requireNativeModule, uuid } from 'expo-modules-core';
import { deleteLocalVideo } from './native';
import type { TrimmedVideo } from './trim-session';
import { reportVideoProcessingFailure } from './diagnostics';

export type BadgeBitmap = { release(): void };
export type GalleryReservation = { finish(replacement: string | null): Promise<boolean>; release(): void };
type TrimNativeModule = {
  cancelBadge(uri: string, jobId: string): Promise<void>;
  reserveGalleryOriginal(uri: string, timeoutMs: number, jobId: string): Promise<GalleryReservation>;
  burnBadge(uri: string, bitmap: BadgeBitmap, left: number, bottom: number, scale: number, jobId: string): Promise<TrimmedVideo>;
  trimInfo(uri: string): Promise<{ durationMs: number; videoTrackCount: number; displayWidth: number; displayHeight: number }>;
  thumbnails(uri: string, count: number): Promise<string[]>;
  trim(uri: string, startMs: number, endMs: number): Promise<TrimmedVideo>;
  cancelTrim(uri: string): Promise<void>;
  addListener(event: 'onTrimDiagnostic', listener: (event: { uri: string; code: unknown }) => void): { remove(): void };
};

export const trainingVideoTrim = () => requireNativeModule<TrimNativeModule>('TrainingVideo');

const fallbackCodes = new Set([
  'AUDIO_DROPPED_NO_DECODER', 'AUDIO_DROPPED_PROCESSING',
  'HDR_FALLBACK_MEDIACODEC', 'HDR_FALLBACK_INTERPRET_AS_SDR',
]);

/** The URI routes local events only; analytics receives an allowlisted code and nothing else. */
export async function trimAlbumVideo(uri: string, startMs: number, endMs: number): Promise<TrimmedVideo> {
  const native = trainingVideoTrim();
  const subscription = native.addListener('onTrimDiagnostic', event => {
    if (event.uri === uri && typeof event.code === 'string' && fallbackCodes.has(event.code)) {
      reportVideoProcessingFailure('trim_export', { code: event.code });
    }
  });
  try {
    return await native.trim(uri, startMs, endMs);
  } finally {
    subscription.remove();
  }
}

/** Only this new cache file belongs to the trim session; never remove the caller's original. */
export async function copyTrimSource(uri: string): Promise<string> {
  // The compressor owns bare UUID MP4s in this directory and may reclaim them on failure.
  const copy = new File(Paths.cache, `training-trim-${uuid.v4()}.mp4`);
  try {
    await new File(uri).copy(copy);
    if (!copy.exists || copy.size <= 0) throw Object.assign(new Error('Empty trim source'), { code: 'EMPTY_SOURCE' });
    return copy.uri;
  } catch (error) {
    deleteLocalVideo(copy.uri);
    throw error;
  }
}
