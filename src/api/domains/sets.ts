import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { authenticatedRequest } from '../session';
import {
  DateTextSchema,
  DecimalStringSchema,
  encodeQuery,
  TimestampSchema,
  UuidSchema,
} from './shared';

function decimalRequestInRange(minimum: number, maximum: number) {
  return DecimalStringSchema.refine((value) => {
    const number = Number(value);
    return Number.isFinite(number) && number >= minimum && number <= maximum;
  }, `Expected a Decimal string from ${minimum} to ${maximum}`);
}

const SetLogFieldsSchema = z.object({
  set_index: z.number().int().min(0),
  /** Decimal request value; sent as a precision-preserving string. */
  weight_kg: decimalRequestInRange(0, 9999.99),
  reps: z.number().int().min(0).max(99),
  /** Decimal request value; sent as a precision-preserving string. */
  rpe: decimalRequestInRange(0, 10).nullish(),
  completed: z.boolean(),
  failed: z.boolean().optional().default(false),
});

export const CoachedSetLogRequestSchema = SetLogFieldsSchema.extend({
  plan_exercise_id: UuidSchema,
  /** Optional DATE-text column; server gym-day fallback applies when absent. */
  logged_date: DateTextSchema.optional(),
}).strict();

export const AdhocSetLogRequestSchema = SetLogFieldsSchema.extend({
  exercise_id: UuidSchema,
  /** Required DATE-text column for ad-hoc logs. */
  logged_date: DateTextSchema,
}).strict();

export const SetLogUpsertRequestSchema = z.union([
  CoachedSetLogRequestSchema,
  AdhocSetLogRequestSchema,
]);

export const SetLogUpsertResponseSchema = z.object({
  id: UuidSchema,
  logged_at: TimestampSchema,
});

export const SetLogSchema = z.object({
  id: UuidSchema,
  student_id: UuidSchema,
  plan_exercise_id: UuidSchema.nullable(),
  exercise_id: UuidSchema,
  set_index: z.number().int(),
  /** Decimal wire value; kept as a string. */
  weight_kg: DecimalStringSchema,
  reps: z.number().int(),
  /** Nullable Decimal wire value; kept as a string when present. */
  rpe: DecimalStringSchema.nullable(),
  completed: z.boolean(),
  failed: z.boolean(),
  assumed: z.boolean(),
  adhoc: z.boolean(),
  /** DATE-text column. */
  logged_date: DateTextSchema,
  logged_at: TimestampSchema,
});

export const SetLogsResponseSchema = z.object({ logs: z.array(SetLogSchema) });

export const SetLogRangeSchema = z
  .object({
    /** DATE-text lower bound. */
    from: DateTextSchema,
    /** DATE-text upper bound. */
    to: DateTextSchema,
    scope: z.enum(['plan', 'all']).optional(),
  })
  .strict();

export type SetLogUpsertRequest = z.input<typeof SetLogUpsertRequestSchema>;
export type SetLogUpsertResponse = z.infer<typeof SetLogUpsertResponseSchema>;
export type SetLog = z.infer<typeof SetLogSchema>;
export type SetLogsResponse = z.infer<typeof SetLogsResponseSchema>;
export type SetLogRange = z.input<typeof SetLogRangeSchema>;

async function upsert(input: SetLogUpsertRequest): Promise<SetLogUpsertResponse> {
  const body = SetLogUpsertRequestSchema.parse(input);
  return authenticatedRequest('/sets/log', {
    method: 'POST',
    body,
    schema: SetLogUpsertResponseSchema,
  });
}

async function range(
  studentId: string,
  input: SetLogRange,
): Promise<SetLogsResponse> {
  const id = UuidSchema.parse(studentId);
  const params = SetLogRangeSchema.parse(input);
  return authenticatedRequest(
    `/students/${id}/sets${encodeQuery(params)}`,
    { schema: SetLogsResponseSchema },
  );
}

export const setsRepository = { range, upsert };

export const setKeys = {
  all: ['set-logs'] as const,
  range: (studentId: string, input: SetLogRange) =>
    [
      'set-logs',
      studentId,
      input.from,
      input.to,
      input.scope ?? 'plan',
    ] as const,
};

export function useSetLogs(
  studentId: string,
  input: SetLogRange,
  enabled = true,
) {
  return useQuery({
    queryKey: setKeys.range(studentId, input),
    queryFn: () => setsRepository.range(studentId, input),
    enabled: enabled && Boolean(studentId),
  });
}

export function useUpsertSetLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setsRepository.upsert,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: setKeys.all }),
  });
}
