import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { authenticatedRequest } from '../session';
import { DateTextSchema, DecimalStringSchema, TimestampSchema, UuidSchema } from './shared';

/** Metadata embedded by the feedback endpoint; no upload or signed-URL fields. */
export const FeedbackVideoSchema = z.object({
  id: UuidSchema,
  exercise_name: z.string().nullable().default(null),
  exercise_name_en: z.string().nullish(),
  set_index: z.number().int().nullable().default(null),
  weight_kg: DecimalStringSchema.nullable().default(null),
  reps: z.number().int().nullable().default(null),
  rpe: z.string().nullish(),
});
export type FeedbackVideo = z.infer<typeof FeedbackVideoSchema>;

export const FeedbackItemSchema = z.object({
  id: UuidSchema,
  coach_id: UuidSchema,
  student_id: UuidSchema,
  /** Nullable DATE-text column. */
  day_date: DateTextSchema.nullable(),
  plan_exercise_id: UuidSchema.nullable(),
  video_id: UuidSchema.nullish(),
  video: FeedbackVideoSchema.nullish(),
  text: z.string(),
  posted_at: TimestampSchema,
  read_at: TimestampSchema.nullable(),
});

export const FeedbackResponseSchema = z.object({
  items: z.array(FeedbackItemSchema),
});

export type FeedbackItem = z.infer<typeof FeedbackItemSchema>;
export type FeedbackResponse = z.infer<typeof FeedbackResponseSchema>;

async function list(studentId: string): Promise<FeedbackResponse> {
  const id = UuidSchema.parse(studentId);
  return authenticatedRequest(`/students/${id}/feedback`, {
    schema: FeedbackResponseSchema,
  });
}

async function markRead(feedbackId: string): Promise<void> {
  const id = UuidSchema.parse(feedbackId);
  await authenticatedRequest(`/feedback/${id}/read`, { method: 'PATCH' });
}

export const PostFeedbackSchema = z.object({ student_id: UuidSchema, day_date: DateTextSchema.nullable(), plan_exercise_id: UuidSchema, video_id: UuidSchema, text: z.string().trim().min(1) }).strict();
async function post(input: z.infer<typeof PostFeedbackSchema>) {
  return authenticatedRequest('/coach/feedback', { method: 'POST', body: PostFeedbackSchema.parse(input), schema: FeedbackItemSchema });
}
export const feedbackRepository = { list, markRead, post };

export const feedbackKeys = {
  all: ['feedback'] as const,
  list: (studentId: string) => ['feedback', studentId] as const,
};

export function useFeedback(studentId: string) {
  return useQuery({
    queryKey: feedbackKeys.list(studentId),
    queryFn: () => feedbackRepository.list(studentId),
    enabled: Boolean(studentId),
  });
}

export function useMarkFeedbackRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: feedbackRepository.markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: feedbackKeys.all }),
  });
}
