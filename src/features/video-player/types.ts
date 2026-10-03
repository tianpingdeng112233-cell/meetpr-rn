/** Presentation boundary; wire DTOs remain unchanged. */
export type FeedbackVideoMarker = {
  id: string;
  timeMs: number;
  note: string;
  annotationURL?: string | null;
};

/** Display-ready training metadata; setOrdinal is already 1-based. */
export type VideoBadgeInfo = {
  exerciseName?: string | null;
  weightKg?: number | null;
  reps?: number | null;
  rpe?: number | null;
  setOrdinal?: number | null;
  coachName?: string | null;
};

export type FeedbackVideoPlaybackItem = {
  id: string;
  url: string;
  markers: FeedbackVideoMarker[] | null;
  markersFailed: boolean;
};
