import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { authenticatedRequest } from '../session';
import { DecimalStringSchema, TimestampSchema, UuidSchema } from './shared';

export const StudentVideoSchema = z.object({
  id: UuidSchema,
  set_log_id: UuidSchema.nullable(),
  plan_exercise_id: UuidSchema.nullable(),
  exercise_name: z.string().nullable(),
  set_index: z.number().int().nullable(),
  /** Optional Decimal wire value; kept as a string. */
  weight_kg: DecimalStringSchema.nullable(),
  reps: z.number().int().nullable(),
  content_type: z.string(),
  size_bytes: z.number().int(),
  filename: z.string().nullable(),
  created_at: TimestampSchema,
  logged_at: TimestampSchema.nullable(),
});

export const StudentVideosResponseSchema = z.object({
  videos: z.array(StudentVideoSchema),
});

export type StudentVideo = z.infer<typeof StudentVideoSchema>;
export type StudentVideosResponse = z.infer<typeof StudentVideosResponseSchema>;

async function list(studentId: string): Promise<StudentVideosResponse> {
  const id = UuidSchema.parse(studentId);
  return authenticatedRequest(`/students/${id}/videos`, {
    schema: StudentVideosResponseSchema,
  });
}

export const videosRepository = { list };

export const videoKeys = {
  all: ['student-videos'] as const,
  list: (studentId: string) => ['student-videos', studentId] as const,
};

export function useStudentVideos(studentId: string) {
  return useQuery({
    queryKey: videoKeys.list(studentId),
    queryFn: () => videosRepository.list(studentId),
    enabled: Boolean(studentId),
  });
}
