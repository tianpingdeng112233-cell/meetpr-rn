import type { PlanDetail, PlanSet } from '@/api/domains/plans';
import type { SetLog } from '@/api/domains/sets';
import { rtsIntensity, suggestedWeightKg } from '@/domain/e1rm/calculator';
import { E1RM_MATH } from '@/domain/e1rm/constants';
import { resolvePctAnchor, type PercentageAnchor } from '@/domain/e1rm/pct-anchor';
import type { LiftFamily } from '@/domain/e1rm/types';
import { metricDisplay, POUNDS_PER_KG } from '@/domain/measurement';
import { decodePrescription } from './prescription';

export const OUTLOOK_MATH = Object.freeze({ weightExponent: 2, repBonus: 0.03, coachRpePenalty: 0.03, floorOfTop: 0.85, equalRatio: 0.6, epsilon: 1e-9 });
export const OUTLOOK_FAMILIES: readonly LiftFamily[] = ['squat', 'bench', 'deadlift'];
export type OutlookCopy = { approximate: string; skipped: string; unscheduled: string; notTrained: string };
type Load = { kg: number | null; source: 'coach' | 'e1rm' | 'pct' | 'actual' | null };
export type OutlookSet = { kg: number | null; reps: number; minimumReps?: number; rpe: number | null; pct?: number | null; e1rmKg?: number; anchor?: PercentageAnchor };
export type OutlookWeek = { state: 'unscheduled' | 'notTrained' | 'scheduled'; plan?: OutlookSet; actual?: OutlookSet | 'skipped' | null; done?: boolean; dayId?: string; actualDayId?: string; actualPlan?: OutlookSet; resolvedLoad?: Load };
export type OutlookCell = { state: OutlookWeek['state']; week: number; isCurrent: boolean; done?: boolean; skipped?: boolean; short?: boolean; shortReps?: string; main: string; sub: string; ratio?: number; isTop?: boolean; dayId: string | null };
type RowContext = { e1rmKg?: number | null; oneRmKg?: number | null; currentWeekIndex?: number; unit: 'kg' | 'lb'; copy: OutlookCopy; family?: LiftFamily; planEstimateKg?: number | null };

