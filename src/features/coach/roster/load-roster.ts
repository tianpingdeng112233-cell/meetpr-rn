import type { QueryClient, QueryKey } from '@tanstack/react-query';
import type { CoachStudent } from '@/api/domains/coach';
import { plansRepository, planKeys, type PlanDetail } from '@/api/domains/plans';
import { setsRepository, setKeys, type SetLogRange } from '@/api/domains/sets';
import { feedbackRepository } from '@/api/domains/feedback';
import { recommendedDate, selectCurrentPlan } from '@/domain/plan/sequence';
import { addDays, localDayString, parseDay, startOfDay } from '@/domain/coach/calendar';
import { triageSignals, type CoachPlan } from '@/domain/coach/triage';
import { pairTrainingDays, type RosterRow } from '@/domain/coach/week-overview';

type Readers = { plan(id: string): Promise<PlanDetail | null>; logs: typeof setsRepository.range; feedback: typeof feedbackRepository.list };
export function projectCoachPlan(plan: PlanDetail | null): CoachPlan | null {
  return plan && { days: plan.days.map(day => ({ date: parseDay(day.shifted_to_date ?? recommendedDate(plan, day)), exercises: day.exercises })) };
}
/** Four sliding student slots. Each slot completes before taking the next student. */
export async function loadRosterRows(students: readonly CoachStudent[], now: Date, cache: QueryClient, readers?: Readers, onCached?: (rows: RosterRow[]) => void): Promise<RosterRow[]> {
  const staleStudents = new Set<string>();
  const feedbackThisLoad = new Map<string, Awaited<ReturnType<Readers['feedback']>>>();
  async function read<T>(id: string, key: QueryKey, queryFn: () => Promise<T>, cached: boolean): Promise<T> {
    const snapshot = cache.getQueryData<T>(key);
    if (cached && snapshot !== undefined) { staleStudents.add(id); return snapshot; }
    return cache.fetchQuery({ queryKey: key, queryFn, staleTime: 0, retry: false });
  }
  const cachedReaders = (cached: boolean): Readers => ({
    async plan(id) {
      const { plans } = await read(id, planKeys.list(id), () => plansRepository.list(id), cached);
      const summary = selectCurrentPlan(plans);
      return summary ? read(id, planKeys.detail(summary.id), () => plansRepository.detail(summary.id), cached) : null;
    },
    logs: (id, range) => read(id, setKeys.range(id, range), () => setsRepository.range(id, range), cached),
    feedback: async id => {
      const items = feedbackThisLoad.get(id) ?? await feedbackRepository.list(id);
      feedbackThisLoad.set(id, items);
      return items;
    },
  });
  const source = readers ?? cachedReaders(true);
  const rows: RosterRow[] = new Array(students.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(4, students.length) }, async () => {
    while (next < students.length) {
      const index = next++;
      const student = students[index];
      try {
        const plan = await source.plan(student.id);
        const lookback = localDayString(addDays(startOfDay(now), -7));
        const range: SetLogRange = { from: plan && plan.start_date < lookback ? plan.start_date : lookback, to: localDayString(addDays(startOfDay(now), 1)), scope: 'plan' };
        // Sequential within a slot also caps HTTP fan-out at four requests.
        const { logs } = await source.logs(student.id, range);
        const { items: feedback } = await source.feedback(student.id);
        const projected = projectCoachPlan(plan);
        const latest = Math.max(-Infinity, ...logs.filter(log => log.completed).map(log => new Date(log.logged_at).getTime()));
        rows[index] = { student, triageInput: { plan: projected, logs, feedback }, lastActiveAt: Number.isFinite(latest) ? new Date(latest) : null, triageSignals: triageSignals({ plan: projected, logs, feedback, now }), trainingDays: pairTrainingDays(projected, logs) };
      } catch { rows[index] = { student, lastActiveAt: null, triageSignals: [], trainingDays: [] }; }
    }
  }));
  if (!readers && staleStudents.size) {
    onCached?.(rows);
    // Complete the bounded first pass before revalidation, retaining the four-request ceiling.
    // Feedback is fresh for this load; only plans/logs have reusable query-cache snapshots.
    const fresh = await loadRosterRows(students.filter(student => staleStudents.has(student.id)), now, cache, cachedReaders(false));
    const byId = new Map(fresh.map(row => [row.student.id, row]));
    return rows.map(row => byId.get(row.student.id) ?? row);
  }
  return rows;
}
