import type { SetLog } from '@/api/domains';
import { calculateE1RM, type E1RMHistoryPoint } from '@/domain/e1rm';

// De-identified rows copied without changing weights, reps, RPEs or dates from
// iOS 03021ff6 ImportedBaselineTestSupport.swift (38 sets: 5 assumed, 2 high-rep, 31 measured).
const rows: readonly [string, readonly [number, number, number | null][]][] = [
  ['2026-07-10', [[130, 5, null], [130, 5, null], [115, 5, null], [115, 5, null], [130, 5, null]]],
  ['2026-07-20', [[135, 5, 6], [135, 5, 6.5], [135, 5, 6.5], [135, 5, 6.5], [120, 5, 6]]],
  ['2026-07-27', [[140, 5, 6], [140, 5, 6], [125, 5, 6], [125, 5, 6], [140, 5, 6]]],
  ['2026-08-05', [[145, 5, 6], [145, 5, 6], [145, 5, 6], [130, 5, 6], [130, 5, 6]]],
  ['2026-08-16', [[100, 10, 6], [120, 10, 6]]],
  ['2026-08-24', [[145, 5, 7], [145, 5, 6], [145, 5, 7], [145, 5, 6]]],
  ['2026-09-03', [[150, 5, 7], [150, 5, 7], [150, 5, 7], [150, 5, 7]]],
  ['2026-09-15', [[155, 5, 6], [155, 5, 7], [155, 5, 7], [155, 5, 8]]],
  ['2026-09-23', [[160, 5, 7], [160, 5, 7.5], [160, 5, 8], [160, 5, 8]]],
];

export function importedBaselineFixture() {
  const logs: SetLog[] = rows.flatMap(([date, sets]) => sets.map(([weight, reps, rpe], index) => ({
    id: `fixture-${date}-${index}`, student_id: 'fixture-student', exercise_id: 'deadlift',
    plan_exercise_id: 'fixture-plan-exercise', set_index: index, weight_kg: String(weight),
    reps, rpe: rpe === null ? null : String(rpe), coach_rpe: null, completed: true,
    failed: false, assumed: date === '2026-07-10', adhoc: false, logged_date: date,
    logged_at: new Date(new Date(`${date}T12:00:00Z`).getTime() + index * 1000).toISOString(),
  })));
  const oldPoints: E1RMHistoryPoint[] = logs.filter(log => log.reps <= 5).map(log => ({
    id: `point-${log.id}`, studentId: log.student_id, exerciseId: log.exercise_id, setLogId: log.id,
    computedAt: new Date(log.logged_at),
    e1RMKg: calculateE1RM(Number(log.weight_kg), log.reps, log.rpe === null ? null : Number(log.rpe))!,
    sourceWeightKg: Number(log.weight_kg), sourceReps: log.reps,
    sourceRPE: log.rpe === null ? null : Number(log.rpe),
    confidence: log.assumed ? 'normal' : 'low', origin: log.assumed ? 'imported' : 'logged',
  }));
  return {
    logs, oldPoints, studentId: 'fixture-student', now: new Date('2026-09-27T12:00:00Z'),
    families: new Map([['deadlift', 'deadlift' as const]]),
  };
}
