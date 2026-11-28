import type { VideoBadgeInfo } from './types';

export type VideoBadgeForm = 'playback' | 'export';

export type VideoBadgePresentation = {
  exerciseName: string | null;
  weightText: string | null;
  rpeText: string | null;
  reps: number | null;
  setOrdinal: number | null;
};

const numberFormat = new Intl.NumberFormat('en-US', { useGrouping: false, maximumFractionDigits: 1 });
function numberText(value: number | null | undefined): string | null {
  return value != null && Number.isFinite(value) ? numberFormat.format(value) : null;
}

export function presentBadge(info: VideoBadgeInfo, form: VideoBadgeForm): VideoBadgePresentation | null {
  const weightText = numberText(info.weightKg);
  const rpeText = numberText(info.rpe);
  const reps = Number.isFinite(info.reps) ? info.reps ?? null : null;
  const exerciseName = info.exerciseName?.trim() || null;
  if (exerciseName === null && weightText === null && reps === null && rpeText === null) return null;
  return { exerciseName, weightText, reps, rpeText, setOrdinal: form === 'playback' ? info.setOrdinal ?? null : null };
}
