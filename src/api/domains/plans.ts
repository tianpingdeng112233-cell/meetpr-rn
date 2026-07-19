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

export const PLAN_SHIFT_CONFLICT_CODES = [
  'PLAN_NOT_ACTIVE',
  'SHIFT_ONLY_TODAY',
  'ALREADY_STARTED',
] as const;
export const PLAN_SHIFT_FORBIDDEN_CODE = 'NOT_PLAN_STUDENT' as const;
export const PLAN_UNDO_SHIFT_CONFLICT_CODES = [
  'NO_ACTIVE_SHIFT',
  'UNDO_WINDOW_PASSED',
  'ALREADY_STARTED',
] as const;

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
  exercises: z.array(PlanExerciseSchema),
});

export const PlanDetailSchema = PlanSummarySchema.extend({
  days: z.array(PlanDaySchema),
});

export const PlansResponseSchema = z.object({
  plans: z.array(PlanSummarySchema),
});

export const ShiftPlanResponseSchema = z.object({
  batch_id: UuidSchema,
  shifted_days: z.array(
    z.object({
      day_id: UuidSchema,
      /** DATE-text column. */
      shifted_to_date: DateTextSchema,
    }),
  ),
  total_offset_days: z.number().int(),
});

export type PlanSummary = z.infer<typeof PlanSummarySchema>;
export type PlanDetail = z.infer<typeof PlanDetailSchema>;
export type PlansResponse = z.infer<typeof PlansResponseSchema>;
export type ShiftPlanResponse = z.infer<typeof ShiftPlanResponseSchema>;

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

async function shift(planId: string): Promise<ShiftPlanResponse> {
  const id = UuidSchema.parse(planId);
  return authenticatedRequest(`/plans/${id}/shift`, {
    method: 'POST',
    schema: ShiftPlanResponseSchema,
  });
}

async function undoShift(planId: string): Promise<void> {
  const id = UuidSchema.parse(planId);
  await authenticatedRequest(`/plans/${id}/shift`, { method: 'DELETE' });
}

export const plansRepository = { detail, list, shift, undoShift };

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

/** Role gate: this mutation is available only to `coached_student`. */
export function useShiftPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: plansRepository.shift,
    onSuccess: async (_, planId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: planKeys.all }),
        queryClient.invalidateQueries({ queryKey: planKeys.detail(planId) }),
      ]);
    },
  });
}

/** Role gate: this mutation is available only to `coached_student`. */
export function useUndoPlanShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: plansRepository.undoShift,
    onSuccess: async (_, planId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: planKeys.all }),
        queryClient.invalidateQueries({ queryKey: planKeys.detail(planId) }),
      ]);
    },
  });
}

export function isPlanShiftConflict(error: unknown) {
  return isApiErrorCode(error, PLAN_SHIFT_CONFLICT_CODES);
}

export function isPlanUndoShiftConflict(error: unknown) {
  return isApiErrorCode(error, PLAN_UNDO_SHIFT_CONFLICT_CODES);
}
