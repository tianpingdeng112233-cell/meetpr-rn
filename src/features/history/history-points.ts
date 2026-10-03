import type { SetLog } from '@/api/domains';
import {
  isE1RMPointEligible,
  type E1RMHistoryPoint,
  type E1RMHistorySnapshot,
  type E1RMRepository,
  type LiftFamily,
} from '@/domain/e1rm';
import { replayE1RMHistoryPoints } from '@/features/dashboard/model';

/** Repair and backfill in one transaction. Saved estimates and PRs remain authoritative. */
export async function loadGrowthHistory(
  repository: Pick<E1RMRepository, 'historySnapshot' | 'replaceHistoryIfUnchanged'>,
  studentId: string,
  logs: readonly SetLog[],
  families: ReadonlyMap<string, LiftFamily>,
): Promise<E1RMHistoryPoint[]> {
  const canonical = logs.filter(log => log.student_id === studentId);
  let snapshot: E1RMHistorySnapshot;
  try {
    snapshot = await repository.historySnapshot(studentId);
  } catch {
    // Read-only fallback: never backfill over an unreadable store.
    return (['squat', 'bench', 'deadlift'] as const)
      .flatMap(family => replayE1RMHistoryPoints(canonical, families, family));
  }
  const saved = [...snapshot.points];
  const known = new Map(saved.map(point => [point.setLogId, point]));
  const replacements = new Map<string, E1RMHistoryPoint>();
  const realLogIds = new Set(canonical.filter(log => !log.assumed).map(log => log.id));
  const migratedFamilies = new Set<LiftFamily>();
  for (const point of saved) {
    if (point.origin !== 'imported' || !realLogIds.has(point.setLogId)) continue;
    replacements.set(point.setLogId, { ...point, origin: 'logged' });
    const family = families.get(point.exerciseId);
    if (family) migratedFamilies.add(family);
  }
  for (const family of ['squat', 'bench', 'deadlift'] as const) {
    const replayed = replayE1RMHistoryPoints(canonical, families, family);
    const first = replayed.find(point => isE1RMPointEligible(point, family));
    const oldFirst = first && known.get(first.setLogId);
    const needsRepair = migratedFamilies.has(family) || (first && oldFirst?.origin === 'logged' && oldFirst.confidence === 'low' &&
      saved.some(point => point.origin === 'imported' && point.confidence === 'normal' &&
        families.get(point.exerciseId) === family && point.computedAt <= first.computedAt &&
        isE1RMPointEligible(point, family)));
    for (const point of replayed) {
      const existing = known.get(point.setLogId);
      if (!existing) {
        replacements.set(point.setLogId, point);
      } else if (needsRepair && (existing.origin !== 'logged' || existing.confidence !== point.confidence)) {
        // Preserve IDs, estimates, provenance and orphaned/unrelated history byte-for-byte.
        replacements.set(point.setLogId, { ...existing, origin: 'logged', confidence: point.confidence });
      }
    }
  }
  if (replacements.size === 0) return saved;
  const updated = saved.map(point => replacements.get(point.setLogId) ?? point);
  updated.push(...[...replacements.values()].filter(point => !known.has(point.setLogId)));
  try {
    if (await repository.replaceHistoryIfUnchanged(studentId, updated, snapshot.revision)) return updated;
    // A live log or import review won the race. Keep it and retry on the next refresh.
    return [...(await repository.historySnapshot(studentId)).points];
  } catch {
    // Like iOS Progress, a failed repair still displays the readable pre-repair snapshot.
    return saved;
  }
}
