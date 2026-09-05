import type { VideoBadgeInfo } from './types';

export type VideoBadgePresentation = {
  exerciseName: string | null;
  coachName: string | null;
  weightText: string | null;
  rpeText: string | null;
  reps: number | null;
  setOrdinal: number | null;
  hasLoad: boolean;
};

const numberFormat = new Intl.NumberFormat('en-US', { useGrouping: false, maximumFractionDigits: 1 });
function numberText(value: number | null | undefined): string | null {
  return value != null && Number.isFinite(value) ? numberFormat.format(value) : null;
}

export function presentBadge(info: VideoBadgeInfo): VideoBadgePresentation {
  const weightText = numberText(info.weightKg);
  return {
    weightText,
    rpeText: numberText(info.rpe),
    reps: info.reps ?? null,
    setOrdinal: info.setOrdinal ?? null,
    hasLoad: weightText !== null || info.reps != null,
    exerciseName: info.exerciseName?.trim() || null,
    coachName: info.coachName?.trim() || null,
  };
}
