import { useQuery } from '@tanstack/react-query';
import { OUTLOOK_FAMILIES } from '@/domain/plan/cycle-outlook';
import { buildE1RMSeries } from '@/domain/e1rm';
import type { ExerciseMetadataResolver } from './exercise-metadata';
import { trainingE1RMRepository } from './storage';

/** Mounted only by the opened outlook/table; matches training's local current-e1RM source. */
export function useCurrentE1RM(studentId: string, exerciseIds: readonly string[], resolve: ExerciseMetadataResolver) {
  const families = exerciseIds.map(id => [id, resolve(id)?.competitionFamily ?? null] as const);
  return useQuery({
    queryKey: ['current-lift-estimates', studentId, families],
    queryFn: async () => {
      const histories = await trainingE1RMRepository.fetchHistories(studentId, exerciseIds);
      const byExercise = Object.fromEntries(families.map(([id, family]) => [id, family ? buildE1RMSeries(histories.get(id) ?? [], family).currentKg : null]));
      const byFamily = Object.fromEntries(OUTLOOK_FAMILIES.map(family => [family,
        buildE1RMSeries(families.filter(([, f]) => f === family).flatMap(([id]) => histories.get(id) ?? []), family).currentKg,
      ]));
      return { byExercise, byFamily };
    },
    enabled: Boolean(studentId),
    staleTime: 0,
  });
}
