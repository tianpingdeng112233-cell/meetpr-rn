import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { ApiError } from '../client';

import { authenticatedRequest, useSessionStore } from '../session';
import { isDemoMode } from '@/demo/mode';
import { memoryStorage } from '@/demo/memory-storage';
import { selectCurrentPlan as selectLegacyCurrentPlan } from '@/domain/plan/sequence';
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
    .enum(['pct', 'rpe', 'rir', 'weight_range', 'rpe_range', 'fixed_weight', 'free_weight', 'bodyweight'])
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
  intensity_mode: z.enum(['weight', 'rpe']).nullable(),
  /** Decimal wire value; kept as a string. */
  target_value: DecimalStringSchema.nullable(),
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
  actual_completion_date: DateTextSchema.nullable().optional(),
  completion_source: z
    .enum(['manual', 'auto', 'backfill'])
    .nullable()
    .optional(),
  exercises: z.array(PlanExerciseSchema),
});

export const PlanDetailSchema = PlanSummarySchema.extend({
  actual_completion_date_enabled: z.boolean().optional(),
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
  actual_completion_date: DateTextSchema.nullable().optional(),
});

/** Backend 067 summaries omit legacy shift metadata. */
export const PlanHandoffSchema = z.object({
  current_plan_id: UuidSchema.nullable(),
  plans: z.array(PlanSummarySchema.extend({
    total_shift_days: z.number().int().default(0),
    latest_shift_created_at: TimestampSchema.nullable().default(null),
    completed_training_days: z.number().int().nonnegative(),
    total_training_days: z.number().int().nonnegative(),
    handoff_status: z.enum(['current', 'upcoming', 'past']),
  })),
});
export type PlanHandoff = z.infer<typeof PlanHandoffSchema>;
export function currentPlanSummary(handoff: PlanHandoff | undefined | null) {
  return handoff?.plans.find(plan => plan.id === handoff.current_plan_id) ?? null;
}

function handoffStorage(): Pick<typeof import('@react-native-async-storage/async-storage').default, 'getItem' | 'setItem'> {
  // Load native storage only when used, so pure DTO/selector consumers stay platform-independent.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const native = isDemoMode() ? null : require('@react-native-async-storage/async-storage');
  return isDemoMode() ? memoryStorage : native.default ?? native;
}

async function handoff(studentId: string): Promise<PlanHandoff> {
  const id = UuidSchema.parse(studentId);
  const owner = useSessionStore.getState().user?.id ?? id;
  const key = `plans.handoff.v1.${owner}.${id}`;
  try {
    const result = PlanHandoffSchema.parse(await authenticatedRequest(`/students/${id}/plan-handoff`, { schema: PlanHandoffSchema }));
    try { await handoffStorage().setItem(key, JSON.stringify(result)); } catch { /* Cache failure must not hide a fresh server response. */ }
    return result;
  } catch (error) {
    // An explicitly revoked binding is authoritative, not an offline condition.
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) throw error;
    try {
      const raw = await handoffStorage().getItem(key);
      const cached = raw ? PlanHandoffSchema.safeParse(JSON.parse(raw)) : null;
      if (cached?.success && cached.data.plans.every(plan => plan.trainee_id === id)) return cached.data;
    } catch { /* Old/corrupt caches must not prevent the deployment fallback. */ }
    const { plans } = await list(id);
    const current = selectLegacyCurrentPlan(plans);
    return PlanHandoffSchema.parse({ current_plan_id: current?.id ?? null, plans: plans.map(plan => ({
      ...plan, completed_training_days: 0, total_training_days: 0,
      handoff_status: plan.id === current?.id ? 'current' : 'past',
    })) });
  }
}

export type PlanSummary = z.infer<typeof PlanSummarySchema>;
export type PlanSet = z.infer<typeof PlanSetSchema>;
export type PlanExercise = z.infer<typeof PlanExerciseSchema>;
export type PlanDay = z.infer<typeof PlanDaySchema>;
export type PlanDetail = z.infer<typeof PlanDetailSchema>;
export type PlansResponse = z.infer<typeof PlansResponseSchema>;
export type DayCompletion = z.infer<typeof DayCompletionSchema>;

async function list(studentId: string, options?: { includeAll?: boolean }): Promise<PlansResponse> {
  const id = UuidSchema.parse(studentId);
  return authenticatedRequest(`/students/${id}/plans${options?.includeAll ? '?include_all=true' : ''}`, {
    schema: PlansResponseSchema,
  });
}

async function detail(planId: string): Promise<PlanDetail> {
  const id = UuidSchema.parse(planId);
  return authenticatedRequest(`/plans/${id}`, { schema: PlanDetailSchema });
}

async function completeDay(dayId: string, signal?: AbortSignal, actualDate?: string): Promise<DayCompletion> {
  const id = UuidSchema.parse(dayId);
  const completion = await authenticatedRequest(`/plans/days/${id}/complete`, {
    method: 'POST',
    ...(actualDate ? { body: { actual_completion_date: DateTextSchema.parse(actualDate) } } : {}),
    schema: DayCompletionSchema,
    signal,
  });
  return completion;
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

export const plansRepository = { detail, list, handoff, completeDay, undoDayCompletion };

export const planKeys = {
  all: ['plans'] as const,
  detail: (planId: string) => ['plans', 'detail', planId] as const,
  list: (studentId: string, includeAll = false) => ['plans', 'student', studentId, ...(includeAll ? ['all'] : [])] as const,
  handoff: (studentId: string) => ['plans', 'handoff', studentId] as const,
};

export function usePlans(studentId: string, options?: { includeAll?: boolean }) {
  return useQuery({
    queryKey: planKeys.list(studentId, options?.includeAll),
    queryFn: () => plansRepository.list(studentId, options),
    enabled: Boolean(studentId),
  });
}

export function usePlanHandoff(studentId: string) {
  return useQuery({ queryKey: planKeys.handoff(studentId), queryFn: () => plansRepository.handoff(studentId), enabled: Boolean(studentId) });
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
    mutationFn: async (input: string | { dayId: string; actualDate: string }) => {
      const dayId = typeof input === 'string' ? input : input.dayId;
      if (undo) {
        await plansRepository.undoDayCompletion(dayId);
        return null;
      }
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        // Racing also settles locally if the transport ignores cancellation.
        return await Promise.race([
          typeof input === 'string' ? plansRepository.completeDay(dayId, controller.signal) : plansRepository.completeDay(dayId, controller.signal, input.actualDate),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              reject(new Error('Day completion timed out'));
              controller.abort();
            }, 30_000);
          }),
        ]);
      } finally {
        clearTimeout(timer);
      }
    },
    onMutate: async (input) => {
      // Dated completion changes the visible cursor only after the server receipt.
      if (typeof input !== 'string') return;
      const dayId = input;
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
    onSuccess: (completion, input) => {
      // A dated receipt is followed by an authoritative plan read in the completion gate.
      if (typeof input !== 'string') return;
      const dayId = input;
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
                    actual_completion_date: completion?.actual_completion_date ?? null,
                    completion_source: completion?.source ?? null,
                  }
                : day,
            ),
          },
      );
    },
    onSettled: (_, error, input) => {
      if (!error && typeof input !== 'string') return;
      const refresh = queryClient.invalidateQueries({ queryKey: planKeys.all });
      // Completion acknowledgement/rollback must not wait for another request.
      if (undo) return refresh;
      void refresh;
    },
  });
}
