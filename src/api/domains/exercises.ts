import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { authenticatedRequest } from '../session';
import { TimestampSchema, UuidSchema } from './shared';

/**
 * Exercise catalog (`GET /exercises`, ~1.2k rows, changes rarely). Shape
 * curl-verified against staging on 2026-07-19; snake_case wire, explicit
 * nulls on optional columns.
 */
export const ExerciseSchema = z.object({
  id: UuidSchema,
  name: z.string(),
  name_en: z.string().nullable(),
  exercise_type: z.string(),
  main_lift_family: z.enum(['squat', 'bench', 'deadlift']).nullable(),
  is_competition_lift: z.boolean(),
  competition_stance: z
    .enum(['low_bar', 'high_bar', 'conventional', 'sumo'])
    .nullable(),
  muscle_groups: z.array(z.string()).nullable(),
  equipment: z.array(z.string()).nullable(),
  movement_pattern: z.string().nullable(),
  created_by_coach_id: UuidSchema.nullable(),
  created_at: TimestampSchema,
});

export const ExercisesResponseSchema = z.object({
  exercises: z.array(ExerciseSchema),
});

export type Exercise = z.infer<typeof ExerciseSchema>;

export const exercisesRepository = {
  list: () =>
    authenticatedRequest('/exercises', { schema: ExercisesResponseSchema }),
};

export const exerciseKeys = {
  all: ['exercises'] as const,
};

/** The catalog is effectively static per session — cache it hard. */
export function useExerciseCatalog(enabled = true) {
  return useQuery({
    queryKey: exerciseKeys.all,
    queryFn: () => exercisesRepository.list(),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    enabled,
  });
}

/** id → exercise lookup for name/family resolution on plan/set views. */
export function buildExerciseIndex(
  exercises: readonly Exercise[],
): Map<string, Exercise> {
  return new Map(exercises.map((exercise) => [exercise.id, exercise]));
}
