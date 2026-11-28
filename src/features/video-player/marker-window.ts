import type { FeedbackVideoMarker } from './types';

export function markerAtTime(markers: readonly FeedbackVideoMarker[], timeMs: number): FeedbackVideoMarker | null {
  let active: FeedbackVideoMarker | null = null;
  for (const marker of markers) {
    const elapsed = timeMs - marker.timeMs;
    if (elapsed >= 0 && elapsed < 2400 && (!active || marker.timeMs > active.timeMs)) active = marker;
  }
  return active;
}
