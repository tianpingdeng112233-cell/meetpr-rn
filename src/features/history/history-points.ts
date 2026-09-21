import type { SetLog } from '@/api/domains';
import type { E1RMHistoryPoint, E1RMRepository, LiftFamily } from '@/domain/e1rm';
import { replayE1RMHistoryPoints } from '@/features/dashboard/model';

/** Backfill absent logs only. A saved point is the authority for its estimate. */
export async function loadGrowthHistory(
  repository: Pick<E1RMRepository, 'fetchHistories' | 'upsertPoint'>,
  studentId: string,
  logs: readonly SetLog[],
  families: ReadonlyMap<string, LiftFamily>,
): Promise<E1RMHistoryPoint[]> {
  const histories = await repository.fetchHistories(studentId, [...families.keys()]);
  const saved = [...histories.values()].flat().filter(point => point.studentId === studentId);
  const known = new Set(saved.map(point => point.setLogId));
  for (const family of ['squat', 'bench', 'deadlift'] as const) {
    for (const point of replayE1RMHistoryPoints(logs.filter(log => log.student_id === studentId), families, family)) {
      if (known.has(point.setLogId)) continue;
      saved.push(await repository.upsertPoint({ ...point, id: `imported-${point.setLogId}`, origin: 'imported' }));
      known.add(point.setLogId);
    }
  }
  return saved;
}
