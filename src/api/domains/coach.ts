import { z } from 'zod';
import { authenticatedRequest } from '../session';
import { OnboardingProfileSchema } from './onboarding';
import { DateTextSchema, DecimalStringSchema, TimestampSchema, UuidSchema } from './shared';

const StudentSchema = z.object({
  id: UuidSchema.optional(), user_id: UuidSchema.optional(), display_name: z.string().nullish(),
  created_at: TimestampSchema.optional(), status: z.string().nullish(),
  profile: z.object({ user_id: UuidSchema, display_name: z.string(), created_at: TimestampSchema.optional() }).nullish(),
  evaluation: z.object({ expected_end_at: TimestampSchema.nullish() }).nullish(),
}).transform((value, context) => {
  const id = value.id ?? value.profile?.user_id ?? value.user_id;
  const displayName = value.display_name ?? value.profile?.display_name;
  if (!id || displayName == null) { context.addIssue({ code: 'custom', message: 'Student identity missing' }); return z.NEVER; }
  return { id, displayName, status: value.status ?? 'active', evaluationEndAt: value.evaluation?.expected_end_at };
});
const StatsDecimalSchema = DecimalStringSchema.refine((value) => value.trim() !== '' && Number.isFinite(Number(value)), 'Invalid stats decimal');
const E1RMValueSchema = z.object({ value: StatsDecimalSchema });
const E1RMSeriesSchema = z.object({
  points: z.array(z.object({ date: DateTextSchema, value: StatsDecimalSchema })),
  // Unknown server trends are displayable without inventing a direction.
  trend: z.string(),
});
export const CoachExerciseStatsSchema = z.object({
  e1rm: z.object({ squat: E1RMValueSchema.nullish(), bench: E1RMValueSchema.nullish(), deadlift: E1RMValueSchema.nullish() }).nullish(),
  e1rm_series: z.object({ squat: E1RMSeriesSchema.nullish(), bench: E1RMSeriesSchema.nullish(), deadlift: E1RMSeriesSchema.nullish() }).nullish(),
  one_rm: z.object({ squat: StatsDecimalSchema.nullish(), bench: StatsDecimalSchema.nullish(), deadlift: StatsDecimalSchema.nullish() }),
});
export type CoachExerciseStats = z.infer<typeof CoachExerciseStatsSchema>;

export const CoachStudentsResponseSchema = z.object({ students: z.array(StudentSchema) });
export const CoachApplicationSchema = z.object({
  id: UuidSchema, student_id: UuidSchema, display_name: z.string(), submitted_at: TimestampSchema,
  expired_at: TimestampSchema, onboarding: OnboardingProfileSchema.partial().nullish(),
}).transform(value => ({ id: value.id, studentId: value.student_id, displayName: value.display_name, submittedAt: new Date(value.submitted_at), expiredAt: new Date(value.expired_at), onboarding: value.onboarding ?? null }));
export const CoachBindQueueSchema = z.object({ bind_requests: z.array(CoachApplicationSchema) });
export const AcceptCoachBindRequestSchema = z.object({ skip_evaluation: z.literal(true) }).strict();
export const RejectCoachBindRequestSchema = z.object({}).strict();
export type CoachStudent = z.infer<typeof StudentSchema>;
export type CoachApplication = z.infer<typeof CoachApplicationSchema>;
export const coachRepository = {
  async students() { return (await authenticatedRequest('/coach/students', { schema: CoachStudentsResponseSchema })).students; },
  async bindQueue() { return (await authenticatedRequest('/coach/bind-requests', { schema: CoachBindQueueSchema })).bind_requests.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime()); },
  async accept(requestId: string): Promise<void> {
    await authenticatedRequest(`/coach/bind-requests/${UuidSchema.parse(requestId)}/accept`, { method: 'POST', body: AcceptCoachBindRequestSchema.parse({ skip_evaluation: true }) });
  },
  exerciseStats: (studentId: string) => authenticatedRequest(`/coach/students/${UuidSchema.parse(studentId)}/exercise-stats`, { schema: CoachExerciseStatsSchema }),
  async reject(requestId: string): Promise<void> {
    await authenticatedRequest(`/coach/bind-requests/${UuidSchema.parse(requestId)}/reject`, { method: 'POST', body: RejectCoachBindRequestSchema.parse({}) });
  },
};
