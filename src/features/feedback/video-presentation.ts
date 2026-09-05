import type { StudentVideo } from '@/api/domains/videos';
import { t } from '@/i18n';

export type FeedbackVideoAssociation = { kind: 'available'; video: StudentVideo } | { kind: 'unavailable' } | { kind: 'none' };
export function feedbackVideoAssociation(videoId: string | null | undefined, videos: readonly StudentVideo[]): FeedbackVideoAssociation {
  const video = videos.find(item => item.id === videoId);
  if (video) return { kind: 'available', video };
  return { kind: videoId ? 'unavailable' : 'none' };
}
export function feedbackVideoSummary(video: StudentVideo): string {
  const weight = video.weight_kg === null ? null : video.weight_kg.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  const load = weight !== null && video.reps !== null ? t('student.feedbackVideoPresentation.copy002', [weight, video.reps])
    : video.reps !== null ? t('student.feedbackVideoPresentation.copy003', [video.reps])
    : weight !== null ? `${weight}kg` : null;
  return [video.exercise_name?.trim(), video.set_index !== null ? t('student.feedbackVideoPresentation.copy001', [video.set_index + 1]) : null, load].filter(Boolean).join(' · ');
}