function resolveLoad(set: OutlookSet, ctx: RowContext): Load {
  if (set.kg != null) return { kg: set.kg, source: 'coach' };
  if (set.e1rmKg != null) return { kg: set.e1rmKg, source: 'e1rm' };
  if (set.pct != null) return { kg: resolvePctAnchor({ percentage: set.pct, anchor: set.anchor ?? 'registered_1rm', family: ctx.family ?? 'squat', registeredOneRMKg: ctx.oneRmKg ?? null, currentE1RMKg: ctx.e1rmKg ?? null, exerciseId: '', sortOrder: 0, sameDaySets: [] }).resolvedKg, source: 'pct' };
  const e = ctx.e1rmKg ?? ctx.planEstimateKg;
  return { kg: e && set.rpe != null ? suggestedWeightKg(e, set.reps, set.rpe) : null, source: 'e1rm' };
}
function score(load: Load, set: OutlookSet, fixedRpe: boolean): number | null {
  const intensity = load.kg ?? (set.pct != null ? set.pct / 100 : set.rpe != null ? rtsIntensity(set.reps, set.rpe) : null);
  if (intensity == null) return null;
  return intensity ** OUTLOOK_MATH.weightExponent * (1 + OUTLOOK_MATH.repBonus * set.reps - (fixedRpe && set.rpe != null ? OUTLOOK_MATH.coachRpePenalty * set.rpe : 0));
}
function estimate(sets: readonly OutlookSet[]): number | null {
  const values = sets.flatMap(set => set.kg != null ? [set.kg * (1 + set.reps / E1RM_MATH.epleyRepDivisor)] : []);
  return values.length ? Math.max(...values) : null;
}
export function cycleOutlookRow(weeks: readonly OutlookWeek[], context: RowContext): OutlookCell[] {
  const ctx = { ...context, planEstimateKg: context.planEstimateKg !== undefined ? context.planEstimateKg : estimate(weeks.flatMap(w => w.plan ? [w.plan] : [])) };
  const scored = weeks.map((w, index) => {
    const cell: OutlookCell = { state: w.state, week: index + 1, isCurrent: index === ctx.currentWeekIndex, main: w.state === 'unscheduled' ? ctx.copy.unscheduled : ctx.copy.notTrained, sub: '', dayId: w.state === 'scheduled' ? w.dayId ?? null : null };
    if (!w.plan || w.state !== 'scheduled') return { cell, score: null, hasKg: false };
    const actual = w.done && w.actual && w.actual !== 'skipped' ? w.actual : null;
    const set = actual ?? w.plan;
    const load: Load = actual ? { kg: actual.kg, source: 'actual' } : w.resolvedLoad ?? resolveLoad(set, ctx);
    const fixed = load.source === 'coach' || (load.source === 'actual' && (w.actualPlan ?? w.plan).kg != null);
    cell.done = !!w.done;
    const actualPrescription = w.actualPlan ?? w.plan;
    const requiredReps = actualPrescription.minimumReps ?? actualPrescription.reps;
    cell.short = !!actual && actual.reps < requiredReps;
    cell.shortReps = cell.short ? String(actual!.reps) : undefined;
    cell.dayId = actual ? w.actualDayId ?? cell.dayId : cell.dayId;
    if (w.done && w.actual === 'skipped') {
      cell.skipped = true; cell.main = ctx.copy.skipped;
    } else if (load.kg == null) {
      cell.main = set.pct != null ? `${set.pct}%` : set.rpe != null ? `${set.reps} @${set.rpe}` : '—';
      cell.sub = set.pct != null ? `×${set.reps}` : set.rpe != null ? 'RPE' : '';
    } else {
      const weight = ctx.unit === 'lb' ? metricDisplay(String(load.kg), POUNDS_PER_KG) || '0' : String(load.kg);
      cell.main = `${load.source === 'e1rm' ? ctx.copy.approximate : ''}${weight}`;
      const reps = cell.short ? `${actual!.reps}/${requiredReps}` : `${set.reps}`;
      cell.sub = `×${reps}${set.rpe != null ? ` @${set.rpe}` : ''}`;
    }
    return { cell, score: score(load, set, fixed), hasKg: load.kg != null };
  });
  const valid = scored.filter(c => c.score != null);
  const anyKg = valid.some(c => c.hasKg);
  const compared = valid.filter(c => !anyKg || c.hasKg);
  const values = compared.map(c => c.score!);
  const high = Math.max(...values), minimum = Math.min(...values), low = Math.min(minimum, high * OUTLOOK_MATH.floorOfTop);
  let top: typeof compared[number] | undefined;
  for (const c of compared) if (!c.cell.skipped && (!top || c.score! >= top.score! - OUTLOOK_MATH.epsilon)) top = c;
  for (const c of valid) {
    c.cell.ratio = !compared.includes(c) || high - minimum < OUTLOOK_MATH.epsilon ? OUTLOOK_MATH.equalRatio : (c.score! - low) / (high - low);
    c.cell.isTop = c === top;
  }
  return scored.map(c => c.cell);
}

