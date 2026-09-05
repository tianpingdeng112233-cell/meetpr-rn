import { z } from 'zod';
import { authenticatedRequest } from '@/api/session';
import { UuidSchema } from '@/api/domains/shared';
import { videosRepository } from '@/api/domains/videos';
import { feedbackRepository } from '@/api/domains/feedback';
import { plansRepository } from '@/api/domains/plans';
import { exercisesRepository } from '@/api/domains/exercises';
import { selectCurrentPlan } from '@/domain/plan/sequence';
import { exerciseDisplayName } from '@/i18n';
import { pendingVideos, type PendingVideo } from '@/domain/coach/pending-videos';
const StudentSchema = z.object({ id: UuidSchema.optional(), user_id: UuidSchema.optional(), display_name: z.string() }).refine(value => Boolean(value.id ?? value.user_id)).transform(value => ({ id: (value.id ?? value.user_id)!, name: value.display_name }));
/** W2-c's narrow roster read; the W2-a/b coach domain remains independently owned. */
export async function fetchPendingVideos(): Promise<PendingVideo[]> {
  const { students } = await authenticatedRequest('/coach/students', { schema: z.object({ students: z.array(StudentSchema) }) });
  const catalog = await exercisesRepository.list().catch(() => ({ exercises: [] }));
  const names = new Map(catalog.exercises.map(exercise => [exercise.id, exerciseDisplayName(exercise)]));
  const result: PendingVideo[][] = new Array(students.length);
  let cursor = 0;
  // At most four student aggregations in flight; any required read failure preserves the old snapshot.
  await Promise.all(Array.from({ length: Math.min(4, students.length) }, async () => {
    for (;;) {
      const index = cursor++;
      const student = students[index];
      if (!student) return;
      const [videos, feedback, exerciseNames] = await Promise.all([
        videosRepository.list(student.id), feedbackRepository.list(student.id),
        (async () => {
          const { plans } = await plansRepository.list(student.id);
          const selected = selectCurrentPlan(plans);
          if (!selected) return {};
          const plan = await plansRepository.detail(selected.id);
          return Object.fromEntries(plan.days.flatMap(day => day.exercises.flatMap(exercise => {
            const name = names.get(exercise.exercise_id);
            return name ? [[exercise.id, name]] : [];
          })));
        })().catch(() => ({})),
      ]);
      result[index] = pendingVideos({ studentID: student.id, studentName: student.name, videos: videos.videos, feedback: feedback.items, exerciseNames });
    }
  }));
  return result.flat().sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
}
