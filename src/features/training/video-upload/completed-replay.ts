import type { FeedbackItem } from '@/api/domains/feedback';
import type { StudentVideo } from '@/api/domains/videos';
import type { VideoUploadRecord } from './model';

export function latestVideoFeedbackId(
  videoId: string | null,
  feedback: readonly Pick<FeedbackItem, 'id' | 'video_id' | 'posted_at'>[],
): string | null {
  if (!videoId) return null;
  return [...feedback].filter(item => item.video_id === videoId)
    .sort((a, b) => Date.parse(b.posted_at) - Date.parse(a.posted_at))[0]?.id ?? null;
}

export type ReplayVideo = { attachmentId: string | null; localUri: string | null };

export function playableSetVideo(
  setLogId: string | null,
  videos: readonly StudentVideo[],
  upload: VideoUploadRecord,
  localFileExists: boolean,
): ReplayVideo | null {
  if (upload.status !== 'none' && upload.status !== 'uploaded') return null;
  const remote = setLogId ? [...videos].filter(video => video.set_log_id === setLogId)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0] : undefined;
  const localUri = localFileExists ? upload.localUri ?? upload.source?.uri ?? null : null;
  if ((upload.attachmentId || localUri) && (!remote || upload.attachmentId === remote.id || upload.createdAt >= Date.parse(remote.created_at))) {
    return { attachmentId: upload.attachmentId, localUri };
  }
  return remote ? { attachmentId: remote.id, localUri: null } : null;
}
