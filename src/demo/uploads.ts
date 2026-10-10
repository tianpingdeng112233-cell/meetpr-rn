import { UploadInitiateRequestSchema, type Attachment } from '@/api/domains/uploads';
import { CreateVideoMarkerSchema, type VideoMarker } from '@/api/domains/video-markers';
import type { SetLog } from '@/api/domains/sets';
import type { Exercise } from '@/api/domains/exercises';
import { UploadCancelledError, type MultipartOptions } from '@/features/training/video-upload/multipart';

type DemoUpload = { attachment: Attachment; localUri?: string; ready: boolean };
const uploads = new Map<string, DemoUpload>();
let markers: VideoMarker[] = [];
export function demoVideoUrl(id: string): string | null {
  const upload = uploads.get(id);
  return upload?.ready ? upload.localUri ?? null : null;
}
export function resetDemoUploads() { uploads.clear(); markers = []; }

export async function uploadDemoParts(fileUri: string, partUrls: readonly { part_number: number; url: string }[], options: MultipartOptions) {
  const results = [...(options.completedParts ?? [])];
  for (const part of partUrls) {
    if (options.signal.aborted) throw new UploadCancelledError();
    const attachmentId = new URL(part.url).pathname.split('/')[1];
    const upload = uploads.get(attachmentId);
    if (!upload) throw new Error('Unknown demo upload');
    upload.localUri = fileUri;
    if (!results.some(done => done.part_number === part.part_number)) {
      const completed = { part_number: part.part_number, etag: `"demo-${part.part_number}"` };
      await options.onPart?.(completed);
      results.push(completed);
    }
  }
  if (options.signal.aborted) throw new UploadCancelledError();
  options.onProgress(1);
  return results.sort((a, b) => a.part_number - b.part_number);
}

export function demoVideos(logs: readonly SetLog[], exercises: readonly Exercise[]) {
  return [...uploads.values()].filter(upload => upload.ready && upload.attachment.kind === 'set_video').map(({ attachment }) => {
    const log = logs.find(log => log.id === attachment.set_log_id);
    const exercise = exercises.find(exercise => exercise.id === log?.exercise_id);
    return { id: attachment.id, set_log_id: attachment.set_log_id, plan_exercise_id: log?.plan_exercise_id ?? null,
      exercise_name: exercise?.name_en ?? exercise?.name ?? null, set_index: log?.set_index ?? null, weight_kg: log?.weight_kg ?? null,
      reps: log?.reps ?? null, rpe: log?.rpe ?? null, content_type: attachment.content_type, size_bytes: attachment.size_bytes,
      filename: attachment.filename, created_at: attachment.created_at, logged_at: log?.logged_at ?? null };
  });
}

/** Undefined means the method/path is not implemented; the caller emits its normal 404. */
export function uploadRoute(route: string, method: string, body: unknown, studentId: string, coachId: string, nextId: () => string) {
  const now = new Date().toISOString();
  if (route === '/uploads/initiate' && method === 'POST') {
    const input = UploadInitiateRequestSchema.parse(body);
    const id = nextId();
    uploads.set(id, { ready: false, attachment: { ...input, id, owner_id: studentId, oss_key: `demo/${id}`, filename: input.filename ?? null,
      set_log_id: input.set_log_id ?? null, source_plan_id: null, source_coach_id: null, is_unlinked_explicit: false,
      actual_size_bytes: input.size_bytes, status: 'ready', created_at: now, updated_at: now } });
    return { status: 200, payload: { attachment_id: id, upload_id: `demo-${id}`, part_urls: Array.from({ length: input.part_count }, (_, i) => ({ part_number: i + 1, url: `demo://upload/${id}/${i + 1}` })) } };
  }
  const match = route.match(/^\/uploads\/([^/]+)(?:\/(complete|abort|url))?$/);
  if (match) {
    const [, id, action] = match;
    const upload = uploads.get(id);
    if (!upload) return { status: 404, payload: { error: 'ATTACHMENT_NOT_FOUND' } };
    if ((!action && method === 'DELETE') || (action === 'abort' && method === 'POST')) {
      uploads.delete(id); markers = markers.filter(marker => marker.video_id !== id);
      return { status: 200, payload: {} };
    }
    if (action === 'complete' && method === 'POST') {
      if (!upload.localUri) return { status: 409, payload: { error: 'ATTACHMENT_NOT_READY' } };
      upload.ready = true;
      return { status: 200, payload: upload.attachment };
    }
    if (action === 'url' && method === 'GET') return upload.ready && upload.localUri
      ? { status: 200, payload: { url: upload.localUri, expires_in: 900 } }
      : { status: 409, payload: { error: 'ATTACHMENT_NOT_READY' } };
  }
  const markerMatch = route.match(/^\/videos\/([^/]+)\/markers(?:\/([^/]+))?$/);
  if (markerMatch) {
    const [, videoId, markerId] = markerMatch;
    if (!uploads.get(videoId)?.ready) return { status: 404, payload: { error: 'ATTACHMENT_NOT_FOUND' } };
    if (method === 'GET' && !markerId) return { status: 200, payload: { markers: markers.filter(marker => marker.video_id === videoId) } };
    if (method === 'POST' && !markerId) {
      const marker: VideoMarker = { ...CreateVideoMarkerSchema.parse(body), id: nextId(), video_id: videoId, coach_id: coachId, created_at: now };
      markers.push(marker);
      return { status: 200, payload: marker };
    }
    if (method === 'DELETE' && markerId) { markers = markers.filter(marker => marker.video_id !== videoId || marker.id !== markerId); return { status: 200, payload: {} }; }
  }
}
