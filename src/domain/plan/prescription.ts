import type { PlanSet } from '@/api/domains/plans';
import type {
  PctAnchorResolution,
  PercentageAnchor,
} from '@/domain/e1rm/pct-anchor';
import { t } from '@/i18n';
export type Intensity =
  | { kind: 'pct' | 'rpe' | 'rir'; value: number }
  | { kind: 'rpeRange' | 'weightRange'; low: number; high: number };
export type Prescription = {
  weightKg?: number;
  intensity?: Intensity;
  percentageAnchor?: PercentageAnchor;
  loadMode?: NonNullable<PlanSet['load_mode']>;
  reps: number;
  repsMax?: number;
};
const numeric = (
  value: string | number | null | undefined,
): number | undefined =>
  value == null || value === '' || !Number.isFinite(Number(value))
    ? undefined
    : Number(value);
export function decodePrescription(set: PlanSet): Prescription {
  const result: Prescription = {
    reps: set.target_reps,
    repsMax: set.target_reps_max ?? undefined,
  };
  if (set.load_mode == null) {
    const value = numeric(set.target_value);
    if (set.intensity_mode === 'weight') result.weightKg = value;
    else if (value !== undefined && value > 0)
      result.intensity = { kind: 'rpe', value };
    return result;
  }
  result.loadMode = set.load_mode;
  result.weightKg = numeric(set.target_weight);
  if (set.load_mode === 'pct')
    result.percentageAnchor =
      set.pct_anchor === 'e1rm' || set.pct_anchor === 'top_set'
        ? set.pct_anchor
        : 'registered_1rm';
  const single = {
    pct: set.target_pct,
    rpe: set.target_rpe,
    rir: set.rir_target,
  };
  if (
    set.load_mode === 'pct' ||
    set.load_mode === 'rpe' ||
    set.load_mode === 'rir'
  ) {
    const value = numeric(single[set.load_mode]);
    if (value !== undefined) result.intensity = { kind: set.load_mode, value };
  } else if (
    set.load_mode === 'weight_range' ||
    set.load_mode === 'rpe_range'
  ) {
    const low = numeric(
      set.load_mode === 'weight_range' ? set.weight_low : set.rpe_low,
    );
    const high = numeric(
      set.load_mode === 'weight_range' ? set.weight_high : set.rpe_high,
    );
    if (low !== undefined && high !== undefined)
      result.intensity = {
        kind: set.load_mode === 'weight_range' ? 'weightRange' : 'rpeRange',
        low,
        high,
      };
  }
  return result;
}
export function intensityText(intensity?: Intensity, inline = false): string {
  if (!intensity) return '';
  switch (intensity.kind) {
    case 'pct':
      return `${intensity.value}%`;
    case 'rpe':
      return `${inline ? '' : 'RPE '}${intensity.value}`;
    case 'rir':
      return `RIR ${intensity.value}`;
    case 'rpeRange':
      return `${inline ? '' : 'RPE '}${intensity.low}–${intensity.high}`;
    case 'weightRange':
      return `${intensity.low}–${intensity.high}kg`;
  }
}
export function percentageAnchorText(
  p: Prescription,
  resolution?: PctAnchorResolution,
): string {
  if (p.intensity?.kind !== 'pct') return '';
  const source =
    resolution?.source === 'unresolved'
      ? p.percentageAnchor
      : (resolution?.source ?? p.percentageAnchor);
  return t(
    source === 'e1rm'
      ? 'student.todayWorkoutTypes.copy015'
      : source === 'top_set'
        ? 'student.todayWorkoutTypes.copy016'
        : 'student.todayWorkoutTypes.copy014',
    [p.intensity.value],
  );
}
export function prescribed(
  p: Prescription,
  resolution?: PctAnchorResolution,
): string {
  const reps =
    p.repsMax == null
      ? `${p.reps}`
      : `${p.reps}${p.loadMode ? '–' : '-'}${p.repsMax}`;
  if (!p.loadMode && p.weightKg !== undefined)
    return `${p.weightKg}kg x ${reps}`;
  if (p.intensity?.kind === 'weightRange')
    return `${intensityText(p.intensity)} × ${reps}`;
  if (p.intensity?.kind === 'pct' && resolution) {
    const anchor = percentageAnchorText(p, resolution);
    const display =
      resolution.resolvedKg != null
        ? t('student.todayWorkoutTypes.copy017', [
            resolution.resolvedKg,
            anchor,
          ])
        : resolution.reason === 'topSetNotCompleted'
          ? t('student.todayWorkoutTypes.copy018', [anchor])
          : resolution.reason === 'missingRegisteredOneRM'
            ? anchor
            : intensityText(p.intensity);
    return `${display} × ${reps}`;
  }
  if (p.weightKg !== undefined)
    return `${p.weightKg}kg × ${reps}${p.intensity ? ` @${intensityText(p.intensity, true)}` : ''}`;
  return `${p.intensity ? `${intensityText(p.intensity)} ` : ''}× ${reps}`;
}
export function prescriptionRestRPE(set: PlanSet): number | null {
  const intensity = decodePrescription(set).intensity;
  return intensity?.kind === 'rpe'
    ? intensity.value
    : intensity?.kind === 'rpeRange'
      ? intensity.low
      : null;
}
/** A mixed exercise shows only its count, never its first set as the whole prescription. */
export function prescriptionSummary(
  sets: readonly {
    prescription: Prescription;
    resolution?: PctAnchorResolution;
  }[],
): string {
  const count = t(
    sets.length === 1
      ? 'student.todayWorkoutScreen.copy019.one'
      : 'student.todayWorkoutScreen.copy019',
    [sets.length],
  );
  const renderings = new Set(
    sets.map((set) => prescribed(set.prescription, set.resolution)),
  );
  return renderings.size === 1 ? `${[...renderings][0]} · ${count}` : count;
}
