import type { VideoUploadRecord } from './model';

/** Delivery is the only successful end state; a retry must not hide a failure. */
export function hasVideoDeliveryFailure(record: VideoUploadRecord): boolean {
  return record.status !== 'none' && record.status !== 'uploaded' &&
    (record.status === 'failed' || record.status === 'waiting' || record.retry !== null || Boolean(record.errorMessage));
}

export function videoDeliveryFailures(rows: readonly { stableSetId: string; exerciseId: string; upload: VideoUploadRecord }[]) {
  const failed = rows.filter(row => hasVideoDeliveryFailure(row.upload));
  const setIds = [...new Set(failed.map(row => row.stableSetId))];
  return { count: setIds.length, setIds, exerciseIds: [...new Set(failed.map(row => row.exerciseId))] };
}
