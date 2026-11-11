import type { PlanSet } from '@/api/domains/plans';
import type { SetLog } from '@/api/domains/sets';
import { decodePrescription } from './prescription';

type Actuals = Pick<SetLog, 'weight_kg' | 'reps'> & Partial<Pick<SetLog, 'rpe' | 'actual_rir'>>;
export function prescriptionDifferences(log: Actuals, set: PlanSet) {
  const p = decodePrescription(set);
  const weight = log.weight_kg == null ? null : Number(log.weight_kg);
  const effort = p.intensity;
  const weightMatches = effort?.kind === 'weightRange'
    ? weight != null && weight >= effort.low && weight <= effort.high : weight === (p.weightKg ?? null);
  const rpe = log.rpe == null ? null : Number(log.rpe);
  const effortMatches = effort?.kind === 'rpeRange' ? rpe != null && rpe >= effort.low && rpe <= effort.high && log.actual_rir == null
    : effort?.kind === 'rpe' ? rpe === effort.value && log.actual_rir == null
      : effort?.kind === 'rir' ? log.actual_rir === effort.value && rpe == null : rpe == null && log.actual_rir == null;
  return {
    weight: weightMatches ? null : effort?.kind === 'weightRange' ? `${effort.low}–${effort.high}` : String(p.weightKg ?? '—'),
    reps: log.reps >= p.reps && log.reps <= (p.repsMax ?? p.reps) ? null : p.repsMax == null ? String(p.reps) : `${p.reps}–${p.repsMax}`,
    effort: effortMatches ? null : effort?.kind === 'rpeRange' ? `RPE ${effort.low}–${effort.high}` : effort?.kind === 'rpe' ? `RPE ${effort.value}` : effort?.kind === 'rir' ? `RIR ${effort.value}` : '—',
  };
}
export function isAsPrescribed(log: SetLog, set: PlanSet): boolean {
  return !log.failed && Object.values(prescriptionDifferences(log, set)).every(value => value === null);
}
