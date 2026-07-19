import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { authenticatedRequest } from '../session';
import { DateTextSchema, encodeQuery, TimestampSchema, UuidSchema } from './shared';

export const MuscleFatigueSchema = z.object({
  muscle_group: z.string(),
  severity: z.number().int().min(1).max(3),
});

export const ReadinessSubmitRequestSchema = z
  .object({
    /** DATE-text column. */
    checkin_date: DateTextSchema,
    sleep_quality: z.number().int().min(1).max(5),
    mood: z.number().int().min(1).max(5),
    stress: z.number().int().min(1).max(5),
    muscle_fatigue: z.array(MuscleFatigueSchema),
  })
  .strict()
  .superRefine((value, context) => {
    const groups = new Set<string>();
    value.muscle_fatigue.forEach(({ muscle_group }, index) => {
      if (groups.has(muscle_group)) {
        context.addIssue({
          code: 'custom',
          message: 'muscle_group must be unique',
          path: ['muscle_fatigue', index, 'muscle_group'],
        });
      }
      groups.add(muscle_group);
    });
  });

export const ReadinessCheckinSchema = z.object({
  id: UuidSchema,
  student_id: UuidSchema,
  /** DATE-text column. */
  checkin_date: DateTextSchema,
  sleep_quality: z.number().int().min(1).max(5),
  mood: z.number().int().min(1).max(5),
  stress: z.number().int().min(1).max(5),
  muscle_fatigue: z.array(MuscleFatigueSchema),
  submitted_at: TimestampSchema,
  updated_at: TimestampSchema,
});

export const ReadinessResponseSchema = z.object({
  checkin: ReadinessCheckinSchema.nullable(),
});

export type ReadinessSubmitRequest = z.infer<typeof ReadinessSubmitRequestSchema>;
export type ReadinessCheckin = z.infer<typeof ReadinessCheckinSchema>;
export type ReadinessResponse = z.infer<typeof ReadinessResponseSchema>;

async function submit(
  input: ReadinessSubmitRequest,
): Promise<ReadinessCheckin> {
  const body = ReadinessSubmitRequestSchema.parse(input);
  return authenticatedRequest('/students/me/readiness', {
    method: 'POST',
    body,
    schema: ReadinessCheckinSchema,
  });
}

async function get(studentId: string, date: string): Promise<ReadinessResponse> {
  const id = UuidSchema.parse(studentId);
  const checkinDate = DateTextSchema.parse(date);
  return authenticatedRequest(
    `/students/${id}/readiness${encodeQuery({ date: checkinDate })}`,
    { schema: ReadinessResponseSchema },
  );
}

export const readinessRepository = { get, submit };

export const readinessKeys = {
  all: ['readiness'] as const,
  date: (studentId: string, date: string) =>
    ['readiness', studentId, date] as const,
};

export function useReadiness(studentId: string, date: string) {
  return useQuery({
    queryKey: readinessKeys.date(studentId, date),
    queryFn: () => readinessRepository.get(studentId, date),
    enabled: Boolean(studentId && date),
  });
}

export function useSubmitReadiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: readinessRepository.submit,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: readinessKeys.all }),
  });
}
