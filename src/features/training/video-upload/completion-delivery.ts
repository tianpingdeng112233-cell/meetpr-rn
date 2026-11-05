import { hasVideoDeliveryFailure } from './delivery-failures';
import type { VideoUploadRecord } from './model';

export function completionVideoSummary(records: readonly VideoUploadRecord[]) {
  const videos = records.filter(record => record.status !== 'none');
  const done = videos.filter(record => record.status === 'uploaded').length;
  const failed = videos.filter(hasVideoDeliveryFailure).length;
  return { failed, uploading: videos.length - done - failed, done, total: videos.length,
    undelivered: videos.length - done, delivered: done === videos.length };
}

/** Re-read uploads on every wake: a waiting day may gain or replace videos. */
export function dayCompletionVideos(studentId: string, dayId: string,
  context: import('../set-sync/completion').VideoCompletionContext,
  records: Readonly<Record<string, VideoUploadRecord>>,
  writes: readonly { stableSetId: string; dayId: string; remove: boolean; log: { id: string } }[] = [],
) {
  const latestWrites = [...new Map(writes.map(write => [write.stableSetId, write])).values()];
  const sets = [...context.sets, ...latestWrites.filter(write => write.dayId === dayId && !write.remove)
    .map(write => ({ stableSetId: write.stableSetId, setLogId: write.log.id }))];
  const removed = new Set(latestWrites.filter(write => write.dayId === dayId && write.remove).map(write => write.stableSetId));
  return Object.entries(records).flatMap(([key, upload]) => {
    if (!key.startsWith(`${studentId}:`) || upload.status === 'none') return [];
    const stableSetId = key.slice(studentId.length + 1);
    if (removed.has(stableSetId)) return [];
    const request = upload.logRequest;
    const belongs = sets.some(set => set.stableSetId === stableSetId || (set.setLogId && set.setLogId === upload.setLogId)) ||
      (request && ('plan_day_id' in request && request.plan_day_id === dayId ||
        'plan_exercise_id' in request && context.exerciseIds.includes(request.plan_exercise_id)));
    return belongs ? [{ stableSetId, upload }] : [];
  });
}