export type OutlookInput = {
  plan: PlanDetail | null | undefined;
  resolveExercise: (id: string) => { competitionFamily: LiftFamily | null; name: string } | null;
  e1rmByExercise: Readonly<Record<string, number | null>>;
  registeredOneRM: Partial<Record<LiftFamily, number | null>>;
  logs: readonly SetLog[];
  unit: 'kg' | 'lb'; currentWeek: number | null; preview?: boolean; copy: OutlookCopy;
};
export type CycleOutlook = { visible: boolean; name: string; totalWeeks: number; scheduledWeeks: number; rows: { family: LiftFamily; name: string; cells: OutlookCell[] }[] };
function prescription(set: PlanSet): OutlookSet {
  const p = decodePrescription(set), intensity = p.intensity;
  const rangeRPE = set.rpe_high ?? set.target_rpe;
  const fixedRangeRPE = rangeRPE != null && rangeRPE !== '' && Number.isFinite(Number(rangeRPE)) ? Number(rangeRPE) : null;
  return { kg: intensity?.kind === 'weightRange' ? intensity.high : p.weightKg ?? null,
    reps: p.repsMax ?? p.reps, minimumReps: p.reps, rpe: intensity?.kind === 'rpeRange' ? intensity.high : intensity?.kind === 'rpe' ? intensity.value : intensity?.kind === 'rir' ? E1RM_MATH.maximumRPE - intensity.value : intensity?.kind === 'weightRange' ? fixedRangeRPE : null,
    pct: intensity?.kind === 'pct' ? intensity.value : null, anchor: p.percentageAnchor };
}
/** Catalog resolution stays at the existing competition-lift boundary, never the plan's main-lift flag. */
export function cycleOutlook(input: OutlookInput): CycleOutlook {
  const { plan } = input;
  const result: CycleOutlook = { visible: false, name: plan?.name ?? '', totalWeeks: plan?.plan_weeks ?? 0, scheduledWeeks: 0, rows: [] };
  if (!plan || plan.status !== 'published') return result;
  const days = plan.days.filter(d => d.week_number >= 1 && d.week_number <= plan.plan_weeks);
  result.scheduledWeeks = new Set(days.map(d => d.week_number)).size;
  for (const family of OUTLOOK_FAMILIES) {
    const entries = days.flatMap(day => day.exercises.flatMap(exercise => input.resolveExercise(exercise.exercise_id)?.competitionFamily === family
      ? [...exercise.sets].sort((a, b) => a.set_number - b.set_number).map((set, setIndex) => ({ day, exercise, set, setIndex, plan: prescription(set) })).filter(e => e.set.set_type !== 'warmup') : []));
    if (!entries.length) continue;
    const planEstimateKg = estimate(entries.map(e => e.plan));
    const ctx: RowContext = { family, oneRmKg: input.registeredOneRM[family], unit: input.unit, copy: input.copy, currentWeekIndex: input.preview || input.currentWeek == null ? -1 : input.currentWeek - 1, planEstimateKg };
    const contextFor = (exerciseId: string) => ({ ...ctx, e1rmKg: input.e1rmByExercise[exerciseId] });
    const ranked = entries.map(e => { const load = resolveLoad(e.plan, contextFor(e.exercise.exercise_id)); return { ...e, load, score: score(load, e.plan, load.source === 'coach') }; });
    const best = <T extends { score: number | null; load: Load }>(items: T[]): T | undefined => {
      const kg = items.some(e => e.load.kg != null && e.score != null);
      return items.filter(e => !kg || e.load.kg != null).reduce<T | undefined>((winner, e) => !winner || (e.score ?? -Infinity) >= (winner.score ?? -Infinity) ? e : winner, undefined);
    };
    const weeks: OutlookWeek[] = Array.from({ length: plan.plan_weeks }, (_, index) => {
      const candidates = ranked.filter(e => e.day.week_number === index + 1);
      const winner = best(candidates);
      if (!winner) return { state: days.some(d => d.week_number === index + 1) ? 'notTrained' : 'unscheduled' };
      // A row is settled only when all days containing this lift have settled.
      const done = !input.preview && candidates.every(e => Boolean(e.day.completed_at));
      const actuals = done ? input.logs.flatMap(log => {
        const owner = candidates.find(e => e.exercise.id === log.plan_exercise_id);
        if (!owner || !log.completed || log.assumed || log.adhoc || log.is_warmup || log.weight_kg == null) return [];
        const matched = candidates.find(e => e.exercise.id === log.plan_exercise_id && e.setIndex === log.set_index);
        const plannedWarmup = [...owner.exercise.sets].sort((a, b) => a.set_number - b.set_number)[log.set_index]?.set_type === 'warmup';
        if (plannedWarmup) return [];
        const actual: OutlookSet = { kg: Number(log.weight_kg), reps: log.reps, rpe: log.rpe == null ? null : Number(log.rpe) };
        const load: Load = { kg: actual.kg, source: 'actual' };
        const planned = matched?.plan ?? owner.plan;
        return [{ actual, planned, day: owner.day, load, score: score(load, actual, planned.kg != null) }];
      }) : [];
      const actual = best(actuals);
      // Keep resolved load separate: percentage/e1RM weights must never become M2 coach anchors.
      return { state: 'scheduled', plan: winner.plan, resolvedLoad: winner.load, dayId: winner.day.id, done,
        actual: done ? actual?.actual ?? 'skipped' : null, actualDayId: actual?.day.id, actualPlan: actual?.planned };
    });
    result.rows.push({ family, name: input.resolveExercise(entries[0].exercise.exercise_id)!.name, cells: cycleOutlookRow(weeks, ctx) });
  }
  result.visible = result.rows.length > 0;
  return result;
}
