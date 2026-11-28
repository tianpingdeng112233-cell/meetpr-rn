import { setsRepository } from '@/api/domains/sets';
import { addDays } from '@/features/training/policy';
import type { StudentVideo } from '@/api/domains/videos';
import type { FeedbackVideo } from '@/api/domains/feedback';
import type { VideoBadgeInfo } from '@/features/video-player/types';
import { exerciseDisplayName, t } from '@/i18n';

export type FeedbackVideoAssociation = { kind: 'available'; video: FeedbackVideo } | { kind: 'unavailable' } | { kind: 'none' };
export function feedbackVideoAssociation(videoId: string | null | undefined, videos: readonly StudentVideo[], embedded?: FeedbackVideo | null): FeedbackVideoAssociation {
  const video = embedded === undefined ? videos.find(item => item.id === videoId) : embedded;
  if (video && videoId && video.id !== videoId) return { kind: 'unavailable' };
  if (video) return { kind: 'available', video };
  return { kind: videoId ? 'unavailable' : 'none' };
}
export function feedbackVideoName(video: Pick<FeedbackVideo, 'exercise_name' | 'exercise_name_en'>): string | null {
  return exerciseDisplayName({ name: video.exercise_name?.trim() ?? '', name_en: video.exercise_name_en?.trim() || null }) || null;
}
export function feedbackVideoSummary(video: FeedbackVideo): string {
  const weight = video.weight_kg === null ? null : video.weight_kg.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  const load = weight !== null && video.reps !== null ? t('student.feedbackVideoPresentation.copy002', [weight, video.reps])
    : video.reps !== null ? t('student.feedbackVideoPresentation.copy003', [video.reps])
    : weight !== null ? `${weight}kg` : null;
  return [feedbackVideoName(video), video.set_index !== null ? t('student.feedbackVideoPresentation.copy001', [video.set_index + 1]) : null, load].filter(Boolean).join(' · ');
}

/** Student display boundary: wire decimals become numbers and set indices become ordinals. */
export function feedbackVideoBadge(video: FeedbackVideo | null | undefined): VideoBadgeInfo | undefined {
  if (!video) return undefined;
  const decimal = (value: string | null | undefined): number | null => {
    if (!value?.trim()) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };
  return {
    exerciseName: feedbackVideoName(video),
    weightKg: decimal(video.weight_kg),
    reps: video.reps,
    rpe: decimal(video.rpe),
    setOrdinal: video.set_index !== null ? video.set_index + 1 : null,
    coachName: null,
  };
}

/** Feedback embeds display metadata. Resolve the attachment's actual set log again at export time. */
export async function currentFeedbackExportBadge(studentId: string, video: StudentVideo | undefined,
  day: string | null | undefined, display: FeedbackVideo) {
  const date = day ?? video?.logged_at?.slice(0, 10);
  if (!video?.set_log_id || !date) throw new Error('Set log unavailable');
  // A timestamp fallback can fall on the adjacent local training date.
  const range = day ? { from: date, to: addDays(date, 1) } : { from: addDays(date, -1), to: addDays(date, 2) };
  const { logs } = await setsRepository.range(studentId, { ...range, scope: 'all' });
  const log = logs.find(row => row.id === video.set_log_id);
  if (!log) throw new Error('Set log unavailable');
  return feedbackVideoBadge({ ...display, weight_kg: log.weight_kg, reps: log.reps, rpe: log.rpe, set_index: log.set_index })!;
}
