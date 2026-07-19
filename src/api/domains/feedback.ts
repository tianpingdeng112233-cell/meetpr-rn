import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { authenticatedRequest } from '../session';
import { DateTextSchema, TimestampSchema, UuidSchema } from './shared';

export const FeedbackItemSchema = z.object({
  id: UuidSchema,
  coach_id: UuidSchema,
  student_id: UuidSchema,
  /** Nullable DATE-text column. */
  day_date: DateTextSchema.nullable(),
  plan_exercise_id: UuidSchema.nullable(),
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

export const feedbackRepository = { list, markRead };

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
