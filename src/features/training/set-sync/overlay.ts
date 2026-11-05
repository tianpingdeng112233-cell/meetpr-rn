import type { SetLog } from '@/api/domains/sets';
import type { PendingSet, SetSyncSnapshot } from './queue';

export function sameSet(log: SetLog, entry: PendingSet) {
  const target = entry.log;
  return log.id === target.id || (log.student_id === target.student_id && log.set_index === target.set_index &&
    (target.plan_exercise_id ? log.plan_exercise_id === target.plan_exercise_id :
      log.adhoc && log.exercise_id === target.exercise_id && log.logged_date === target.logged_date));
}

/** Receipts bridge the gap between an acknowledged write and a stale GET/cache. */
export function overlaySetLogs(server: readonly SetLog[], snapshot: SetSyncSnapshot): SetLog[] {
  let logs = [...server];
  for (const entry of Object.values(snapshot.confirmed)) {
    const newer = logs.some(log => sameSet(log, entry) && Date.parse(log.logged_at) > Date.parse(entry.log.logged_at));
    if (newer) continue;
    logs = logs.filter(log => !sameSet(log, entry));
    if (!entry.remove) logs.push(entry.log);
  }
  for (const entry of snapshot.pending) {
    logs = logs.filter(log => !sameSet(log, entry));
    if (!entry.remove) logs.push(entry.log);
  }
  return logs;
}
