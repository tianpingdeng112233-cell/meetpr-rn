import { localDateText } from '@/domain/plan/workout-date-policy';
export type PendingVideo = { id: string; studentID: string; studentName: string; planExerciseID: string; setLogID: string | null; exerciseName: string | null; dayDate: string | null; uploadedAt: string; sizeBytes: number };
type Video = { id: string; plan_exercise_id: string | null; set_log_id: string | null; logged_at: string | null; created_at: string; size_bytes: number };
export function pendingVideos({ studentID, studentName, videos, feedback, exerciseNames }: { studentID: string; studentName: string; videos: readonly Video[]; feedback: readonly { video_id?: string | null; plan_exercise_id: string | null }[]; exerciseNames: Record<string, string> }): PendingVideo[] {
  const answered = new Set(feedback.flatMap(item => item.video_id ? [item.video_id] : []));
  const legacy = new Set(feedback.filter(item => !item.video_id).map(item => item.plan_exercise_id));
  return videos.flatMap(video => !video.plan_exercise_id || answered.has(video.id) || legacy.has(video.plan_exercise_id) ? [] : [{
    id: video.id, studentID, studentName, planExerciseID: video.plan_exercise_id, setLogID: video.set_log_id,
    exerciseName: exerciseNames[video.plan_exercise_id] ?? null,
    dayDate: video.logged_at ? localDateText(new Date(video.logged_at)) : null,
    uploadedAt: video.logged_at ?? video.created_at, sizeBytes: video.size_bytes,
  }]).sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
}
export function daySections(items: readonly PendingVideo[]) {
  const groups = new Map<string, PendingVideo[]>();
  for (const item of items) {
    const day = item.dayDate ?? localDateText(new Date(item.uploadedAt));
    groups.set(day, [...(groups.get(day) ?? []), item]);
  }
  return [...groups].sort(([a], [b]) => b.localeCompare(a)).map(([day, items]) => ({ day, items: items.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()) }));
}
export function shouldDismissStudentList(isEmpty: boolean, isDetailPresented: boolean) { return isEmpty && !isDetailPresented; }
export function studentVideoGroups(items: readonly PendingVideo[]) {
  const students = new Map<string, { studentID: string; studentName: string; count: number; latestUploadedAt: string }>();
  for (const item of items) {
    const group = students.get(item.studentID);
    students.set(item.studentID, { studentID: item.studentID, studentName: item.studentName, count: (group?.count ?? 0) + 1, latestUploadedAt: group && new Date(group.latestUploadedAt) > new Date(item.uploadedAt) ? group.latestUploadedAt : item.uploadedAt });
  }
  return [...students.values()];
}
