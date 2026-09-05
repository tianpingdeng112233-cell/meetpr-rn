import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { authenticatedRequest } from '../session';
import {
  DateTextSchema,
  DecimalStringSchema,
  isApiErrorCode,
  TimestampSchema,
  UuidSchema,
} from './shared';

export const PlanSummarySchema = z.object({
  id: UuidSchema,
  coach_id: UuidSchema.nullable(),
  trainee_id: UuidSchema,
  name: z.string(),
  /** DATE-text column. */
  start_date: DateTextSchema,
  /** DATE-text column. */
  end_date: DateTextSchema,
  plan_weeks: z.number().int(),
  source: z.enum(['coach', 'template', 'algorithm']),
  source_template_id: UuidSchema.nullable(),
  status: z.enum(['draft', 'published', 'completed', 'paused']),
  kind: z.enum(['regular', 'adaptation']),
  published_at: TimestampSchema.nullable().optional(),
  anchor_weekday: z.number().int().min(1).max(7).nullable().optional(),
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
  total_shift_days: z.number().int(),
  latest_shift_created_at: TimestampSchema.nullable(),
});

export const PlanSetSchema = z.object({
  id: UuidSchema,
  plan_exercise_id: UuidSchema,
  set_number: z.number().int(),
  target_reps: z.number().int(),
  target_reps_max: z.number().int().nullable(),
  load_mode: z
    .enum(['pct', 'rpe', 'rir', 'weight_range', 'rpe_range', 'fixed_weight'])
    .nullable()
    .optional(),
  // Backend 0063 uses one_rm; normalize only in the domain decoder.
  pct_anchor: z
    .enum(['one_rm', 'registered_1rm', 'e1rm', 'top_set'])
    .nullable()
    .optional(),
  target_pct: DecimalStringSchema.nullable().optional(),
  target_rpe: DecimalStringSchema.nullable().optional(),
  rir_target: z.number().int().nullable().optional(),
  rpe_low: DecimalStringSchema.nullable().optional(),
  rpe_high: DecimalStringSchema.nullable().optional(),
  weight_low: DecimalStringSchema.nullable().optional(),
  weight_high: DecimalStringSchema.nullable().optional(),
  target_weight: DecimalStringSchema.nullable().optional(),
  intensity_mode: z.enum(['weight', 'rpe']),
  /** Decimal wire value; kept as a string. */
  target_value: DecimalStringSchema,
  set_type: z.enum(['warmup', 'working', 'failed', 'amrap', 'backoff']),
  rest_seconds: z.number().int().nullable(),
  coach_note: z.string().nullable(),
  created_at: TimestampSchema,
});

export const PlanExerciseSchema = z.object({
  id: UuidSchema,
  plan_day_id: UuidSchema,
  exercise_id: UuidSchema,
  is_main_lift: z.boolean(),
  sort_order: z.number().int(),
  notes: z.string().nullable(),
  sets: z.array(PlanSetSchema),
});

export const PlanDaySchema = z.object({
  id: UuidSchema,
  plan_id: UuidSchema,
  day_of_week: z.number().int().min(1).max(7),
  week_number: z.number().int(),
  sort_order: z.number().int(),
  /** Nullable DATE-text column. */
  shifted_to_date: DateTextSchema.nullable(),
  completed_at: TimestampSchema.nullable().optional(),
  completion_source: z
    .enum(['manual', 'auto', 'backfill'])
    .nullable()
    .optional(),
  exercises: z.array(PlanExerciseSchema),
});

export const PlanDetailSchema = PlanSummarySchema.extend({
  days: z.array(PlanDaySchema),
});

export const PlansResponseSchema = z.object({
  plans: z.array(PlanSummarySchema),
});

export const DayCompletionSchema = z.object({
  id: UuidSchema,
  plan_day_id: UuidSchema,
  student_id: UuidSchema,
  source: z.enum(['manual', 'auto', 'backfill']),
  completed_at: TimestampSchema,
});

export type PlanSummary = z.infer<typeof PlanSummarySchema>;
export type PlanSet = z.infer<typeof PlanSetSchema>;
export type PlanExercise = z.infer<typeof PlanExerciseSchema>;
export type PlanDay = z.infer<typeof PlanDaySchema>;
export type PlanDetail = z.infer<typeof PlanDetailSchema>;
export type PlansResponse = z.infer<typeof PlansResponseSchema>;
export type DayCompletion = z.infer<typeof DayCompletionSchema>;

async function list(studentId: string): Promise<PlansResponse> {
  const id = UuidSchema.parse(studentId);
  return authenticatedRequest(`/students/${id}/plans`, {
    schema: PlansResponseSchema,
  });
}

async function detail(planId: string): Promise<PlanDetail> {
  const id = UuidSchema.parse(planId);
  return authenticatedRequest(`/plans/${id}`, { schema: PlanDetailSchema });
}

async function completeDay(dayId: string): Promise<DayCompletion> {
  const id = UuidSchema.parse(dayId);
  return authenticatedRequest(`/plans/days/${id}/complete`, {
    method: 'POST',
    schema: DayCompletionSchema,
  });
}

async function undoDayCompletion(dayId: string): Promise<void> {
  const id = UuidSchema.parse(dayId);
  try {
    await authenticatedRequest(`/plans/days/${id}/complete`, {
      method: 'DELETE',
    });
  } catch (error) {
    if (!isApiErrorCode(error, ['NO_COMPLETION_TO_UNDO'])) throw error;
  }
}

export const plansRepository = { detail, list, completeDay, undoDayCompletion };

export const planKeys = {
  all: ['plans'] as const,
  detail: (planId: string) => ['plans', 'detail', planId] as const,
  list: (studentId: string) => ['plans', 'student', studentId] as const,
};

export function usePlans(studentId: string) {
  return useQuery({
    queryKey: planKeys.list(studentId),
    queryFn: () => plansRepository.list(studentId),
    enabled: Boolean(studentId),
  });
}

export function usePlan(planId: string) {
  return useQuery({
    queryKey: planKeys.detail(planId),
    queryFn: () => plansRepository.detail(planId),
    enabled: Boolean(planId),
  });
}

/** Both tabs share this cache; rollback preserves the last acknowledged cursor. */
export function useDayCompletion(planId: string, undo = false) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dayId: string) =>
      undo
        ? (await plansRepository.undoDayCompletion(dayId), null)
        : plansRepository.completeDay(dayId),
    onMutate: async (dayId) => {
      await queryClient.cancelQueries({ queryKey: planKeys.detail(planId) });
      const previous = queryClient.getQueryData<PlanDetail>(
        planKeys.detail(planId),
      );
      queryClient.setQueryData<PlanDetail>(
        planKeys.detail(planId),
        (plan) =>
          plan && {
            ...plan,
            days: plan.days.map((day) =>
              day.id === dayId
                ? {
                    ...day,
                    completed_at: undo ? null : new Date().toISOString(),
                    completion_source: undo ? null : 'manual',
                  }
                : day,
            ),
          },
      );
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous)
        queryClient.setQueryData(planKeys.detail(planId), context.previous);
    },
    onSuccess: (completion, dayId) => {
      queryClient.setQueryData<PlanDetail>(
        planKeys.detail(planId),
        (plan) =>
          plan && {
            ...plan,
            days: plan.days.map((day) =>
              day.id === dayId
                ? {
                    ...day,
                    completed_at: completion?.completed_at ?? null,
                    completion_source: completion?.source ?? null,
                  }
                : day,
            ),
          },
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: planKeys.all }),
  });
}
