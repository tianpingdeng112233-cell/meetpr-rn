import type { CoachExerciseStats } from '@/api/domains/coach';

export const coachLiftFamilies = ['squat', 'bench', 'deadlift'] as const;
export function trendArrow(trend: string): string | null {
  return ({ up: '↑', flat: '→', down: '↓' } as Record<string, string>)[trend] ?? null;
}
export function formatE1RM(value: number | null, locale: string): string {
  return value == null ? '—' : new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
}
export function e1rmTotals(stats: CoachExerciseStats) {
  const values = coachLiftFamilies.flatMap((family) => stats.e1rm?.[family] == null ? [] : [Number(stats.e1rm[family].value)]);
  const latestTotal = values.length ? values.reduce((total, value) => total + value, 0) : null;
  const oneRMTotal = coachLiftFamilies.reduce((total, family) => total + Number(stats.one_rm[family] ?? 0), 0);
  return { latestTotal, oneRMTotal, progress: oneRMTotal === 0 || latestTotal == null ? 0 : Math.min(1, Math.max(0, latestTotal / oneRMTotal)) };
}
