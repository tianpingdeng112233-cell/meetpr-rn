/** Presentation boundary; wire DTOs remain unchanged. */
export type FeedbackVideoMarker = {
  id: string;
  timeMs: number;
  note: string;
  annotationURL?: string | null;
};

/** Reserved for W3-b. W3-a does not render a badge or an export action. */
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
