import { ZodError } from 'zod';
import { ApiError } from '@/api/client';
import type { FeedbackVideoMarker, FeedbackVideoPlaybackItem } from '@/features/video-player/types';

export type VideoMarkerLoadOutcome =
  | { kind: 'loaded'; markers: FeedbackVideoMarker[] }
  | { kind: 'hidden' }
  | { kind: 'failed' };

export function markerLoadError(error: unknown): VideoMarkerLoadOutcome {
  const cancelled = error instanceof Error && error.name === 'AbortError';
  const unavailable = error instanceof ApiError &&
    (error.status === 404 || (error.kind === 'network' &&
      (error.status === undefined || (error.cause instanceof Error && !(error.cause instanceof ZodError)))));
  return { kind: cancelled || unavailable ? 'hidden' : 'failed' };
}
export function markerPanelVisible(markers: readonly FeedbackVideoMarker[] | null, failed: boolean): boolean {
  return failed || Boolean(markers?.length);
}
export function applyMarkersOutcome(
  item: FeedbackVideoPlaybackItem | null,
  videoId: string,
  outcome: VideoMarkerLoadOutcome,
): FeedbackVideoPlaybackItem | null {
  if (item?.id !== videoId) return item;
  return { ...item, markers: outcome.kind === 'loaded' ? outcome.markers : null, markersFailed: outcome.kind === 'failed' };
}
