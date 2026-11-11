import { emptyEffortKind, type EffortKind } from './actual-effort';
import type { PlanSet } from '@/api/domains/plans';
import type { SetLog } from '@/api/domains/sets';
import { decodePrescription, intensityText } from '@/domain/plan/prescription';
import { metricDisplay, POUNDS_PER_KG } from '@/domain/measurement';
import { prescriptionDifferences } from '@/domain/plan/prescription-result';

type SummaryPart = { text: string; changed: boolean };
export type ExerciseSummarySegment = {
  setsReps: string; load: string; effort: string; repsChanged: boolean; short: boolean;
  loadChanged: boolean; effortChanged: boolean; intensityOnly: boolean; loadParts: SummaryPart[];
};
export type ExerciseSummaryActual = Pick<SetLog, 'set_index' | 'weight_kg' | 'reps'> & Partial<Pick<SetLog, 'rpe' | 'actual_rir'>>;
export type ExerciseSummaryOptions = {
  unit?: 'kg' | 'lb';
  effortKinds?: Readonly<Record<number, EffortKind>>;
  labels?: { bodyweight: string; freeWeight: string; topSet: string; unrecorded: string };
};
type Suggestion = { plan_set_id: string; weight_kg: string };

function compress(values: string[], changed: boolean[]): SummaryPart[] {
  const runs: { text: string; count: number; changed: boolean }[] = [];
  values.forEach((text, index) => {
    const last = runs.at(-1);
    if (last?.text === text) { last.count++; last.changed ||= changed[index]; }
    else runs.push({ text, count: 1, changed: changed[index] });
  });
  return runs.flatMap((run, index) => [
    ...(index ? [{ text: ' / ', changed: false }] : []),
    { text: `${run.text}${runs.length > 1 && run.count > 1 ? `×${run.count}` : ''}`, changed: run.changed },
  ]);
}

/** Ordered segments keep different rep prescriptions paired with their own loads. */
export function summarizeExercise(sets: readonly PlanSet[], logs: readonly ExerciseSummaryActual[], suggestions: readonly Suggestion[], options: ExerciseSummaryOptions = {}): ExerciseSummarySegment[] {
  const labels = options.labels ?? { bodyweight: 'Bodyweight', freeWeight: 'Choose', topSet: 'top set', unrecorded: 'Not recorded' };
  const weight = (value: number | string) => options.unit === 'lb' && Number(value) !== 0 ? metricDisplay(String(value), POUNDS_PER_KG) : String(Number(value));
  const ordered = [...sets].sort((a, b) => a.set_number - b.set_number);
  const indices = [...new Set([...ordered.map((_, index) => index), ...logs.map(log => log.set_index)])].sort((a, b) => a - b);
  if (!indices.length) return [{ setsReps: '—', load: labels.unrecorded, effort: `${(options.effortKinds?.[0] ?? 'rpe').toUpperCase()} —`, effortChanged: false, repsChanged: false, short: false, loadChanged: false, intensityOnly: false, loadParts: [{ text: labels.unrecorded, changed: false }] }];
  const groups: { reps: string; loads: string[]; weightChanges: boolean[]; efforts: string[]; effortChanges: boolean[]; intensityOnly: boolean; repsChanged: boolean; short: boolean; loadChanged: boolean }[] = [];
  for (const index of indices) {
    const set = ordered[index];
    const actual = logs.find(log => log.set_index === index);
    const p = set ? decodePrescription(set) : { reps: actual!.reps };
    let reps = `${p.reps}${set?.set_type === 'amrap' ? '+' : p.repsMax == null ? '' : `–${p.repsMax}`}`;
    let effort = p.intensity && ['rpe', 'rpeRange', 'rir'].includes(p.intensity.kind) ? intensityText(p.intensity) : '';
    let load = p.loadMode === 'bodyweight' ? `${labels.bodyweight}${Number(set.target_weight) > 0 ? `+${weight(set.target_weight!)}` : ''}`
      : p.loadMode === 'free_weight' ? labels.freeWeight
      : p.intensity?.kind === 'weightRange' ? `${weight(p.intensity.low)}–${weight(p.intensity.high)}` : p.weightKg == null ? '' : weight(p.weightKg);
    let intensityOnly = !load || p.loadMode === 'free_weight';
    if (p.intensity?.kind === 'pct') {
      const resolved = suggestions.find(suggestion => suggestion.plan_set_id === set?.id)?.weight_kg;
      const percentage = `${p.intensity.value}%`;
      load = resolved != null ? weight(resolved)
        : `${percentage}${p.percentageAnchor === 'top_set' ? ` ${labels.topSet}` : ''}`;
      intensityOnly = resolved == null;
    }
    const differences = actual && set ? prescriptionDifferences(actual, set) : null;
    const short = Boolean(actual && set && actual.reps < p.reps);
    const repsChanged = differences?.reps != null;
    const loadChanged = differences?.weight != null || differences?.effort != null;
    if (actual) {
      reps = short ? `${actual.reps}/${p.reps}` : String(actual.reps);
      load = actual.weight_kg == null ? '—' : weight(actual.weight_kg);
      if (p.loadMode === 'bodyweight' && actual.weight_kg != null) load = `${labels.bodyweight}${Number(actual.weight_kg) > 0 ? `+${weight(actual.weight_kg)}` : ''}`;
      effort = actual.actual_rir != null ? `RIR ${actual.actual_rir}` : actual.rpe == null ? '' : `RPE ${Number(actual.rpe)}`;
      intensityOnly = false;
    }
    if (!effort) effort = `${emptyEffortKind(set, options.effortKinds?.[index]).toUpperCase()} —`;
    const last = groups.at(-1);
    if (last?.reps === reps) { last.loads.push(load || '—'); last.intensityOnly &&= intensityOnly; last.weightChanges.push(differences?.weight != null); last.efforts.push(effort); last.effortChanges.push(differences?.effort != null); last.loadChanged ||= loadChanged; last.repsChanged ||= repsChanged; }
    else groups.push({ reps, loads: [load || '—'], weightChanges: [differences?.weight != null], efforts: [effort], effortChanges: [differences?.effort != null], intensityOnly, repsChanged, short, loadChanged });
  }
  return groups.map(group => {
    const parts = compress(group.loads, group.weightChanges).filter(part => part.text);
    const efforts = group.efforts.map(value => value || '—');
    const uniformEffort = efforts.every(value => value === efforts[0]);
    const prefix = ['RPE ', 'RIR '].find(label => efforts.some(value => value.startsWith(label)) && efforts.every(value => value === '—' || value.startsWith(label)));
    const displayedEffort = uniformEffort ? efforts[0] : prefix
      ? prefix + efforts.map(value => value.replace(prefix, '')).join('/')
      : compress(efforts, group.effortChanges).map(part => part.text).join('');
    if (!parts.length) parts.push({ text: '—', changed: false });
    return { setsReps: `${group.loads.length}×${group.reps}`, load: parts.map(part => part.text).join(''), effort: displayedEffort, loadParts: parts,
      repsChanged: group.repsChanged, short: group.short, loadChanged: group.loadChanged, effortChanged: group.efforts.some(value => !value.endsWith('—')) && group.effortChanges.some(Boolean), intensityOnly: group.intensityOnly };
  });
}
