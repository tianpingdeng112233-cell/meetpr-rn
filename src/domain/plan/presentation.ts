import type { PlanDay } from '@/api/domains/plans';
import type { LiftFamily } from '@/domain/e1rm';
import { getLocale, t } from '@/i18n';
export type DayExerciseInfo = { name: string; rawFamily: LiftFamily | null };
export function dayName(
  day: PlanDay,
  resolve: (id: string) => DayExerciseInfo | null,
  short = false,
): string {
  const families = [
    ...new Set(
      day.exercises
        .filter((e) => e.is_main_lift)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((e) => resolve(e.exercise_id)?.rawFamily)
        .filter((f): f is LiftFamily => Boolean(f)),
    ),
  ];
  if (!families.length) return t('student.trainingCalendarLogic.copy009');
  if (short && families.length === 3)
    return t('student.trainingCalendarLogic.copy010');
  const useShortNames = short || families.length === 3;
  const names = families.map((family) =>
    t(
      family === 'squat'
        ? useShortNames
          ? 'student.dashboardTodayPresentation.copy015'
          : 'student.dashboardTodayPresentation.copy012'
        : family === 'bench'
          ? useShortNames
            ? 'student.dashboardTodayPresentation.copy016'
            : 'student.dashboardTodayPresentation.copy013'
          : useShortNames
            ? 'student.dashboardTodayPresentation.copy017'
            : 'student.dashboardTodayPresentation.copy014',
    ),
  );
  if (families.length === 3) return names.join('·');
  return t('student.progression.dayName', [
    names.join(getLocale() === 'zh' ? '' : ' / '),
  ]);
}
export function daySummary(day: PlanDay): string {
  return t('student.dashboardTodayPresentation.copy003', [
    day.exercises.length,
    day.exercises.reduce((n, e) => n + e.sets.length, 0),
  ]);
}
export function recommendedDateText(date: string): string {
  return new Intl.DateTimeFormat(getLocale(), {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}
